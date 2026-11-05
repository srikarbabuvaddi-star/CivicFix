import mongoose from 'mongoose';
import { Issue } from './issue.model.js';
import { User } from '../users/user.model.js';
import { Department } from '../departments/department.model.js';
import { IssueEvent, recordIssueEvent } from './issueAudit.model.js';
import { validateStatusTransition } from './issueLifecycle.js';
import { dispatchIssueEvent } from '../notifications/notificationDispatcher.js';
import { getNextSequenceValue } from './counter.model.js';
import {
  ISSUE_STATUS,
  ISSUE_PRIORITY,
  ISSUE_VISIBILITY,
  ROLES,
  AUDIT_EVENT_TYPE,
  NOTIFICATION_TYPES
} from '../../config/constants.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError
} from '../../utils/errors.js';

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Public-safe Data Transfer Object mapping
 * Guarantees that sensitive internal notes, reporter identity, and administrative fields are excluded.
 */
function toPublicIssueDTO(issueDoc) {
  const json = issueDoc.toJSON ? issueDoc.toJSON() : issueDoc;
  return {
    id: json.id || json._id?.toString(),
    issueNumber: json.issueNumber,
    title: json.title,
    description: json.description,
    category: json.category,
    location: json.location,
    status: json.status,
    visibility: json.visibility,
    department: json.departmentId?.name ? { name: json.departmentId.name } : null,
    resolutionNotes: json.resolutionNotes || null,
    evidenceNotes: json.evidenceNotes || null,
    resolvedAt: json.resolvedAt || null,
    closedAt: json.closedAt || null,
    reopenedReason: json.reopenedReason || null,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt
  };
}

/**
 * Create a new civic issue report on behalf of the authenticated citizen.
 * Issue number is generated through an atomic counter increment.
 */
export async function createIssue(data, reporterId) {
  const seq = await getNextSequenceValue('issueNumber', 1000);
  const issueNumber = `CF-${seq}`;

  const issue = new Issue({
    issueNumber,
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    location: {
      type: 'Point',
      coordinates: data.location.coordinates,
      address: data.location.address?.trim() || ''
    },
    reporterId: new mongoose.Types.ObjectId(reporterId),
    departmentId: null,
    assigneeId: null,
    status: ISSUE_STATUS.SUBMITTED,
    priority: ISSUE_PRIORITY.NORMAL,
    visibility: data.visibility || ISSUE_VISIBILITY.PUBLIC,
    duplicateOf: null
  });

  const saved = await issue.save();

  await recordIssueEvent({
    issueId: saved._id,
    actorId: saved.reporterId,
    eventType: AUDIT_EVENT_TYPE.CREATED,
    newStatus: ISSUE_STATUS.SUBMITTED,
    reason: 'Initial report submitted by citizen'
  });

  // Notification dispatch
  await dispatchIssueEvent(NOTIFICATION_TYPES.ISSUE_SUBMITTED, {
    issue: saved,
    actor: saved.reporterId
  }).catch((err) => console.warn('Notification dispatch error:', err.message));

  return saved.toJSON();
}

/**
 * Public listing of published, non-withdrawn issues with pagination, filters, and safe search.
 */
export async function getPublicIssues({
  page = 1,
  limit = 10,
  category,
  status,
  timePeriod,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc'
}) {
  const query = {
    visibility: ISSUE_VISIBILITY.PUBLIC,
    status: { $ne: ISSUE_STATUS.WITHDRAWN }
  };

  if (category) {
    query.category = category;
  }

  if (status) {
    query.status = status;
  }

  if (timePeriod && timePeriod !== 'all') {
    const now = Date.now();
    let ms = 0;
    if (timePeriod === '7d') ms = 7 * 24 * 60 * 60 * 1000;
    else if (timePeriod === '30d') ms = 30 * 24 * 60 * 60 * 1000;
    else if (timePeriod === '90d') ms = 90 * 24 * 60 * 60 * 1000;

    if (ms > 0) {
      query.createdAt = { $gte: new Date(now - ms) };
    }
  }

  if (search && search.trim()) {
    const sanitized = escapeRegex(search.trim());
    query.$or = [
      { title: { $regex: sanitized, $options: 'i' } },
      { issueNumber: { $regex: sanitized, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [total, issues] = await Promise.all([
    Issue.countDocuments(query),
    Issue.find(query)
      .populate('departmentId', 'name')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limit)
      .exec()
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    issues: issues.map(toPublicIssueDTO),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

/**
 * Fetch reports submitted by the authenticated citizen.
 * Strictly scoped to reporterId.
 */
export async function getCitizenIssues(
  reporterId,
  {
    page = 1,
    limit = 10,
    category,
    status,
    sortBy = 'updatedAt',
    sortOrder = 'desc'
  }
) {
  const query = {
    reporterId: new mongoose.Types.ObjectId(reporterId)
  };

  if (category) {
    query.category = category;
  }

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [total, issues] = await Promise.all([
    Issue.countDocuments(query),
    Issue.find(query)
      .populate('departmentId', 'name')
      .populate('assigneeId', 'name fullName')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limit)
      .exec()
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    issues: issues.map((doc) => doc.toJSON()),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

/**
 * Retrieve issue by ID with strict role-aware and ownership-aware authorization.
 */
export async function getIssueById(issueId, currentUser = null) {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    throw new BadRequestError('Invalid issue identifier format');
  }

  const issue = await Issue.findById(issueId)
    .populate('departmentId', 'name description categoriesHandled isActive')
    .populate('assigneeId', 'name fullName email')
    .populate('reporterId', 'name fullName email')
    .exec();

  if (!issue) {
    throw new NotFoundError('Issue report not found');
  }

  const reporterIdStr = issue.reporterId?._id
    ? issue.reporterId._id.toString()
    : issue.reporterId?.toString();
  const isReporter = currentUser && reporterIdStr === currentUser.id;
  const isPrivileged = currentUser && [ROLES.STAFF, ROLES.ADMIN].includes(currentUser.role);
  const isPublic = issue.visibility === ISSUE_VISIBILITY.PUBLIC && issue.status !== ISSUE_STATUS.WITHDRAWN;

  // 1. Privileged users (staff, admin) receive the full internal representation
  if (isPrivileged) {
    return issue.toJSON();
  }

  // 2. The citizen who reported the issue receives their full report with edit/action permission flags
  if (isReporter) {
    const payload = issue.toJSON();
    payload.canEdit = issue.status === ISSUE_STATUS.SUBMITTED;
    payload.canWithdraw = [ISSUE_STATUS.SUBMITTED, ISSUE_STATUS.UNDER_REVIEW].includes(issue.status);
    payload.canVerify = issue.status === ISSUE_STATUS.RESOLVED;
    payload.canReopen = issue.status === ISSUE_STATUS.RESOLVED;
    return payload;
  }

  // 3. Public visitors or third-party users viewing public issues receive the safe public DTO
  if (isPublic) {
    return toPublicIssueDTO(issue);
  }

  // 4. Private issue viewed by an unauthorized party
  throw new ForbiddenError('You do not have permission to view this private report');
}

/**
 * Update an existing issue report.
 * Citizens can only update their own reports while status is still 'submitted'.
 */
export async function updateIssue(issueId, updateData, userId) {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    throw new BadRequestError('Invalid issue identifier format');
  }

  const issue = await Issue.findById(issueId).exec();
  if (!issue) {
    throw new NotFoundError('Issue report not found');
  }

  if (issue.reporterId.toString() !== userId) {
    throw new ForbiddenError('You can only edit your own reports');
  }

  if (issue.status !== ISSUE_STATUS.SUBMITTED) {
    throw new BadRequestError(
      `Cannot edit report. Reports cannot be edited after workflow progression beyond submitted status (current status: '${issue.status}')`
    );
  }

  // Strict allowlist assignment
  if (updateData.title !== undefined) {
    issue.title = updateData.title.trim();
  }
  if (updateData.description !== undefined) {
    issue.description = updateData.description.trim();
  }
  if (updateData.category !== undefined) {
    issue.category = updateData.category;
  }
  if (updateData.location !== undefined) {
    issue.location = {
      type: 'Point',
      coordinates: updateData.location.coordinates,
      address: updateData.location.address?.trim() || ''
    };
  }
  if (updateData.visibility !== undefined) {
    issue.visibility = updateData.visibility;
  }

  const saved = await issue.save();
  const payload = saved.toJSON();
  payload.canEdit = true;
  payload.canWithdraw = true;
  return payload;
}

/**
 * Controlled withdrawal of an issue report.
 * Citizens can withdraw their own reports while status is 'submitted' or 'under_review'.
 */
export async function withdrawIssue(issueId, userId) {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    throw new BadRequestError('Invalid issue identifier format');
  }

  const issue = await Issue.findById(issueId).exec();
  if (!issue) {
    throw new NotFoundError('Issue report not found');
  }

  if (issue.reporterId.toString() !== userId) {
    throw new ForbiddenError('You can only withdraw your own reports');
  }

  if (![ISSUE_STATUS.SUBMITTED, ISSUE_STATUS.UNDER_REVIEW].includes(issue.status)) {
    throw new BadRequestError(
      `Cannot withdraw report. Reports cannot be withdrawn after progression beyond review (current status: '${issue.status}')`
    );
  }

  const prevStatus = issue.status;
  issue.status = ISSUE_STATUS.WITHDRAWN;
  const saved = await issue.save();

  await recordIssueEvent({
    issueId: saved._id,
    actorId: new mongoose.Types.ObjectId(userId),
    eventType: AUDIT_EVENT_TYPE.WITHDRAWN,
    previousStatus: prevStatus,
    newStatus: ISSUE_STATUS.WITHDRAWN,
    reason: 'Report withdrawn by citizen'
  });

  const payload = saved.toJSON();
  payload.canEdit = false;
  payload.canWithdraw = false;
  return payload;
}

/**
 * Assign or reassign an issue to a department and staff member.
 * Performed exclusively by Admin.
 */
export async function assignIssue(
  issueId,
  { departmentId, assigneeId, reason = null },
  adminUser,
  isReassignment = false
) {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    throw new BadRequestError('Invalid issue identifier format');
  }
  if (!mongoose.Types.ObjectId.isValid(departmentId)) {
    throw new BadRequestError('Invalid department identifier format');
  }
  if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
    throw new BadRequestError('Invalid staff assignee identifier format');
  }

  const issue = await Issue.findById(issueId).exec();
  if (!issue) {
    throw new NotFoundError('Issue report not found');
  }

  // Prevent assigning terminal issues
  if ([ISSUE_STATUS.CLOSED, ISSUE_STATUS.REJECTED, ISSUE_STATUS.WITHDRAWN].includes(issue.status)) {
    throw new BadRequestError(`Cannot assign an issue in terminal status '${issue.status}'`);
  }

  // Validate target department is active
  const department = await Department.findById(departmentId).exec();
  if (!department) {
    throw new NotFoundError('Target department not found');
  }
  if (!department.isActive) {
    throw new BadRequestError(`Department '${department.name}' is deactivated and cannot receive new assignments`);
  }

  // Validate staff member
  const staff = await User.findById(assigneeId).exec();
  if (!staff) {
    throw new NotFoundError('Target staff member not found');
  }
  if (staff.role !== ROLES.STAFF) {
    throw new BadRequestError('Assignee must have staff role');
  }
  if (staff.status !== 'active') {
    throw new BadRequestError('Cannot assign issue to a suspended or inactive staff member');
  }
  if (!staff.departmentId || staff.departmentId.toString() !== department._id.toString()) {
    throw new BadRequestError(`Staff member '${staff.name || staff.fullName}' does not belong to department '${department.name}'`);
  }

  const prevStatus = issue.status;
  const prevDepartmentId = issue.departmentId;
  const prevAssigneeId = issue.assigneeId;

  // Update issue
  issue.departmentId = department._id;
  issue.assigneeId = staff._id;
  if (issue.status === ISSUE_STATUS.SUBMITTED || issue.status === ISSUE_STATUS.UNDER_REVIEW) {
    issue.status = ISSUE_STATUS.ASSIGNED;
  }

  await issue.save();

  const isReassign = (prevAssigneeId && prevAssigneeId.toString() !== staff._id.toString()) || isReassignment;
  const eventType = isReassign ? AUDIT_EVENT_TYPE.REASSIGNED : AUDIT_EVENT_TYPE.ASSIGNED;

  await recordIssueEvent({
    issueId: issue._id,
    actorId: adminUser._id || adminUser.id,
    eventType,
    previousStatus: prevStatus,
    newStatus: issue.status,
    previousDepartmentId: prevDepartmentId,
    newDepartmentId: department._id,
    previousAssigneeId: prevAssigneeId,
    newAssigneeId: staff._id,
    reason: reason || (isReassign ? 'Staff reassignment' : 'Initial staff assignment'),
    details: {
      departmentName: department.name,
      staffName: staff.name || staff.fullName,
      staffEmail: staff.email
    }
  });

  await dispatchIssueEvent(
    isReassign ? NOTIFICATION_TYPES.ISSUE_REASSIGNED : NOTIFICATION_TYPES.ISSUE_ASSIGNED,
    {
      issue,
      actor: adminUser,
      details: { reason }
    }
  ).catch((err) => console.warn('Notification dispatch error:', err.message));

  return getIssueById(issue._id, adminUser);
}

/**
 * Execute a status transition through the lifecycle state machine.
 */
export async function transitionIssue(issueId, targetStatus, reason = '', user) {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    throw new BadRequestError('Invalid issue identifier format');
  }

  const issue = await Issue.findById(issueId).exec();
  if (!issue) {
    throw new NotFoundError('Issue report not found');
  }

  validateStatusTransition(issue, targetStatus, user, reason);

  const prevStatus = issue.status;
  issue.status = targetStatus;

  if (targetStatus === ISSUE_STATUS.REJECTED) {
    issue.rejectionReason = reason.trim();
  } else if (targetStatus === ISSUE_STATUS.REOPENED) {
    issue.reopenedReason = reason.trim();
  }

  await issue.save();

  let eventType = AUDIT_EVENT_TYPE.STATUS_CHANGED;
  if (targetStatus === ISSUE_STATUS.REJECTED) eventType = AUDIT_EVENT_TYPE.REJECTED;
  else if (targetStatus === ISSUE_STATUS.WITHDRAWN) eventType = AUDIT_EVENT_TYPE.WITHDRAWN;
  else if (targetStatus === ISSUE_STATUS.REOPENED) eventType = AUDIT_EVENT_TYPE.REOPENED;

  await recordIssueEvent({
    issueId: issue._id,
    actorId: user._id || user.id,
    eventType,
    previousStatus: prevStatus,
    newStatus: targetStatus,
    previousDepartmentId: issue.departmentId,
    newDepartmentId: issue.departmentId,
    previousAssigneeId: issue.assigneeId,
    newAssigneeId: issue.assigneeId,
    reason: reason?.trim() || null,
    details: {
      actorRole: user.role
    }
  });

  await dispatchIssueEvent(
    targetStatus === ISSUE_STATUS.REJECTED
      ? NOTIFICATION_TYPES.ISSUE_REJECTED
      : NOTIFICATION_TYPES.STATUS_CHANGED,
    {
      issue,
      actor: user,
      details: { reason }
    }
  ).catch((err) => console.warn('Notification dispatch error:', err.message));

  return getIssueById(issue._id, user);
}

/**
 * Staff or Admin submits resolution notes and closes out the active work.
 */
export async function resolveIssue(issueId, { resolutionNotes, evidenceNotes }, user) {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    throw new BadRequestError('Invalid issue identifier format');
  }

  const issue = await Issue.findById(issueId).exec();
  if (!issue) {
    throw new NotFoundError('Issue report not found');
  }

  // Must be assigned staff or admin
  if (user.role === ROLES.STAFF && (!issue.assigneeId || issue.assigneeId.toString() !== user.id)) {
    throw new ForbiddenError('Only the assigned staff member or an administrator can resolve this issue');
  }
  if (![ROLES.STAFF, ROLES.ADMIN].includes(user.role)) {
    throw new ForbiddenError('Only municipal staff or administrators can mark an issue as resolved');
  }

  validateStatusTransition(issue, ISSUE_STATUS.RESOLVED, user);

  const prevStatus = issue.status;
  issue.status = ISSUE_STATUS.RESOLVED;
  issue.resolutionNotes = resolutionNotes.trim();
  issue.evidenceNotes = evidenceNotes ? evidenceNotes.trim() : null;
  issue.resolvedAt = new Date();

  await issue.save();

  await recordIssueEvent({
    issueId: issue._id,
    actorId: user._id || user.id,
    eventType: AUDIT_EVENT_TYPE.RESOLVED,
    previousStatus: prevStatus,
    newStatus: ISSUE_STATUS.RESOLVED,
    previousDepartmentId: issue.departmentId,
    newDepartmentId: issue.departmentId,
    previousAssigneeId: issue.assigneeId,
    newAssigneeId: issue.assigneeId,
    reason: 'Resolution submitted by staff technician',
    details: {
      resolutionNotes: issue.resolutionNotes,
      evidenceNotes: issue.evidenceNotes
    }
  });

  await dispatchIssueEvent(NOTIFICATION_TYPES.ISSUE_RESOLVED, {
    issue,
    actor: user,
    details: { resolutionNotes: issue.resolutionNotes }
  }).catch((err) => console.warn('Notification dispatch error:', err.message));

  return getIssueById(issue._id, user);
}

/**
 * Citizen reporter or Admin verifies resolution and closes the issue.
 */
export async function verifyAndCloseIssue(issueId, user) {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    throw new BadRequestError('Invalid issue identifier format');
  }

  const issue = await Issue.findById(issueId).exec();
  if (!issue) {
    throw new NotFoundError('Issue report not found');
  }

  if (user.role === ROLES.CITIZEN && issue.reporterId.toString() !== user.id) {
    throw new ForbiddenError('Only the citizen reporter or an administrator can verify and close this issue');
  }
  if (![ROLES.CITIZEN, ROLES.ADMIN].includes(user.role)) {
    throw new ForbiddenError('Only the citizen reporter or an administrator can verify and close this issue');
  }

  validateStatusTransition(issue, ISSUE_STATUS.CLOSED, user);

  const prevStatus = issue.status;
  issue.status = ISSUE_STATUS.CLOSED;
  issue.closedAt = new Date();

  await issue.save();

  await recordIssueEvent({
    issueId: issue._id,
    actorId: user._id || user.id,
    eventType: AUDIT_EVENT_TYPE.VERIFIED_CLOSED,
    previousStatus: prevStatus,
    newStatus: ISSUE_STATUS.CLOSED,
    previousDepartmentId: issue.departmentId,
    newDepartmentId: issue.departmentId,
    previousAssigneeId: issue.assigneeId,
    newAssigneeId: issue.assigneeId,
    reason: 'Resolution verified and closed by citizen reporter',
    details: {
      actorRole: user.role
    }
  });

  await dispatchIssueEvent(NOTIFICATION_TYPES.ISSUE_CLOSED, {
    issue,
    actor: user
  }).catch((err) => console.warn('Notification dispatch error:', err.message));

  return getIssueById(issue._id, user);
}

/**
 * Citizen reporter or Admin reopens an issue from 'resolved' status with a reason.
 */
export async function reopenIssue(issueId, reason, user) {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    throw new BadRequestError('Invalid issue identifier format');
  }

  const issue = await Issue.findById(issueId).exec();
  if (!issue) {
    throw new NotFoundError('Issue report not found');
  }

  if (user.role === ROLES.CITIZEN && issue.reporterId.toString() !== user.id) {
    throw new ForbiddenError('Only the citizen reporter or an administrator can reopen this issue');
  }
  if (![ROLES.CITIZEN, ROLES.ADMIN].includes(user.role)) {
    throw new ForbiddenError('Only the citizen reporter or an administrator can reopen this issue');
  }

  validateStatusTransition(issue, ISSUE_STATUS.REOPENED, user, reason);

  const prevStatus = issue.status;
  issue.status = ISSUE_STATUS.REOPENED;
  issue.reopenedReason = reason.trim();

  await issue.save();

  await recordIssueEvent({
    issueId: issue._id,
    actorId: user._id || user.id,
    eventType: AUDIT_EVENT_TYPE.REOPENED,
    previousStatus: prevStatus,
    newStatus: ISSUE_STATUS.REOPENED,
    previousDepartmentId: issue.departmentId,
    newDepartmentId: issue.departmentId,
    previousAssigneeId: issue.assigneeId,
    newAssigneeId: issue.assigneeId,
    reason: issue.reopenedReason,
    details: {
      actorRole: user.role
    }
  });

  await dispatchIssueEvent(NOTIFICATION_TYPES.ISSUE_REOPENED, {
    issue,
    actor: user,
    details: { reason: issue.reopenedReason }
  }).catch((err) => console.warn('Notification dispatch error:', err.message));

  return getIssueById(issue._id, user);
}

/**
 * Fetch immutable audit event timeline for an issue.
 */
export async function getIssueTimeline(issueId, currentUser = null) {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    throw new BadRequestError('Invalid issue identifier format');
  }

  const issue = await Issue.findById(issueId).exec();
  if (!issue) {
    throw new NotFoundError('Issue report not found');
  }

  const reporterIdStr = issue.reporterId?._id
    ? issue.reporterId._id.toString()
    : issue.reporterId?.toString();
  const isReporter = currentUser && reporterIdStr === currentUser.id;
  const isPrivileged = currentUser && [ROLES.STAFF, ROLES.ADMIN].includes(currentUser.role);
  const isPublic = issue.visibility === ISSUE_VISIBILITY.PUBLIC && issue.status !== ISSUE_STATUS.WITHDRAWN;

  if (!isPrivileged && !isReporter && !isPublic) {
    throw new ForbiddenError('You do not have permission to view the audit timeline for this report');
  }

  const events = await IssueEvent.find({ issueId })
    .sort({ createdAt: 1 })
    .populate('actorId', 'name fullName email role')
    .populate('newDepartmentId', 'name')
    .populate('newAssigneeId', 'name fullName')
    .exec();

  return events.map((ev) => {
    const json = ev.toJSON();
    if (!isPrivileged && !isReporter) {
      if (json.actorId) {
        json.actorId = {
          role: json.actorId.role,
          name: json.actorId.role === ROLES.CITIZEN ? 'Citizen Reporter' : 'Municipal Staff',
          fullName: json.actorId.role === ROLES.CITIZEN ? 'Citizen Reporter' : 'Municipal Staff'
        };
      }
    }
    return json;
  });
}

/**
 * Fetch work queue for an authenticated staff technician.
 */
export async function getStaffIssues(
  staffUserId,
  { page = 1, limit = 10, status, category, sortBy = 'updatedAt', sortOrder = 'desc' }
) {
  const query = {
    assigneeId: new mongoose.Types.ObjectId(staffUserId)
  };

  if (status) query.status = status;
  if (category) query.category = category;

  const skip = (page - 1) * limit;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [total, issues] = await Promise.all([
    Issue.countDocuments(query),
    Issue.find(query)
      .populate('departmentId', 'name')
      .populate('reporterId', 'name fullName email')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limit)
      .exec()
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    issues: issues.map((doc) => doc.toJSON()),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

/**
 * Fetch admin triage queue for unassigned issues or issues awaiting review.
 */
export async function getTriageIssues({
  page = 1,
  limit = 10,
  status,
  category,
  unassignedOnly = false,
  sortBy = 'createdAt',
  sortOrder = 'desc'
}) {
  const query = {};

  if (unassignedOnly) {
    query.$or = [{ assigneeId: null }, { departmentId: null }];
  }

  if (status) query.status = status;
  if (category) query.category = category;

  const skip = (page - 1) * limit;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [total, issues] = await Promise.all([
    Issue.countDocuments(query),
    Issue.find(query)
      .populate('departmentId', 'name')
      .populate('assigneeId', 'name fullName email')
      .populate('reporterId', 'name fullName email')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limit)
      .exec()
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    issues: issues.map((doc) => doc.toJSON()),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

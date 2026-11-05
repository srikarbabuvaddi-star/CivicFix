import mongoose from 'mongoose';
import { Feedback } from './feedback.model.js';
import { Issue } from '../issues/issue.model.js';
import { recordIssueEvent } from '../issues/issueAudit.model.js';
import { dispatchIssueEvent } from '../notifications/notificationDispatcher.js';
import {
  ISSUE_STATUS,
  ROLES,
  AUDIT_EVENT_TYPE,
  NOTIFICATION_TYPES
} from '../../config/constants.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError
} from '../../utils/errors.js';

/**
 * Submit or update citizen feedback for a resolved or closed report
 */
export async function submitFeedback(
  issueId,
  { rating, comment = '', resolutionQuality },
  citizenUser
) {
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

  // Only the original citizen reporter can submit feedback
  if (reporterIdStr !== citizenUser.id) {
    throw new ForbiddenError('Only the original citizen reporter can submit feedback for this report');
  }

  // Permitted only when issue is resolved or closed
  if (![ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED].includes(issue.status)) {
    throw new BadRequestError(
      `Feedback can only be submitted for resolved or closed reports (current status: '${issue.status}')`
    );
  }

  const feedback = await Feedback.findOneAndUpdate(
    { issueId: issue._id },
    {
      $set: {
        citizenId: new mongoose.Types.ObjectId(citizenUser.id),
        rating,
        comment: comment.trim(),
        resolutionQuality: resolutionQuality || (rating >= 4 ? 'good' : rating <= 2 ? 'poor' : 'acceptable')
      }
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).exec();

  // Record in audit event log
  await recordIssueEvent({
    issueId: issue._id,
    actorId: citizenUser._id || citizenUser.id,
    eventType: AUDIT_EVENT_TYPE.UPDATED,
    reason: `Citizen submitted resolution feedback: ${rating} Stars`,
    details: {
      rating,
      resolutionQuality: feedback.resolutionQuality
    }
  });

  // Notify technician and admin
  dispatchIssueEvent(NOTIFICATION_TYPES.FEEDBACK_RECEIVED, {
    issue,
    actor: citizenUser,
    details: { rating, resolutionQuality: feedback.resolutionQuality }
  }).catch((err) => console.warn('Feedback notification dispatch error:', err.message));

  return feedback.toJSON();
}

/**
 * Retrieve feedback for an issue with privacy boundaries
 */
export async function getIssueFeedback(issueId, currentUser = null) {
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
  const assigneeIdStr = issue.assigneeId?._id
    ? issue.assigneeId._id.toString()
    : issue.assigneeId?.toString();

  const isReporter = currentUser && reporterIdStr === currentUser.id;
  const isAssignee = currentUser && assigneeIdStr === currentUser.id;
  const isAdmin = currentUser && currentUser.role === ROLES.ADMIN;

  // Protect private feedback from public viewers
  if (!isReporter && !isAssignee && !isAdmin) {
    throw new ForbiddenError('You do not have permission to view citizen feedback for this report');
  }

  const feedback = await Feedback.findOne({ issueId: issue._id })
    .populate('citizenId', 'name')
    .exec();

  return feedback ? feedback.toJSON() : null;
}

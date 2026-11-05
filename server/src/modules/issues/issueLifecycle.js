import { ISSUE_STATUS, ROLES } from '../../config/constants.js';
import { BadRequestError, ForbiddenError } from '../../utils/errors.js';

/**
 * State machine definition mapping currentStatus -> targetStatus -> permitted roles
 */
export const LIFECYCLE_TRANSITIONS = {
  [ISSUE_STATUS.SUBMITTED]: {
    [ISSUE_STATUS.UNDER_REVIEW]: [ROLES.STAFF, ROLES.ADMIN],
    [ISSUE_STATUS.ASSIGNED]: [ROLES.ADMIN],
    [ISSUE_STATUS.REJECTED]: [ROLES.STAFF, ROLES.ADMIN],
    [ISSUE_STATUS.WITHDRAWN]: [ROLES.CITIZEN]
  },
  [ISSUE_STATUS.UNDER_REVIEW]: {
    [ISSUE_STATUS.ASSIGNED]: [ROLES.ADMIN],
    [ISSUE_STATUS.IN_PROGRESS]: [ROLES.STAFF, ROLES.ADMIN],
    [ISSUE_STATUS.REJECTED]: [ROLES.STAFF, ROLES.ADMIN],
    [ISSUE_STATUS.WITHDRAWN]: [ROLES.CITIZEN]
  },
  [ISSUE_STATUS.ASSIGNED]: {
    [ISSUE_STATUS.IN_PROGRESS]: [ROLES.STAFF, ROLES.ADMIN],
    [ISSUE_STATUS.UNDER_REVIEW]: [ROLES.ADMIN],
    [ISSUE_STATUS.REJECTED]: [ROLES.ADMIN]
  },
  [ISSUE_STATUS.IN_PROGRESS]: {
    [ISSUE_STATUS.RESOLVED]: [ROLES.STAFF, ROLES.ADMIN],
    [ISSUE_STATUS.UNDER_REVIEW]: [ROLES.ADMIN]
  },
  [ISSUE_STATUS.RESOLVED]: {
    [ISSUE_STATUS.CLOSED]: [ROLES.CITIZEN, ROLES.ADMIN],
    [ISSUE_STATUS.REOPENED]: [ROLES.CITIZEN, ROLES.ADMIN]
  },
  [ISSUE_STATUS.REOPENED]: {
    [ISSUE_STATUS.UNDER_REVIEW]: [ROLES.STAFF, ROLES.ADMIN],
    [ISSUE_STATUS.ASSIGNED]: [ROLES.ADMIN],
    [ISSUE_STATUS.IN_PROGRESS]: [ROLES.STAFF, ROLES.ADMIN],
    [ISSUE_STATUS.REJECTED]: [ROLES.ADMIN]
  },
  [ISSUE_STATUS.CLOSED]: {},
  [ISSUE_STATUS.REJECTED]: {},
  [ISSUE_STATUS.WITHDRAWN]: {}
};

/**
 * Validates whether a user can execute a status transition on a given issue.
 * Throws BadRequestError or ForbiddenError if disallowed.
 */
export function validateStatusTransition(issue, targetStatus, user, reason = '') {
  const currentStatus = issue.status;

  if (currentStatus === targetStatus) {
    throw new BadRequestError(`Issue is already in '${currentStatus}' status`);
  }

  const allowedTargets = LIFECYCLE_TRANSITIONS[currentStatus];
  if (!allowedTargets || !allowedTargets[targetStatus]) {
    throw new BadRequestError(
      `Invalid transition: Cannot move issue from '${currentStatus}' to '${targetStatus}'`
    );
  }

  const permittedRoles = allowedTargets[targetStatus];
  if (!permittedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Role '${user.role}' is not authorized to transition issue from '${currentStatus}' to '${targetStatus}'`
    );
  }

  // Role-specific actor constraints
  if (user.role === ROLES.CITIZEN) {
    if (issue.reporterId.toString() !== user.id) {
      throw new ForbiddenError('Citizens can only manage transitions on their own reports');
    }
  }

  if (user.role === ROLES.STAFF) {
    // Staff can only move issues to in_progress or resolved if they are assigned to them
    if ([ISSUE_STATUS.IN_PROGRESS, ISSUE_STATUS.RESOLVED].includes(targetStatus)) {
      if (!issue.assigneeId || issue.assigneeId.toString() !== user.id) {
        throw new ForbiddenError('Staff technicians can only progress issues assigned to them');
      }
    }
  }

  // Reason requirements
  if ([ISSUE_STATUS.REJECTED, ISSUE_STATUS.REOPENED].includes(targetStatus)) {
    if (!reason || reason.trim().length < 10) {
      throw new BadRequestError(
        `A clear explanatory reason (min 10 characters) is required when setting status to '${targetStatus}'`
      );
    }
  }

  return true;
}

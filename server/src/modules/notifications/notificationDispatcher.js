import { User } from '../users/user.model.js';
import { createNotification } from './notification.service.js';
import { sendTransactionalEmail } from '../../services/emailService.js';
import { NOTIFICATION_TYPES, ROLES } from '../../config/constants.js';
import { env } from '../../config/env.js';

/**
 * Dispatch notification and optional transactional email for civic workflow events
 */
export async function dispatchIssueEvent(eventType, { issue, actor: _actor, details = {} }) {
  if (!issue) return;

  const issueId = issue.id || issue._id;
  const issueNumber = issue.issueNumber || 'Report';
  const issueTitle = issue.title || '';
  const reporterId = issue.reporterId?._id ? issue.reporterId._id.toString() : issue.reporterId?.toString();
  const assigneeId = issue.assigneeId?._id ? issue.assigneeId._id.toString() : issue.assigneeId?.toString();

  const recipients = [];

  switch (eventType) {
    case NOTIFICATION_TYPES.ISSUE_SUBMITTED:
      if (reporterId) {
        recipients.push({
          userId: reporterId,
          type: NOTIFICATION_TYPES.ISSUE_SUBMITTED,
          title: `Report Registered: ${issueNumber}`,
          message: `Your report "${issueTitle}" has been logged in municipal records and queued for review.`
        });
      }
      break;

    case NOTIFICATION_TYPES.ISSUE_ASSIGNED:
      if (assigneeId) {
        recipients.push({
          userId: assigneeId,
          type: NOTIFICATION_TYPES.ISSUE_ASSIGNED,
          title: `Work Order Assigned: ${issueNumber}`,
          message: `You have been assigned to inspect and resolve "${issueTitle}".`
        });
      }
      if (reporterId) {
        recipients.push({
          userId: reporterId,
          type: NOTIFICATION_TYPES.ISSUE_ASSIGNED,
          title: `Report Assigned: ${issueNumber}`,
          message: `Your report "${issueTitle}" has been dispatched to municipal maintenance.`
        });
      }
      break;

    case NOTIFICATION_TYPES.ISSUE_REASSIGNED:
      if (assigneeId) {
        recipients.push({
          userId: assigneeId,
          type: NOTIFICATION_TYPES.ISSUE_REASSIGNED,
          title: `Work Order Reassigned: ${issueNumber}`,
          message: `Work order "${issueTitle}" has been reassigned to you.`
        });
      }
      if (reporterId) {
        recipients.push({
          userId: reporterId,
          type: NOTIFICATION_TYPES.ISSUE_REASSIGNED,
          title: `Dispatch Updated: ${issueNumber}`,
          message: `Assigned technician has been updated for report "${issueTitle}".`
        });
      }
      break;

    case NOTIFICATION_TYPES.STATUS_CHANGED:
      if (reporterId) {
        recipients.push({
          userId: reporterId,
          type: NOTIFICATION_TYPES.STATUS_CHANGED,
          title: `Status Updated: ${issueNumber}`,
          message: `Status of "${issueTitle}" moved to '${issue.status}'.`
        });
      }
      break;

    case NOTIFICATION_TYPES.ISSUE_RESOLVED:
      if (reporterId) {
        recipients.push({
          userId: reporterId,
          type: NOTIFICATION_TYPES.ISSUE_RESOLVED,
          title: `Resolution Completed: ${issueNumber}`,
          message: `Technicians marked "${issueTitle}" as resolved. Please verify and confirm resolution.`
        });
      }
      break;

    case NOTIFICATION_TYPES.ISSUE_CLOSED:
      if (assigneeId) {
        recipients.push({
          userId: assigneeId,
          type: NOTIFICATION_TYPES.ISSUE_CLOSED,
          title: `Work Order Verified & Closed: ${issueNumber}`,
          message: `Citizen reporter confirmed resolution for "${issueTitle}".`
        });
      }
      break;

    case NOTIFICATION_TYPES.ISSUE_REOPENED:
      if (assigneeId) {
        recipients.push({
          userId: assigneeId,
          type: NOTIFICATION_TYPES.ISSUE_REOPENED,
          title: `Report Reopened: ${issueNumber}`,
          message: `Citizen stated issue remains unresolved: "${details.reason || 'Follow-up needed'}"`
        });
      }
      // Also notify municipal administrators
      try {
        const admins = await User.find({ role: ROLES.ADMIN, status: 'active' }).select('_id').exec();
        for (const admin of admins) {
          recipients.push({
            userId: admin._id.toString(),
            type: NOTIFICATION_TYPES.ISSUE_REOPENED,
            title: `Report Reopened: ${issueNumber}`,
            message: `Citizen reported unresolved issue for "${issueTitle}".`
          });
        }
      } catch (err) {
        console.warn('Could not query admin recipients:', err.message);
      }
      break;

    case NOTIFICATION_TYPES.ISSUE_REJECTED:
      if (reporterId) {
        recipients.push({
          userId: reporterId,
          type: NOTIFICATION_TYPES.ISSUE_REJECTED,
          title: `Report Rejected: ${issueNumber}`,
          message: `Report "${issueTitle}" was rejected: ${details.reason || 'Does not meet municipal criteria.'}`
        });
      }
      break;

    case NOTIFICATION_TYPES.FEEDBACK_RECEIVED:
      if (assigneeId) {
        recipients.push({
          userId: assigneeId,
          type: NOTIFICATION_TYPES.FEEDBACK_RECEIVED,
          title: `Feedback Received: ${issueNumber}`,
          message: `Citizen submitted a ${details.rating}★ rating on resolution quality.`
        });
      }
      break;

    default:
      break;
  }

  // Deliver to each recipient
  for (const item of recipients) {
    try {
      // 1. Create persistent in-app notification
      await createNotification({
        recipientId: item.userId,
        type: item.type,
        title: item.title,
        message: item.message,
        relatedIssueId: issueId,
        metadata: { issueNumber }
      });

      // 2. Deliver transactional email if enabled
      const user = await User.findById(item.userId).select('email notificationPreferences').exec();
      if (user && user.email && user.notificationPreferences?.email !== false) {
        const reportUrl = `${env.clientOrigin}/issues/${issueId}`;
        await sendTransactionalEmail({
          to: user.email,
          subject: `CivicFix: ${item.title}`,
          title: item.title,
          body: item.message,
          actionUrl: reportUrl,
          actionText: 'View Report Details'
        });
      }
    } catch (err) {
      console.error(`[ERROR] Notification delivery failed for user ${item.userId}:`, err.message);
    }
  }
}


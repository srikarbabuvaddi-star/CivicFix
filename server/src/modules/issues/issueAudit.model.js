import mongoose from 'mongoose';
import { VALID_AUDIT_EVENT_TYPES, AUDIT_EVENT_TYPE } from '../../config/constants.js';

const issueEventSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    eventType: {
      type: String,
      required: true,
      enum: {
        values: VALID_AUDIT_EVENT_TYPES,
        message: 'Unsupported audit event type `{VALUE}`'
      },
      default: AUDIT_EVENT_TYPE.STATUS_CHANGED
    },
    previousStatus: {
      type: String,
      default: null
    },
    newStatus: {
      type: String,
      default: null
    },
    previousDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    newDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    previousAssigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    newAssigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-only! No updatedAt.
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

issueEventSchema.index({ issueId: 1, createdAt: 1 });

export const IssueEvent = mongoose.model('IssueEvent', issueEventSchema);

/**
 * Record an immutable audit event for an issue
 */
export async function recordIssueEvent({
  issueId,
  actorId,
  eventType,
  previousStatus = null,
  newStatus = null,
  previousDepartmentId = null,
  newDepartmentId = null,
  previousAssigneeId = null,
  newAssigneeId = null,
  reason = null,
  details = {}
}) {
  const event = new IssueEvent({
    issueId,
    actorId,
    eventType,
    previousStatus,
    newStatus,
    previousDepartmentId,
    newDepartmentId,
    previousAssigneeId,
    newAssigneeId,
    reason,
    details
  });

  return event.save();
}

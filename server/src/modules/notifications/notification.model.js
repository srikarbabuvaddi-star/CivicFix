import mongoose from 'mongoose';
import { VALID_NOTIFICATION_TYPES } from '../../config/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required']
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: VALID_NOTIFICATION_TYPES,
        message: 'Notification type `{VALUE}` is not supported'
      }
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    relatedIssueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: [true, 'Related Issue ID is required']
    },
    readAt: {
      type: Date,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

// High performance compound indexes for fast query and unread count
notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ relatedIssueId: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);


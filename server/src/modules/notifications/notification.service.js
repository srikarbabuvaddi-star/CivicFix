import mongoose from 'mongoose';
import { Notification } from './notification.model.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

/**
 * Create a persistent in-app notification with duplicate prevention
 */
export async function createNotification({
  recipientId,
  type,
  title,
  message,
  relatedIssueId,
  metadata = {}
}) {
  if (!mongoose.Types.ObjectId.isValid(recipientId)) {
    throw new BadRequestError('Invalid recipient identifier');
  }
  if (!mongoose.Types.ObjectId.isValid(relatedIssueId)) {
    throw new BadRequestError('Invalid related issue identifier');
  }

  // Idempotency check: prevent duplicate notifications within 10 seconds window
  const tenSecondsAgo = new Date(Date.now() - 10000);
  const existing = await Notification.findOne({
    recipientId: new mongoose.Types.ObjectId(recipientId),
    relatedIssueId: new mongoose.Types.ObjectId(relatedIssueId),
    type,
    createdAt: { $gte: tenSecondsAgo }
  });

  if (existing) {
    return existing.toJSON();
  }

  const notification = new Notification({
    recipientId: new mongoose.Types.ObjectId(recipientId),
    type,
    title: title.trim(),
    message: message.trim(),
    relatedIssueId: new mongoose.Types.ObjectId(relatedIssueId),
    metadata
  });

  const saved = await notification.save();
  return saved.toJSON();
}

/**
 * Fetch notifications for authenticated user with pagination and optional unread filter
 */
export async function getUserNotifications(
  userId,
  { page = 1, limit = 20, unreadOnly = false }
) {
  const query = {
    recipientId: new mongoose.Types.ObjectId(userId)
  };

  if (unreadOnly) {
    query.readAt = null;
  }

  const skip = (page - 1) * limit;

  const [total, notifications] = await Promise.all([
    Notification.countDocuments(query),
    Notification.find(query)
      .populate('relatedIssueId', 'issueNumber title status visibility')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec()
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    notifications: notifications.map((n) => n.toJSON()),
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
 * Fast count of unread notifications for navbar badges
 */
export async function getUnreadCount(userId) {
  const count = await Notification.countDocuments({
    recipientId: new mongoose.Types.ObjectId(userId),
    readAt: null
  });
  return { unreadCount: count };
}

/**
 * Mark a single notification as read with strict ownership check
 */
export async function markAsRead(notificationId, userId) {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new BadRequestError('Invalid notification identifier format');
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(notificationId),
      recipientId: new mongoose.Types.ObjectId(userId)
    },
    { $set: { readAt: new Date() } },
    { new: true }
  ).exec();

  if (!notification) {
    throw new NotFoundError('Notification not found or access unauthorized');
  }

  return notification.toJSON();
}

/**
 * Mark all unread notifications for user as read
 */
export async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    {
      recipientId: new mongoose.Types.ObjectId(userId),
      readAt: null
    },
    { $set: { readAt: new Date() } }
  );

  return {
    success: true,
    modifiedCount: result.modifiedCount
  };
}


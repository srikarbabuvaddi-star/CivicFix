import * as notificationService from './notification.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function getNotifications(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(req.user.id, {
      page,
      limit,
      unreadOnly
    });

    return sendSuccess(res, result, 'Notifications retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const result = await notificationService.getUnreadCount(req.user.id);
    return sendSuccess(res, result, 'Unread notification count retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const updated = await notificationService.markAsRead(req.params.id, req.user.id);
    return sendSuccess(res, updated, 'Notification marked as read', 200);
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    return sendSuccess(res, result, 'All notifications marked as read', 200);
  } catch (error) {
    next(error);
  }
}


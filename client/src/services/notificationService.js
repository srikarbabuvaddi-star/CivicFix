import { apiClient } from './apiClient.js';

export async function getNotifications(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (typeof params.isRead === 'boolean') query.set('isRead', params.isRead.toString());

  const qs = query.toString();
  const endpoint = qs ? `/notifications?${qs}` : '/notifications';
  const response = await apiClient.get(endpoint);
  return response.data;
}

export async function getUnreadCount() {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data;
}

export async function markAsRead(notificationId) {
  const response = await apiClient.patch(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllAsRead() {
  const response = await apiClient.patch('/notifications/read-all');
  return response.data;
}


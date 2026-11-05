import { apiClient } from './apiClient.js';

export async function createIssue(payload) {
  const response = await apiClient.post('/issues', payload);
  return response.data;
}

export async function getPublicIssues(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  if (params.timePeriod) query.set('timePeriod', params.timePeriod);
  if (params.bbox) query.set('bbox', params.bbox);
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const endpoint = qs ? `/issues?${qs}` : '/issues';
  const response = await apiClient.get(endpoint);
  return response.data;
}

export async function getMyIssues(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const endpoint = qs ? `/issues/mine?${qs}` : '/issues/mine';
  const response = await apiClient.get(endpoint);
  return response.data;
}

export async function getStaffQueue(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const endpoint = qs ? `/issues/staff/queue?${qs}` : '/issues/staff/queue';
  const response = await apiClient.get(endpoint);
  return response.data;
}

export async function getTriageQueue(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  if (params.unassignedOnly) query.set('unassignedOnly', 'true');
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const endpoint = qs ? `/issues/admin/triage?${qs}` : '/issues/admin/triage';
  const response = await apiClient.get(endpoint);
  return response.data;
}

export async function getIssueById(id) {
  const response = await apiClient.get(`/issues/${id}`);
  return response.data;
}

export async function getIssueTimeline(id) {
  const response = await apiClient.get(`/issues/${id}/timeline`);
  return response.data;
}

export async function updateIssue(id, payload) {
  const response = await apiClient.patch(`/issues/${id}`, payload);
  return response.data;
}

export async function withdrawIssue(id) {
  const response = await apiClient.delete(`/issues/${id}`);
  return response.data;
}

export async function assignIssue(id, { departmentId, assigneeId, reason }) {
  const response = await apiClient.post(`/issues/${id}/assign`, {
    departmentId,
    assigneeId,
    reason
  });
  return response.data;
}

export async function reassignIssue(id, { departmentId, assigneeId, reason }) {
  const response = await apiClient.post(`/issues/${id}/reassign`, {
    departmentId,
    assigneeId,
    reason
  });
  return response.data;
}

export async function transitionIssue(id, { status, reason }) {
  const response = await apiClient.post(`/issues/${id}/transition`, {
    status,
    reason
  });
  return response.data;
}

export async function resolveIssue(id, { resolutionNotes, evidenceNotes }) {
  const response = await apiClient.post(`/issues/${id}/resolve`, {
    resolutionNotes,
    evidenceNotes
  });
  return response.data;
}

export async function verifyIssue(id) {
  const response = await apiClient.post(`/issues/${id}/verify`);
  return response.data;
}

export async function reopenIssue(id, { reason }) {
  const response = await apiClient.post(`/issues/${id}/reopen`, { reason });
  return response.data;
}

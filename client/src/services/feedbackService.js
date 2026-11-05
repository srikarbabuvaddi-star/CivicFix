import { apiClient } from './apiClient.js';

export async function submitFeedback(issueId, payload) {
  const response = await apiClient.post(`/issues/${issueId}/feedback`, payload);
  return response.data;
}

export async function getIssueFeedback(issueId) {
  const response = await apiClient.get(`/issues/${issueId}/feedback`);
  return response.data;
}


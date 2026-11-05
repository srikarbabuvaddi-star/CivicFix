import { apiClient } from './apiClient.js';

export async function getCitizenAnalytics() {
  const response = await apiClient.get('/analytics/citizen');
  return response.data;
}

export async function getStaffAnalytics() {
  const response = await apiClient.get('/analytics/staff');
  return response.data;
}

export async function getAdminAnalytics() {
  const response = await apiClient.get('/analytics/admin');
  return response.data;
}

export async function getGeographicHotspots(params = {}) {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.timePeriod) query.set('timePeriod', params.timePeriod);
  if (params.minThreshold) query.set('minThreshold', params.minThreshold.toString());

  const qs = query.toString();
  const endpoint = qs ? `/analytics/hotspots?${qs}` : '/analytics/hotspots';
  const response = await apiClient.get(endpoint);
  return response.data;
}


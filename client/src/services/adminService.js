import { apiClient } from './apiClient.js';

export async function getStaffDirectory(params = {}) {
  const query = new URLSearchParams();
  if (params.departmentId) query.set('departmentId', params.departmentId);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);

  const qs = query.toString();
  const endpoint = qs ? `/admin/staff?${qs}` : '/admin/staff';
  const response = await apiClient.get(endpoint);
  return response.data;
}

export async function assignStaffDepartment(staffId, departmentId) {
  const response = await apiClient.patch(`/admin/staff/${staffId}/department`, { departmentId });
  return response.data;
}

export async function updateStaffStatus(staffId, status) {
  const response = await apiClient.patch(`/admin/staff/${staffId}/status`, { status });
  return response.data;
}


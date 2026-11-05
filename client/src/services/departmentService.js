import { apiClient } from './apiClient.js';

export async function getDepartments(params = {}) {
  const query = new URLSearchParams();
  if (params.activeOnly !== undefined) query.set('activeOnly', params.activeOnly);
  if (params.category) query.set('category', params.category);
  if (params.search) query.set('search', params.search);

  const qs = query.toString();
  const endpoint = qs ? `/departments?${qs}` : '/departments';
  const response = await apiClient.get(endpoint);
  return response.data;
}

export async function getDepartmentById(id) {
  const response = await apiClient.get(`/departments/${id}`);
  return response.data;
}

export async function suggestDepartment(category) {
  const response = await apiClient.get(`/departments/suggest/${category}`);
  return response.data;
}

export async function createDepartment(payload) {
  const response = await apiClient.post('/departments', payload);
  return response.data;
}

export async function updateDepartment(id, payload) {
  const response = await apiClient.patch(`/departments/${id}`, payload);
  return response.data;
}

export async function deleteDepartment(id) {
  const response = await apiClient.delete(`/departments/${id}`);
  return response.data;
}


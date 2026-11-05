import { apiClient, setCsrfToken } from './apiClient.js';

export async function login({ email, password }) {
  const response = await apiClient.post('/auth/login', { email, password });
  if (response?.data?.csrfToken) {
    setCsrfToken(response.data.csrfToken);
  }
  return response.data;
}

export async function register({ name, email, password }) {
  const response = await apiClient.post('/auth/register', { name, email, password });
  if (response?.data?.csrfToken) {
    setCsrfToken(response.data.csrfToken);
  }
  return response.data;
}

export async function logout() {
  const response = await apiClient.post('/auth/logout');
  setCsrfToken(null);
  return response;
}

export async function getMe() {
  const response = await apiClient.get('/auth/me');
  if (response?.data?.csrfToken) {
    setCsrfToken(response.data.csrfToken);
  }
  return response.data;
}

export async function getHealth() {
  const response = await apiClient.get('/health');
  return response.data;
}


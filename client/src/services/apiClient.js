const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

let inMemoryCsrfToken = null;

export function setCsrfToken(token) {
  inMemoryCsrfToken = token;
}

export function getCsrfToken() {
  return inMemoryCsrfToken;
}

export class ApiError extends Error {
  constructor(message, statusCode, details = null, responseData = null, correlationId = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.response = responseData ? { data: responseData } : null;
    this.correlationId = correlationId;
  }
}

/**
 * Fetch CSRF token from the server if not already in memory
 */
export async function ensureCsrfToken() {
  if (inMemoryCsrfToken) {
    return inMemoryCsrfToken;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.data?.csrfToken) {
        setCsrfToken(data.data.csrfToken);
        return data.data.csrfToken;
      }
    }
  } catch (err) {
    console.warn('Could not pre-fetch CSRF token:', err);
  }

  return inMemoryCsrfToken;
}

/**
 * Centralized request wrapper with cookie credentials and CSRF support
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  // For state-changing operations, attach CSRF token
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (isMutating) {
    let token = getCsrfToken();
    if (!token && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
      token = await ensureCsrfToken();
    }
    if (token) {
      headers['x-csrf-token'] = token;
    }
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include' // Always send/receive HttpOnly session cookies
  });

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // If response contains updated CSRF token, store it
  if (data?.data?.csrfToken) {
    setCsrfToken(data.data.csrfToken);
  }

  if (!response.ok) {
    const errorMessage = data?.message || `Request failed with status ${response.status}`;
    const details = data?.details || null;
    const correlationId = response.headers.get('x-correlation-id');
    throw new ApiError(errorMessage, response.status, details, data, correlationId);
  }

  return data;
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' })
};


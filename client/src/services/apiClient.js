const rawApiUrl = (import.meta.env.VITE_API_URL || '/api/v1').trim();
const API_BASE_URL = rawApiUrl.endsWith('/api/v1')
  ? rawApiUrl
  : rawApiUrl.startsWith('http')
    ? `${rawApiUrl.replace(/\/+$/, '')}/api/v1`
    : rawApiUrl;

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
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // If response contains updated CSRF token, store it
  if (data?.data?.csrfToken) {
    setCsrfToken(data.data.csrfToken);
  }

  if (!response.ok) {
    let errorMessage = (typeof data === 'object' && data?.message) ? data.message : null;

    if (!errorMessage) {
      if (response.status === 405) {
        errorMessage = 'Authentication Error (HTTP 405 Method Not Allowed): The API request hit a static hosting route instead of the live backend server. If deploying to Vercel, please set VITE_API_URL in your Vercel Project Environment Variables to point to your live backend API (e.g. https://your-backend.onrender.com/api/v1).';
      } else if (response.status === 404) {
        errorMessage = `API Endpoint Not Found (HTTP 404): ${url}`;
      } else if (response.status >= 500) {
        errorMessage = `Backend Service Error (HTTP ${response.status}). Please check backend service logs.`;
      } else {
        errorMessage = `Request failed with status ${response.status}`;
      }
    }

    const details = (typeof data === 'object' && data?.details) ? data.details : null;
    const correlationId = response.headers.get('x-correlation-id');
    throw new ApiError(errorMessage, response.status, details, data, correlationId);
  }

  // Guard against HTML returned on HTTP 200 (e.g. SPA index.html fallback rewrite on Vercel)
  if (contentType.includes('text/html') || (typeof data === 'string' && data.trim().startsWith('<!DOCTYPE'))) {
    throw new ApiError(
      'API Error: The server returned HTML instead of JSON. The backend server might be offline, unreachable, or VITE_API_URL is not configured in your deployment settings.',
      502
    );
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


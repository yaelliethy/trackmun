const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

class ApiError extends Error {
  constructor(public message: string, public code?: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAuthToken(): string | null {
  // Check for impersonation token in localStorage first
  const impersonationToken = localStorage.getItem('impersonation_token');
  if (impersonationToken) return impersonationToken;

  // better-auth access token
  return localStorage.getItem('auth_token');
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    // better-auth JWT plugin: GET /auth/token (session cookie). POST /auth/refresh is a server alias.
    const response = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Refresh failed');

    const data = (await response.json()) as { token?: string; accessToken?: string };
    const token = data.token ?? data.accessToken;
    if (token) {
      localStorage.setItem('auth_token', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getAuthToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 and attempt silent refresh
  if (
    response.status === 401 &&
    !path.includes('/auth/token') &&
    !path.includes('/auth/refresh') &&
    !path.includes('/auth/sign-in')
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  const data = (await response.json()) as any;

  // better-auth direct responses don't use our success/data envelope
  if (path.startsWith('/auth/') && !path.includes('/me') && !path.includes('/admin/impersonate') && !path.includes('/admin/unimpersonate')) {
    if (!response.ok) {
      throw new ApiError(data.error || 'Request failed', data.code, response.status);
    }
    return data as T;
  }

  if (!data.success) {
    throw new ApiError(data.error, data.code, response.status);
  }

  return data.data;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: any, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: any, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: any, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'DELETE' }),
};

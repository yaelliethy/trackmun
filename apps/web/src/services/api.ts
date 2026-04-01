import { supabase } from '../lib/supabase';

const API_BASE_URL = '/functions/api';

class ApiError extends Error {
  constructor(public message: string, public code?: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAuthToken(): Promise<string | null> {
  // Check for impersonation token in localStorage first
  const impersonationToken = localStorage.getItem('impersonation_token');
  if (impersonationToken) return impersonationToken;

  // Supabase access token
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = (await response.json()) as any;

  // Supabase direct responses don't use our success/data envelope
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

import { auth } from '../lib/firebase';
import { ApiResponse } from '@trackmun/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

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

  const user = auth.currentUser;
  if (!user) return null;
  
  return await user.getIdToken();
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

  const data = (await response.json()) as ApiResponse<T>;

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
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'DELETE' }),
};

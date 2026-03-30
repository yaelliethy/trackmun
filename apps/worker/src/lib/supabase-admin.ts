import { Bindings } from '../types/env';

export class SupabaseAdmin {
  private url: string;
  private serviceRoleKey: string;

  constructor(env: Bindings) {
    this.url = env.SUPABASE_URL.replace(/\/$/, '');
    this.serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.url}${path}`, {
      ...options,
      headers: {
        'apikey': this.serviceRoleKey,
        'Authorization': `Bearer ${this.serviceRoleKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(data.msg || data.error_description || data.error || 'Supabase Admin API request failed');
    }

    return data as T;
  }

  /**
   * Create a new user with the Admin API (bypassing email confirmation)
   */
  async createUser(params: {
    email: string;
    password?: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, any>;
  }) {
    return this.request<{ id: string; email: string }>('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        ...params,
        email_confirm: params.email_confirm ?? true,
      }),
    });
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string) {
    return this.request<void>(`/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, params: Record<string, any>) {
    return this.request<any>(`/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  }
}

export const getSupabaseAdmin = (env: Bindings) => new SupabaseAdmin(env);

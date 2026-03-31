import { Bindings } from '../types/env';
import type { TrackmunAppMetadata } from './jwt-user-claims';

export type SupabaseAdminUserResponse = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

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

  async getAdminUser(userId: string): Promise<SupabaseAdminUserResponse> {
    return this.request<SupabaseAdminUserResponse>(`/auth/v1/admin/users/${userId}`, {
      method: 'GET',
    });
  }

  /**
   * Merge `app_metadata.trackmun` so the next access JWT includes RBAC for Worker `withAuth` (no per-request Turso read).
   */
  async syncTrackmunJwtMetadata(
    userId: string,
    trackmun: TrackmunAppMetadata,
    options?: { user_metadata?: Record<string, unknown> }
  ): Promise<void> {
    let existingApp: Record<string, unknown> = {};
    let existingUserMeta: Record<string, unknown> = {};
    try {
      const existing = await this.getAdminUser(userId);
      if (existing.app_metadata && typeof existing.app_metadata === 'object') {
        existingApp = { ...existing.app_metadata };
      }
      if (existing.user_metadata && typeof existing.user_metadata === 'object') {
        existingUserMeta = { ...existing.user_metadata };
      }
    } catch (e) {
      console.warn(`[SupabaseAdmin] getAdminUser before sync failed for ${userId}:`, e);
    }

    const mergedTrackmun: TrackmunAppMetadata = {
      ...trackmun,
      createdAtMs: trackmun.createdAtMs ?? Date.now(),
    };

    const body: Record<string, unknown> = {
      app_metadata: {
        ...existingApp,
        trackmun: mergedTrackmun,
      },
    };
    if (options?.user_metadata && Object.keys(options.user_metadata).length > 0) {
      body.user_metadata = { ...existingUserMeta, ...options.user_metadata };
    }

    await this.updateUser(userId, body);
  }
}

export const getSupabaseAdmin = (env: Bindings) => new SupabaseAdmin(env);

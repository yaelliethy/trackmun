import { describe, it, expect, vi } from 'vitest';
import type { Bindings } from '#src/types/env';

describe('OpenAPI & Swagger UI', () => {
  const testBindings = (): Bindings => ({
    TURSO_DATABASE_URL: 'libsql://test.turso.io',
    TURSO_AUTH_TOKEN: 'mock-token',
    MEDIA: {} as R2Bucket,
    R2_ACCESS_KEY_ID: 'mock-access-key',
    R2_SECRET_ACCESS_KEY: 'mock-secret-key',
    R2_ENDPOINT: 'mock-endpoint',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    SUPABASE_JWT_SECRET: 'test-jwt-secret-at-least-32-chars-long',
    FRONTEND_URL: 'http://localhost:5173',
    IMPERSONATION_SECRET: 'test-impersonation-secret-32chars-min',
  });

  it('serves OpenAPI documentation at /doc', async () => {
    const { default: app } = await import('#src/index');
    const res = await app.request('http://localhost/doc', {}, testBindings());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { openapi?: string; info?: { title?: string } };
    expect(body).toHaveProperty('openapi');
    expect(body).toHaveProperty('info');
    expect(body.info?.title).toBe('TrackMUN API');
  });

  it('serves Swagger UI at /docs', async () => {
    const { default: app } = await import('#src/index');
    const res = await app.request('http://localhost/docs', {}, testBindings());
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.toLowerCase()).toMatch(/swagger/);
  });
});

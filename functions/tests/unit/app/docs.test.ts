import { describe, it, expect } from 'vitest';
import type { Bindings } from '#src/types/env';

function mockKv(): KVNamespace {
  return {
    get: async () => null,
    getWithMetadata: async () => null,
    put: async () => {},
    delete: async () => {},
    list: async () => ({ keys: [], list_complete: true, cursor: '' }),
  } as unknown as KVNamespace;
}

describe('OpenAPI & Swagger UI', () => {
  const testBindings = (): Bindings => ({
    TURSO_DATABASE_URL: 'libsql://test.turso.io',
    TURSO_AUTH_TOKEN: 'mock-token',
    MEDIA: {} as R2Bucket,
    R2_ACCESS_KEY_ID: 'mock-access-key',
    R2_SECRET_ACCESS_KEY: 'mock-secret-key',
    R2_ENDPOINT: 'mock-endpoint',
    JWKS_KV: mockKv(),
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    FRONTEND_URL: 'http://localhost:5173',
    IMPERSONATION_SECRET: 'test-impersonation-secret-32chars-min',
  });

  it('serves OpenAPI documentation at /api/doc', async () => {
    const { default: app } = await import('#src/index');
    const res = await app.request('http://localhost/api/doc', {}, testBindings());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { openapi?: string; info?: { title?: string } };
    expect(body).toHaveProperty('openapi');
    expect(body).toHaveProperty('info');
    expect(body.info?.title).toBe('TrackMUN API');
  });

  it('serves Swagger UI at /api/docs', async () => {
    const { default: app } = await import('#src/index');
    const res = await app.request('http://localhost/api/docs', {}, testBindings());
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.toLowerCase()).toMatch(/swagger/);
  });
});

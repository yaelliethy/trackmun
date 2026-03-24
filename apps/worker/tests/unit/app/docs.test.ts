import { describe, it, expect, vi } from 'vitest';
import type { Bindings } from '#src/types/env';

vi.mock('#src/lib/auth', () => ({
  getAuth: vi.fn(() => ({
    handler: async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  })),
}));

import app from '#src/index';

function testBindings(): Bindings {
  return {
    DB: {} as D1Database,
    MEDIA: {} as R2Bucket,
    BETTER_AUTH_SECRET: 'test-better-auth-secret-32chars-minimum',
    BETTER_AUTH_URL: 'http://127.0.0.1:8787',
    FRONTEND_URL: 'http://localhost:5173',
    IMPERSONATION_SECRET: 'test-impersonation-secret-32chars-min',
  };
}

describe('OpenAPI & Swagger UI', () => {
  it('serves OpenAPI documentation at /doc', async () => {
    const res = await app.request('http://localhost/doc', {}, testBindings());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { openapi?: string; info?: { title?: string } };
    expect(body).toHaveProperty('openapi');
    expect(body).toHaveProperty('info');
    expect(body.info?.title).toBe('TrackMUN API');
  });

  it('serves Swagger UI at /docs', async () => {
    const res = await app.request('http://localhost/docs', {}, testBindings());
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.toLowerCase()).toMatch(/swagger/);
  });
});

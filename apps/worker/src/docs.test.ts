import { describe, it, expect } from 'vitest';
import app from './index';

describe('OpenAPI & Swagger UI', () => {
  it('should serve OpenAPI documentation at /doc', async () => {
    const res = await app.request('/doc');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toHaveProperty('openapi');
    expect(body).toHaveProperty('info');
    expect((body as any).info.title).toBe('TrackMUN API');
  });

  it('should serve Swagger UI at /docs', async () => {
    const res = await app.request('/docs');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<title>Swagger UI</title>');
  });
});

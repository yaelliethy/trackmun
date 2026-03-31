import { describe, it, expect } from 'vitest';
import { userFromAccessTokenPayload } from '#src/lib/jwt-user-claims';

describe('userFromAccessTokenPayload', () => {
  it('returns User when app_metadata.trackmun and email are valid', () => {
    const u = userFromAccessTokenPayload({
      sub: 'u1',
      email: 'a@b.com',
      iat: 1700000000,
      user_metadata: { name: 'Alice', firstName: 'A', lastName: 'L' },
      app_metadata: {
        trackmun: {
          role: 'delegate',
          registrationStatus: 'approved',
          council: 'GA',
        },
      },
    });
    expect(u).not.toBeNull();
    expect(u!.id).toBe('u1');
    expect(u!.email).toBe('a@b.com');
    expect(u!.name).toBe('Alice');
    expect(u!.role).toBe('delegate');
    expect(u!.registrationStatus).toBe('approved');
    expect(u!.council).toBe('GA');
    expect(u!.created_at).toBe(1700000000 * 1000);
  });

  it('returns null when trackmun is missing', () => {
    expect(
      userFromAccessTokenPayload({
        sub: 'u1',
        email: 'a@b.com',
        app_metadata: {},
      })
    ).toBeNull();
  });

  it('returns null when email is missing', () => {
    expect(
      userFromAccessTokenPayload({
        sub: 'u1',
        app_metadata: {
          trackmun: { role: 'admin', registrationStatus: 'approved' },
        },
      })
    ).toBeNull();
  });
});

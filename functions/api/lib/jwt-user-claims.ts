import { z } from 'zod';
import { User, UserRoleSchema } from '@trackmun/shared';

const TrackmunAppMetadataSchema = z.object({
  role: UserRoleSchema,
  registrationStatus: z.enum(['pending', 'approved', 'rejected']),
  council: z.string().nullable().optional(),
  /** Unix time in ms when metadata was synced (optional; falls back to JWT iat) */
  createdAtMs: z.number().optional(),
});

/**
 * Server-authoritative RBAC fields stored under `app_metadata.trackmun` in Supabase
 * and mirrored into the access JWT.
 */
export type TrackmunAppMetadata = z.infer<typeof TrackmunAppMetadataSchema>;

const AppMetadataWithTrackmunSchema = z
  .object({
    trackmun: TrackmunAppMetadataSchema,
  })
  .passthrough();

/**
 * Build a `User` from a verified Supabase access JWT payload when `app_metadata.trackmun` is present and valid.
 * Returns null to trigger Turso fallback (legacy tokens or incomplete metadata).
 */
export function userFromAccessTokenPayload(payload: Record<string, unknown>): User | null {
  const rawApp = payload.app_metadata;
  if (!rawApp || typeof rawApp !== 'object') return null;

  const parsedApp = AppMetadataWithTrackmunSchema.safeParse(rawApp);
  if (!parsedApp.success) return null;

  const sub = payload.sub;
  if (typeof sub !== 'string' || !sub) return null;

  const email = payload.email;
  if (typeof email !== 'string' || !email.includes('@')) return null;

  const userMeta =
    payload.user_metadata && typeof payload.user_metadata === 'object'
      ? (payload.user_metadata as Record<string, unknown>)
      : {};

  const nameFromMeta =
    typeof userMeta.name === 'string' && userMeta.name.trim()
      ? userMeta.name
      : typeof payload.name === 'string' && payload.name.trim()
        ? payload.name
        : email.split('@')[0] ?? 'User';

  const firstName = typeof userMeta.firstName === 'string' ? userMeta.firstName : undefined;
  const lastName = typeof userMeta.lastName === 'string' ? userMeta.lastName : undefined;

  const tm = parsedApp.data.trackmun;
  const iatSec = typeof payload.iat === 'number' ? payload.iat : undefined;
  const created_at =
    tm.createdAtMs ?? (iatSec !== undefined ? iatSec * 1000 : Date.now());

  return {
    id: sub,
    email,
    firstName: firstName ?? null,
    lastName: lastName ?? null,
    name: nameFromMeta,
    role: tm.role,
    registrationStatus: tm.registrationStatus,
    council: tm.council ?? undefined,
    created_at,
  };
}

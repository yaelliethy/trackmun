import { z } from 'zod';

export const UserRoleSchema = z.enum(['delegate', 'oc', 'chair', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  council: z.string().optional().nullable(),
  created_at: z.number(),
});

export type User = z.infer<typeof UserSchema>;

export const ApiResponseSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.any(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    code: z.string().optional(),
  }),
]);

export type ApiResponse<T = any> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// Auth specific schemas
export const AuthSyncSchema = z.object({
  name: z.string().min(1),
});

export const ImpersonateResponseSchema = z.object({
  token: z.string(),
});
/**
 * Auth-related schemas for request validation
 */
export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  council: z.string().optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: UserRoleSchema,
  }),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

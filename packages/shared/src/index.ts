import { z } from 'zod';

export const UserRoleSchema = z.enum(['delegate', 'oc', 'chair', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  council: z.string().optional(),
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

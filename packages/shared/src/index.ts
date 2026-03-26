import { z } from 'zod';

export const UserRoleSchema = z.enum(['delegate', 'oc', 'chair', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  name: z.string(),
  role: UserRoleSchema,
  registrationStatus: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
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

export const ImpersonateResponseSchema = z.object({
  token: z.string(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  council: z.string().nullable().optional(),
  role: UserRoleSchema.optional(),
});

export const BenefitSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type Benefit = z.infer<typeof BenefitSchema>;

export const AttendancePeriodSchema = z.object({
  id: z.string(),
  dayId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
});

export type AttendancePeriod = z.infer<typeof AttendancePeriodSchema>;

export const ConferenceDaySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  date: z.string(),
  periods: z.array(AttendancePeriodSchema).optional(),
});

export type ConferenceDay = z.infer<typeof ConferenceDaySchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: UserRoleSchema,
  council: z.string().optional(),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

export const RegisterUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  firstChoice: z.string().min(1, 'Please select a first choice committee'),
  secondChoice: z.string().min(1, 'Please select a second choice committee'),
});

export type RegisterUser = z.infer<typeof RegisterUserSchema>;

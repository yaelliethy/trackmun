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

  // Delegate specific payment tracking fields
  depositAmount: z.number().nullable().optional(),
  fullAmount: z.number().nullable().optional(),
  depositPaymentStatus: z.enum(['pending', 'paid']).nullable().optional(),
  fullPaymentStatus: z.enum(['pending', 'paid']).nullable().optional(),
  paymentProofR2Key: z.string().nullable().optional(),
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

export const CouncilSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type Council = z.infer<typeof CouncilSchema>;

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
  answers: z.record(z.string()).optional(), // questionId -> value
  paymentProofR2Key: z.string().optional(),
});

export type RegisterUser = z.infer<typeof RegisterUserSchema>;

// Registration Forms and Settings
export const RegistrationStepSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  order: z.number().int(),
});
export type RegistrationStep = z.infer<typeof RegistrationStepSchema>;

export const RegistrationQuestionSchema = z.object({
  id: z.string(),
  stepId: z.string(),
  label: z.string().min(1),
  type: z.enum(['text', 'long_text', 'choices', 'dropdown', 'council_preference']),
  options: z.string().nullable().optional(),
  required: z.boolean(),
  displayOrder: z.number().int(),
  councilPreferenceCount: z.number().int().min(1).optional(),
});
export type RegistrationQuestion = z.infer<typeof RegistrationQuestionSchema>;

export const SettingsSchema = z.object({
  registration_deposit_amount: z.number().int().optional(),
  registration_full_amount: z.number().int().optional(),
  payment_proof_timing: z.enum(['registration', 'after_acceptance']).optional(),
  registration_enabled: z.boolean().optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const GetPresignedUrlRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  size: z.number().int().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
});
export type GetPresignedUrlRequest = z.infer<typeof GetPresignedUrlRequestSchema>;

export const ConfirmPaymentProofSchema = z.object({
  r2Key: z.string().min(1),
});
export type ConfirmPaymentProof = z.infer<typeof ConfirmPaymentProofSchema>;

export const UpdateDelegatePaymentSchema = z.object({
  depositPaymentStatus: z.enum(['pending', 'paid']).optional(),
  fullPaymentStatus: z.enum(['pending', 'paid']).optional(),
});
export type UpdateDelegatePayment = z.infer<typeof UpdateDelegatePaymentSchema>;

export const DelegateResponseSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  registrationStatus: z.enum(['pending', 'approved', 'rejected']),
  answers: z.array(z.object({
    questionId: z.string(),
    questionLabel: z.string(),
    value: z.string(),
  })),
});
export type DelegateResponse = z.infer<typeof DelegateResponseSchema>;

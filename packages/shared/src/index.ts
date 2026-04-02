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
  daysAttended: z.number().nullable().optional(),
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
  shortName: z.string().nullable().optional(),
  capacity: z.number().int().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type Council = z.infer<typeof CouncilSchema>;

// OC-specific types
export const ActiveAttendancePeriodSchema = z.object({
  periodId: z.string(),
  dayId: z.string(),
  dayName: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  sessionLabel: z.string(),
});
export type ActiveAttendancePeriod = z.infer<typeof ActiveAttendancePeriodSchema>;

export const DelegateSearchResultSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  identifier: z.string().nullable().optional(),
  council: z.string().nullable().optional(),
});
export type DelegateSearchResult = z.infer<typeof DelegateSearchResultSchema>;

export const BenefitWithStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  redeemed: z.boolean(),
  redeemedAt: z.number().nullable().optional(),
});
export type BenefitWithStatus = z.infer<typeof BenefitWithStatusSchema>;

export const AttendanceResultSchema = z.object({
  success: z.boolean(),
  alreadyRecorded: z.boolean(),
  delegateName: z.string().optional(),
  sessionLabel: z.string().optional(),
});
export type AttendanceResult = z.infer<typeof AttendanceResultSchema>;

export const BenefitRedeemResultSchema = z.object({
  success: z.boolean(),
  alreadyRedeemed: z.boolean(),
  delegateName: z.string().optional(),
  benefitName: z.string().optional(),
  redeemedAt: z.number().nullable().optional(),
});
export type BenefitRedeemResult = z.infer<typeof BenefitRedeemResultSchema>;

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
  chairs_can_reject: z.boolean().optional(),
  chairs_can_defer: z.boolean().optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const GetPresignedUrlRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  size: z.number().int().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
});
export const ConfirmPaymentProofSchema = z.object({
  r2Key: z.string().min(1),
});

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

export function getCountriesList() {
  return [
    { alpha2: 'AF', name: 'Afghanistan' },
    { alpha2: 'AL', name: 'Albania' },
    { alpha2: 'DZ', name: 'Algeria' },
    { alpha2: 'AD', name: 'Andorra' },
    { alpha2: 'AO', name: 'Angola' },
    { alpha2: 'AR', name: 'Argentina' },
    { alpha2: 'AM', name: 'Armenia' },
    { alpha2: 'AU', name: 'Australia' },
    { alpha2: 'AT', name: 'Austria' },
    { alpha2: 'AZ', name: 'Azerbaijan' },
    { alpha2: 'BS', name: 'Bahamas' },
    { alpha2: 'BH', name: 'Bahrain' },
    { alpha2: 'BD', name: 'Bangladesh' },
    { alpha2: 'BB', name: 'Barbados' },
    { alpha2: 'BY', name: 'Belarus' },
    { alpha2: 'BE', name: 'Belgium' },
    { alpha2: 'BZ', name: 'Belize' },
    { alpha2: 'BJ', name: 'Benin' },
    { alpha2: 'BT', name: 'Bhutan' },
    { alpha2: 'BO', name: 'Bolivia' },
    { alpha2: 'BA', name: 'Bosnia and Herzegovina' },
    { alpha2: 'BW', name: 'Botswana' },
    { alpha2: 'BR', name: 'Brazil' },
    { alpha2: 'BN', name: 'Brunei' },
    { alpha2: 'BG', name: 'Bulgaria' },
    { alpha2: 'BF', name: 'Burkina Faso' },
    { alpha2: 'BI', name: 'Burundi' },
    { alpha2: 'KH', name: 'Cambodia' },
    { alpha2: 'CM', name: 'Cameroon' },
    { alpha2: 'CA', name: 'Canada' },
    { alpha2: 'CV', name: 'Cape Verde' },
    { alpha2: 'CF', name: 'Central African Republic' },
    { alpha2: 'TD', name: 'Chad' },
    { alpha2: 'CL', name: 'Chile' },
    { alpha2: 'CN', name: 'China' },
    { alpha2: 'CO', name: 'Colombia' },
    { alpha2: 'KM', name: 'Comoros' },
    { alpha2: 'CG', name: 'Congo' },
    { alpha2: 'CR', name: 'Costa Rica' },
    { alpha2: 'CI', name: "Côte d'Ivoire" },
    { alpha2: 'HR', name: 'Croatia' },
    { alpha2: 'CU', name: 'Cuba' },
    { alpha2: 'CY', name: 'Cyprus' },
    { alpha2: 'CZ', name: 'Czech Republic' },
    { alpha2: 'DK', name: 'Denmark' },
    { alpha2: 'DJ', name: 'Djibouti' },
    { alpha2: 'DM', name: 'Dominica' },
    { alpha2: 'DO', name: 'Dominican Republic' },
    { alpha2: 'EC', name: 'Ecuador' },
    { alpha2: 'EG', name: 'Egypt' },
    { alpha2: 'SV', name: 'El Salvador' },
    { alpha2: 'GQ', name: 'Equatorial Guinea' },
    { alpha2: 'ER', name: 'Eritrea' },
    { alpha2: 'EE', name: 'Estonia' },
    { alpha2: 'ET', name: 'Ethiopia' },
    { alpha2: 'FJ', name: 'Fiji' },
    { alpha2: 'FI', name: 'Finland' },
    { alpha2: 'FR', name: 'France' },
    { alpha2: 'GA', name: 'Gabon' },
    { alpha2: 'GM', name: 'Gambia' },
    { alpha2: 'GE', name: 'Georgia' },
    { alpha2: 'DE', name: 'Germany' },
    { alpha2: 'GH', name: 'Ghana' },
    { alpha2: 'GR', name: 'Greece' },
    { alpha2: 'GD', name: 'Grenada' },
    { alpha2: 'GT', name: 'Guatemala' },
    { alpha2: 'GN', name: 'Guinea' },
    { alpha2: 'GW', name: 'Guinea-Bissau' },
    { alpha2: 'GY', name: 'Guyana' },
    { alpha2: 'HT', name: 'Haiti' },
    { alpha2: 'HN', name: 'Honduras' },
    { alpha2: 'HU', name: 'Hungary' },
    { alpha2: 'IS', name: 'Iceland' },
    { alpha2: 'IN', name: 'India' },
    { alpha2: 'ID', name: 'Indonesia' },
    { alpha2: 'IR', name: 'Iran' },
    { alpha2: 'IQ', name: 'Iraq' },
    { alpha2: 'IE', name: 'Ireland' },
    { alpha2: 'IL', name: 'Israel' },
    { alpha2: 'IT', name: 'Italy' },
    { alpha2: 'JM', name: 'Jamaica' },
    { alpha2: 'JP', name: 'Japan' },
    { alpha2: 'JO', name: 'Jordan' },
    { alpha2: 'KZ', name: 'Kazakhstan' },
    { alpha2: 'KE', name: 'Kenya' },
    { alpha2: 'KI', name: 'Kiribati' },
    { alpha2: 'KP', name: 'Korea (North)' },
    { alpha2: 'KR', name: 'Korea (South)' },
    { alpha2: 'KW', name: 'Kuwait' },
    { alpha2: 'KG', name: 'Kyrgyzstan' },
    { alpha2: 'LA', name: 'Laos' },
    { alpha2: 'LV', name: 'Latvia' },
    { alpha2: 'LB', name: 'Lebanon' },
    { alpha2: 'LS', name: 'Lesotho' },
    { alpha2: 'LR', name: 'Liberia' },
    { alpha2: 'LY', name: 'Libya' },
    { alpha2: 'LI', name: 'Liechtenstein' },
    { alpha2: 'LT', name: 'Lithuania' },
    { alpha2: 'LU', name: 'Luxembourg' },
    { alpha2: 'MK', name: 'Macedonia' },
    { alpha2: 'MG', name: 'Madagascar' },
    { alpha2: 'MW', name: 'Malawi' },
    { alpha2: 'MY', name: 'Malaysia' },
    { alpha2: 'MV', name: 'Maldives' },
    { alpha2: 'ML', name: 'Mali' },
    { alpha2: 'MT', name: 'Malta' },
    { alpha2: 'MH', name: 'Marshall Islands' },
    { alpha2: 'MR', name: 'Mauritania' },
    { alpha2: 'MU', name: 'Mauritius' },
    { alpha2: 'MX', name: 'Mexico' },
    { alpha2: 'FM', name: 'Micronesia' },
    { alpha2: 'MD', name: 'Moldova' },
    { alpha2: 'MC', name: 'Monaco' },
    { alpha2: 'MN', name: 'Mongolia' },
    { alpha2: 'ME', name: 'Montenegro' },
    { alpha2: 'MA', name: 'Morocco' },
    { alpha2: 'MZ', name: 'Mozambique' },
    { alpha2: 'MM', name: 'Myanmar' },
    { alpha2: 'NA', name: 'Namibia' },
    { alpha2: 'NR', name: 'Nauru' },
    { alpha2: 'NP', name: 'Nepal' },
    { alpha2: 'NL', name: 'Netherlands' },
    { alpha2: 'NZ', name: 'New Zealand' },
    { alpha2: 'NI', name: 'Nicaragua' },
    { alpha2: 'NE', name: 'Niger' },
    { alpha2: 'NG', name: 'Nigeria' },
    { alpha2: 'NO', name: 'Norway' },
    { alpha2: 'OM', name: 'Oman' },
    { alpha2: 'PK', name: 'Pakistan' },
    { alpha2: 'PW', name: 'Palau' },
    { alpha2: 'PA', name: 'Panama' },
    { alpha2: 'PG', name: 'Papua New Guinea' },
    { alpha2: 'PY', name: 'Paraguay' },
    { alpha2: 'PE', name: 'Peru' },
    { alpha2: 'PH', name: 'Philippines' },
    { alpha2: 'PL', name: 'Poland' },
    { alpha2: 'PT', name: 'Portugal' },
    { alpha2: 'QA', name: 'Qatar' },
    { alpha2: 'RO', name: 'Romania' },
    { alpha2: 'RU', name: 'Russia' },
    { alpha2: 'RW', name: 'Rwanda' },
    { alpha2: 'KN', name: 'Saint Kitts and Nevis' },
    { alpha2: 'LC', name: 'Saint Lucia' },
    { alpha2: 'VC', name: 'Saint Vincent and the Grenadines' },
    { alpha2: 'WS', name: 'Samoa' },
    { alpha2: 'SM', name: 'San Marino' },
    { alpha2: 'ST', name: 'Sao Tome and Principe' },
    { alpha2: 'SA', name: 'Saudi Arabia' },
    { alpha2: 'SN', name: 'Senegal' },
    { alpha2: 'RS', name: 'Serbia' },
    { alpha2: 'SC', name: 'Seychelles' },
    { alpha2: 'SL', name: 'Sierra Leone' },
    { alpha2: 'SG', name: 'Singapore' },
    { alpha2: 'SK', name: 'Slovakia' },
    { alpha2: 'SI', name: 'Slovenia' },
    { alpha2: 'SB', name: 'Solomon Islands' },
    { alpha2: 'SO', name: 'Somalia' },
    { alpha2: 'ZA', name: 'South Africa' },
    { alpha2: 'ES', name: 'Spain' },
    { alpha2: 'LK', name: 'Sri Lanka' },
    { alpha2: 'SD', name: 'Sudan' },
    { alpha2: 'SR', name: 'Suriname' },
    { alpha2: 'SZ', name: 'Swaziland' },
    { alpha2: 'SE', name: 'Sweden' },
    { alpha2: 'CH', name: 'Switzerland' },
    { alpha2: 'SY', name: 'Syria' },
    { alpha2: 'TW', name: 'Taiwan' },
    { alpha2: 'TJ', name: 'Tajikistan' },
    { alpha2: 'TZ', name: 'Tanzania' },
    { alpha2: 'TH', name: 'Thailand' },
    { alpha2: 'TG', name: 'Togo' },
    { alpha2: 'TO', name: 'Tonga' },
    { alpha2: 'TT', name: 'Trinidad and Tobago' },
    { alpha2: 'TN', name: 'Tunisia' },
    { alpha2: 'TR', name: 'Turkey' },
    { alpha2: 'TM', name: 'Turkmenistan' },
    { alpha2: 'TV', name: 'Tuvalu' },
    { alpha2: 'UG', name: 'Uganda' },
    { alpha2: 'UA', name: 'Ukraine' },
    { alpha2: 'AE', name: 'United Arab Emirates' },
    { alpha2: 'GB', name: 'United Kingdom' },
    { alpha2: 'US', name: 'United States' },
    { alpha2: 'UY', name: 'Uruguay' },
    { alpha2: 'UZ', name: 'Uzbekistan' },
    { alpha2: 'VU', name: 'Vanuatu' },
    { alpha2: 'VA', name: 'Vatican City' },
    { alpha2: 'VE', name: 'Venezuela' },
    { alpha2: 'VN', name: 'Vietnam' },
    { alpha2: 'YE', name: 'Yemen' },
    { alpha2: 'ZM', name: 'Zambia' },
    { alpha2: 'ZW', name: 'Zimbabwe' },
  ];
}

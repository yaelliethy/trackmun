import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  unique,
} from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// Core Users Table
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    name: text('name').notNull(), // Computed: firstName + lastName
    role: text('role', { enum: ['delegate', 'oc', 'chair', 'admin'] }).notNull().default('delegate'),
    registrationStatus: text('registration_status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
    council: text('council'),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    image: text('image'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  },
  (table) => ({
    emailIdx: index('idx_email').on(table.email),
    roleIdx: index('idx_role').on(table.role),
    registrationStatusIdx: index('idx_registration_status').on(table.registrationStatus),
  })
);

// Impersonation Log
export const impersonationLog = sqliteTable(
  'impersonation_log',
  {
    id: text('id').primaryKey(),
    adminId: text('admin_id').notNull().references(() => users.id),
    targetId: text('target_id').notNull().references(() => users.id),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
  },
  (table) => ({
    adminIdIdx: index('idx_admin').on(table.adminId),
    targetIdIdx: index('idx_target').on(table.targetId),
  })
);

// Delegate Profiles
export const delegateProfiles = sqliteTable('delegate_profiles', {
  userId: text('user_id').primaryKey().references(() => users.id),
  identifier: text('identifier').unique(), // e.g. SC-001, GA-042 — assigned on approval
  year: text('year'),
  country: text('country'),
  pressAgency: text('press_agency'),
  firstChoice: text('first_choice'),
  secondChoice: text('second_choice'),
  currentPreferenceTracker: integer('current_preference_tracker').notNull().default(1),
  awards: text('awards').default('[]'), // JSON array
  depositAmount: integer('deposit_amount'),
  fullAmount: integer('full_amount'),
  depositPaymentStatus: text('deposit_payment_status', { enum: ['pending', 'paid'] }).notNull().default('pending'),
  fullPaymentStatus: text('full_payment_status', { enum: ['pending', 'paid'] }).notNull().default('pending'),
  paymentProofR2Key: text('payment_proof_r2_key'),
});

// Councils (managed by admin; referenced by user.council as committee name)
export const councils = sqliteTable(
  'councils',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    shortName: text('short_name'), // e.g. 'SC', 'GA' — used in delegate identifiers
    capacity: integer('capacity'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  },
  (table) => ({
    nameIdx: index('idx_councils_name').on(table.name),
  })
);

// Registration Settings
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

// Registration Steps
export const registrationSteps = sqliteTable('registration_steps', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  order: integer('order').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

// Registration Questions
export const registrationQuestions = sqliteTable('registration_questions', {
  id: text('id').primaryKey(),
  stepId: text('step_id').notNull().references(() => registrationSteps.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  type: text('type', { enum: ['text', 'long_text', 'choices', 'dropdown', 'council_preference'] }).notNull(),
  options: text('options'), // JSON array
  required: integer('required', { mode: 'boolean' }).notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  councilPreferenceCount: integer('council_preference_count').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (table) => ({
  stepIdx: index('idx_req_questions_step').on(table.stepId)
}));

// Delegate Answers
export const delegateAnswers = sqliteTable('delegate_answers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => registrationQuestions.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (table) => ({
  userQuestionIdx: unique().on(table.userId, table.questionId),
  userIdx: index('idx_delegate_answers_user').on(table.userId)
}));


// Attendance Records
export const attendanceRecords = sqliteTable(
  'attendance_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    scannedBy: text('scanned_by').notNull().references(() => users.id),
    sessionLabel: text('session_label'),
    scannedAt: integer('scanned_at').notNull().default(Math.floor(Date.now() / 1000)),
  },
  (table) => ({
    userIdIdx: index('idx_attendance_user').on(table.userId),
    sessionIdx: index('idx_attendance_session').on(table.sessionLabel, table.scannedAt),
    userSessionUnique: unique().on(table.userId, table.sessionLabel),
  })
);

// Benefit Redemptions
export const benefitRedemptions = sqliteTable(
  'benefit_redemptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    scannedBy: text('scanned_by').notNull().references(() => users.id),
    benefitType: text('benefit_type').notNull(),
    redeemedAt: integer('redeemed_at').notNull().default(Math.floor(Date.now() / 1000)),
  },
  (table) => ({
    userBenefitUnique: unique().on(table.userId, table.benefitType),
  })
);

// Country Assignments
export const countryAssignments = sqliteTable(
  'country_assignments',
  {
    id: text('id').primaryKey(),
    council: text('council').notNull(),
    userId: text('user_id').notNull().references(() => users.id),
    country: text('country').notNull(),
    assignedBy: text('assigned_by').notNull().references(() => users.id),
    assignedAt: integer('assigned_at').notNull().default(Math.floor(Date.now() / 1000)),
  },
  (table) => ({
    councilUserUnique: unique().on(table.council, table.userId),
  })
);

// Awards
export const awards = sqliteTable('awards', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  council: text('council').notNull(),
  awardType: text('award_type').notNull(),
  givenBy: text('given_by').notNull().references(() => users.id),
  notes: text('notes'),
  givenAt: integer('given_at').notNull().default(Math.floor(Date.now() / 1000)),
});

// QR (legacy tables; still referenced on user delete)
export const qrTokens = sqliteTable(
  'qr_tokens',
  {
    token: text('token').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    purpose: text('purpose').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull().default(Math.floor(Date.now() / 1000)),
  },
  (table) => ({
    userIdx: index('idx_user').on(table.userId),
    expiresIdx: index('idx_expires').on(table.expiresAt),
  })
);

export const qrScanLog = sqliteTable('qr_scan_log', {
  id: text('id').primaryKey(),
  token: text('token').notNull(),
  scannedBy: text('scanned_by').notNull().references(() => users.id),
  result: text('result').notNull(),
  scannedAt: integer('scanned_at').notNull().default(Math.floor(Date.now() / 1000)),
});

// Press Posts
export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey(),
    authorId: text('author_id').notNull().references(() => users.id),
    body: text('body').notNull(),
    createdAt: integer('created_at').notNull().default(Math.floor(Date.now() / 1000)),
    updatedAt: integer('updated_at'),
  },
  (table) => ({
    feedIdx: index('idx_posts_feed').on(table.createdAt),
    authorIdx: index('idx_posts_author').on(table.authorId),
  })
);

// Post Media
export const postMedia = sqliteTable(
  'post_media',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id),
    mediaType: text('media_type', { enum: ['image', 'video'] }).notNull(),
    r2Key: text('r2_key').notNull(),
    displayOrder: integer('display_order').notNull().default(0),
  },
  () => ({})
);

// Post Likes
export const postLikes = sqliteTable(
  'post_likes',
  {
    postId: text('post_id').notNull().references(() => posts.id),
    userId: text('user_id').notNull().references(() => users.id),
    likedAt: integer('liked_at').notNull().default(Math.floor(Date.now() / 1000)),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.userId] }),
    likesIdx: index('idx_likes_post').on(table.postId),
  })
);

// Post Replies
export const postReplies = sqliteTable(
  'post_replies',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id),
    authorId: text('author_id').notNull().references(() => users.id),
    body: text('body').notNull(),
    createdAt: integer('created_at').notNull().default(Math.floor(Date.now() / 1000)),
  },
  (table) => ({
    repliesIdx: index('idx_replies_post').on(table.postId, table.createdAt),
  })
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  adminImpersonations: many(impersonationLog, {
    relationName: 'admin_impersonations',
  }),
  targetImpersonations: many(impersonationLog, {
    relationName: 'target_impersonations',
  }),
  delegateProfile: one(delegateProfiles, {
    fields: [users.id],
    references: [delegateProfiles.userId],
  }),
  attendanceRecords: many(attendanceRecords, {
    relationName: 'user_attendance',
  }),
  benefitRedemptions: many(benefitRedemptions, {
    relationName: 'user_benefits',
  }),
  awards: many(awards, {
    relationName: 'user_awards',
  }),
  posts: many(posts),
  postLikes: many(postLikes),
  delegateAnswers: many(delegateAnswers),
}));

export const registrationStepsRelations = relations(registrationSteps, ({ many }) => ({
  questions: many(registrationQuestions),
}));

export const registrationQuestionsRelations = relations(registrationQuestions, ({ one, many }) => ({
  step: one(registrationSteps, {
    fields: [registrationQuestions.stepId],
    references: [registrationSteps.id],
  }),
  answers: many(delegateAnswers),
}));

export const delegateAnswersRelations = relations(delegateAnswers, ({ one }) => ({
  user: one(users, {
    fields: [delegateAnswers.userId],
    references: [users.id],
  }),
  question: one(registrationQuestions, {
    fields: [delegateAnswers.questionId],
    references: [registrationQuestions.id],
  }),
}));

export const impersonationLogRelations = relations(impersonationLog, ({ one }) => ({
  admin: one(users, {
    fields: [impersonationLog.adminId],
    references: [users.id],
    relationName: 'admin_impersonations',
  }),
  target: one(users, {
    fields: [impersonationLog.targetId],
    references: [users.id],
    relationName: 'target_impersonations',
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  media: many(postMedia),
  likes: many(postLikes),
  replies: many(postReplies),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postLikes.userId],
    references: [users.id],
  }),
}));

// better-auth tables
// Removed for Supabase migration

// Admin Features

export const benefits = sqliteTable('benefits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const conferenceDays = sqliteTable('conference_days', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default('Unnamed Day'),
  date: text('date').notNull(), // e.g. '2026-03-25'
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const attendancePeriods = sqliteTable('attendance_periods', {
  id: text('id').primaryKey(),
  dayId: text('day_id').notNull().references(() => conferenceDays.id, { onDelete: 'cascade' }),
  startTime: text('start_time').notNull(), // e.g. '09:00'
  endTime: text('end_time').notNull(), // e.g. '11:00'
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (table) => ({
  dayIdx: index('idx_attendance_periods_day').on(table.dayId),
}));

export const conferenceDaysRelations = relations(conferenceDays, ({ many }) => ({
  periods: many(attendancePeriods),
}));

export const attendancePeriodsRelations = relations(attendancePeriods, ({ one }) => ({
  day: one(conferenceDays, {
    fields: [attendancePeriods.dayId],
    references: [conferenceDays.id],
  }),
}));

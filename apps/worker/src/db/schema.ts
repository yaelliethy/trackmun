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
    name: text('name').notNull(),
    role: text('role', { enum: ['delegate', 'oc', 'chair', 'admin'] }).notNull().default('delegate'),
    council: text('council'),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    image: text('image'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  },
  (table) => ({
    emailIdx: index('idx_email').on(table.email),
    roleIdx: index('idx_role').on(table.role),
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
  year: text('year'),
  country: text('country'),
  pressAgency: text('press_agency'),
  awards: text('awards').default('[]'), // JSON array
});

// QR Tokens
export const qrTokens = sqliteTable(
  'qr_tokens',
  {
    token: text('token').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    purpose: text('purpose', { enum: ['attendance', 'benefit'] }).notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull().default(Math.floor(Date.now() / 1000)),
  },
  (table) => ({
    userIdIdx: index('idx_user').on(table.userId),
    expiresAtIdx: index('idx_expires').on(table.expiresAt),
  })
);

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

// QR Scan Log
export const qrScanLog = sqliteTable(
  'qr_scan_log',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull(),
    scannedBy: text('scanned_by').notNull().references(() => users.id),
    result: text('result', {
      enum: ['valid', 'expired', 'already_used', 'invalid_sig'],
    }).notNull(),
    scannedAt: integer('scanned_at').notNull().default(Math.floor(Date.now() / 1000)),
  }
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
  qrTokens: many(qrTokens),
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
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const jwkss = sqliteTable('jwkss', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

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

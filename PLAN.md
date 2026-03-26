---

## MUN Platform — Full Development Roadmap

**Stack**: React + shadcn/ui · Cloudflare Workers · Turso (libSQL) · R2
**Primary**: `#04316c` · **Secondary**: White · **Style**: Mobile-first, minimal

------

## Phase 0 — Project Setup
**Difficulty**: Easy | **Duration**: 1–2 days | **No dependencies**

**Goals**: Everything needed to start coding without friction. Get the monorepo, tooling, and Cloudflare/Turso resources bootstrapped.

**Repo structure**:
```
/
├── apps/
│   ├── web/          ← React + shadcn/ui frontend (Vite)
│   └── worker/       ← Cloudflare Worker (Hono + Zod OpenAPI)
├── packages/
│   └── shared/       ← Shared types, schemas, constants
├── apps/worker/migrations/  ← SQL migrations (numbered: 0001_init.sql …)
├── wrangler.toml
└── package.json      ← pnpm workspace root
```

**Technical tasks**:
- Initialize pnpm workspace with TypeScript project references
- Configure ESLint + Prettier (shared config in `packages/`)
- Set up Wrangler and authenticate with Cloudflare account
- Create Turso database via Turso CLI (`turso db create trackmun`)
- Create R2 bucket via `wrangler r2 bucket create mun-media`
- Bind R2 in `wrangler.toml`; Turso via env vars (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`)
- Write the base schema migration (all tables up front — see Phase 1)
- Set up GitHub Actions for lint + type-check on PRs

**Deliverables**: `wrangler dev` runs with Worker + Turso + R2 bindings wired. `pnpm dev` runs the React app. CI passes.

---

## Phase 1 — Core Backend Foundation
**Difficulty**: Medium | **Duration**: 3–5 days | **No dependencies**

**Goals**: Auth and RBAC that every other phase depends on. Get this right — it's foundational.

**Database schema (write all tables in migration 0001)**:
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('delegate','oc','chair','admin')),
  registration_status TEXT NOT NULL DEFAULT 'pending' CHECK(registration_status IN ('pending','approved','rejected')),
  council TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE impersonation_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES users(id),
  target_id TEXT NOT NULL REFERENCES users(id),
  started_at INTEGER NOT NULL,
  ended_at INTEGER
);
```

**Auth strategy**: Use **Better Auth** for identity. Email/password authentication with JWT plugin. User roles and registration status stored in Turso.

**Technical tasks**:
- Build router using **Hono** with Zod OpenAPI
- Better Auth integration with Drizzle adapter
- `GET /auth/me` — returns current user with role/council/registrationStatus from Turso
- RBAC middleware: `requireRole(...roles)` — attach to protected routes
- Admin impersonation: `POST /auth/admin/impersonate/:userId` signs a custom HMAC JWT; `POST /auth/admin/unimpersonate` clears it. All impersonated actions write to `impersonation_log`
- Error handling middleware with consistent JSON error format: `{ success: false, error: string, code?: string }`
- Environment validation (Better Auth Secret, Impersonation Secret, Turso credentials)

**Critical path task**: The `requireRole` middleware. Everything in Phases 2–5 calls it.

**Deliverables**: Auth endpoints functional. Postman/curl tests pass. Role enforcement works across all four roles.

---

## Phase 2 — Delegate Registration System
**Difficulty**: Medium | **Duration**: 3–4 days | **Depends on**: Phase 1

**Goals**: Delegates can register with email verification, committee choices, and pending admin approval.

**New migrations**:
```sql
CREATE TABLE delegate_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  year TEXT,
  country TEXT,
  press_agency TEXT,
  first_choice TEXT,
  second_choice TEXT,
  awards TEXT DEFAULT '[]'   -- JSON array
);

CREATE TABLE qr_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  purpose TEXT NOT NULL CHECK(purpose IN ('attendance','benefit')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

**Registration flow**:
1. Delegate fills registration form (firstName, lastName, email, password, firstChoice, secondChoice)
2. Account created with `registration_status = 'pending'`
3. Email verification sent via Better Auth
4. Delegate sees "Request submitted" success page
5. Admin reviews and approves/rejects via admin panel (TODO)

**QR code strategy**: Generate a signed HMAC token: `base64(userId + purpose + timestamp + expiry)` + HMAC signature using a separate `QR_SECRET` Worker secret. Store in `qr_tokens` table. The QR code itself is generated **client-side** (use `qrcode.react`) — the backend only generates the token string.

**Technical tasks**:
- `POST /auth/register` — public registration endpoint with validation
- `GET /auth/register/success` — success page route
- `GET /profile` — return full delegate profile (requires approved status)
- `PATCH /profile` — update name, year (email changes require re-verification)
- `POST /profile/qr` — generate signed QR token (one per purpose per user)
- Email integration: use **Brevo** (300 emails/day free tier) for verification and welcome emails
- Input validation with **Zod** (share schemas between `apps/worker` and `apps/web`)

**What to defer**: 
- Profile photo uploads — do in Phase 6 when R2 is set up
- Admin approval UI — backend ready, frontend TODO

**Deliverables**: Delegate registers, receives verification email, sees success page. Account pending admin approval.

---

## Phase 3 — QR Scanning System
**Difficulty**: Hard | **Duration**: 4–5 days | **Depends on**: Phase 2

**Goals**: OC members scan QR codes, attendance and benefits are recorded, abuse is prevented.

**New migrations**:
```sql
CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  scanned_by TEXT NOT NULL REFERENCES users(id),
  session_label TEXT,
  scanned_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE benefit_redemptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  scanned_by TEXT NOT NULL REFERENCES users(id),
  benefit_type TEXT NOT NULL,
  redeemed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, benefit_type)
);

CREATE TABLE qr_scan_log (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  scanned_by TEXT NOT NULL REFERENCES users(id),
  result TEXT NOT NULL CHECK(result IN ('valid','expired','already_used','invalid_sig')),
  scanned_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

**Validation logic** (run in this exact order):
1. Decode and verify HMAC signature — if invalid, reject immediately, log `invalid_sig`
2. Check `expires_at` — if past, reject with `expired`
3. Check `qr_tokens` table to confirm token exists and isn't revoked
4. For attendance: check if this user already has a record for today's session
5. For benefits: check `UNIQUE` constraint on `benefit_redemptions`
6. If all pass: write record, log `valid`

**Anti-abuse protections**:
- **Replay protection**: Once a benefit QR is scanned successfully, delete or revoke the token in `qr_tokens`. Attendance QRs are session-scoped.
- **Rate limiting**: Use Cloudflare Workers rate limiting. Limit `/scan/*` endpoints to 30 req/min per OC user.
- **OC-only middleware**: All scan endpoints require `role = 'oc'` or `role = 'admin'`

**Technical tasks**:
- `POST /scan/attendance` — body: `{ token, sessionLabel }`
- `POST /scan/benefit` — body: `{ token, benefitType }`
- `GET /scan/history` (OC) — paginated log of recent scans
- `GET /delegates/:id/attendance` (Chair/Admin) — attendance summary per delegate
- Mobile-optimized scanning: frontend uses `@zxing/browser` for camera-based QR reading

**Critical path task**: The HMAC verification logic. Write it once in `packages/shared` and import from both Worker and any test files.

**Deliverables**: OC can open a scan page on mobile, scan a delegate QR, see immediate success/failure feedback. Duplicate scans are rejected.

---

## Phase 4 — Chair & Admin Features
**Difficulty**: Medium | **Duration**: 3–4 days | **Depends on**: Phase 2

**Goals**: Chairs manage their council. Admins control everything, approve registrations, and can impersonate.

**New migrations**:
```sql
CREATE TABLE country_assignments (
  id TEXT PRIMARY KEY,
  council TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  country TEXT NOT NULL,
  assigned_by TEXT NOT NULL REFERENCES users(id),
  assigned_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(council, user_id)
);

CREATE TABLE awards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  council TEXT NOT NULL,
  award_type TEXT NOT NULL,
  given_by TEXT NOT NULL REFERENCES users(id),
  notes TEXT,
  given_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

**Chair endpoints** (require `role = 'chair'`, scoped to their council):
- `GET /council/delegates` — list all delegates in chair's council
- `POST /council/assign-country` — body: `{ userId, country }`
- `POST /council/award` — body: `{ userId, awardType, notes }`
- `DELETE /council/country-assignment/:id` — reassign if needed

**Admin endpoints** (require `role = 'admin'`):
- `GET /admin/users` — full user list with filters (role, council, registrationStatus, search)
- `PATCH /admin/users/:id/status` — approve/reject registration (TODO)
- `POST /admin/users` — create any user (bypass normal registration)
- `PATCH /admin/users/:id` — edit any user including role
- `POST /auth/admin/impersonate/:userId` — returns a new JWT with `acting_as` claim
- `POST /auth/admin/unimpersonate` — clear impersonation
- `GET /admin/impersonation-log` — audit trail of all impersonations
- `GET /admin/stats` — attendance counts, benefit redemptions, award counts

**Important**: Chair can only see and modify their own council. Enforce this by storing `council` in the JWT at login.

**Deliverables**: Chair can log in, see their delegates, assign countries, give awards. Admin can view all users, approve/reject registrations, impersonate any account (with logged trail).

---

## Phase 5 — Press / Social Feed
**Difficulty**: Medium | **Duration**: 4–5 days | **Depends on**: Phase 1

**Goals**: A clean social feed for press delegates. Posts, likes, one-level replies.

**New migrations**:
```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER
);

CREATE TABLE post_media (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  media_type TEXT NOT NULL CHECK(media_type IN ('image','video')),
  r2_key TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  CHECK(display_order < 2)
);

CREATE TABLE post_likes (
  post_id TEXT NOT NULL REFERENCES posts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  liked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(post_id, user_id)
);

CREATE TABLE post_replies (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

**R2 presigned upload flow**:
1. Client calls `POST /media/upload-url` → body: `{ mimeType, size }`
2. Worker validates and generates presigned PUT URL (5-min expiry)
3. Client uploads directly to R2
4. Client calls `POST /posts` with `r2Key` — Worker verifies object exists

**Endpoints**:
- `GET /feed` — cursor-based pagination (20 posts/page)
- `POST /posts` — create post with optional media
- `DELETE /posts/:id` — author or admin only
- `POST /posts/:id/like` / `DELETE /posts/:id/like`
- `GET /posts/:id/replies` / `POST /posts/:id/replies`

**Deliverables**: Feed renders with real posts. Media uploads work. Likes update without page refresh.

---

## Phase 6 — Frontend Implementation
**Difficulty**: Hard | **Duration**: 7–10 days | **Depends on**: Phases 1–5

**Goals**: Complete, responsive React UI for all four roles.

**Setup**:
- Vite + React + TypeScript
- **shadcn/ui** for components
- **React Query** for API calls
- **React Router v7** for routing
- **Zustand** for auth state

**Route structure**:
```
/login                    → all
/register                 → public
/register/success         → public (post-registration)
/profile                  → delegate (approved only)
/profile/qr               → delegate
/feed                     → all authenticated
/scan                     → oc, admin
/council                  → chair, admin
/admin                    → admin
```

**Mobile-first rules**:
- All pages work on 375px viewport first
- Bottom nav bar on mobile
- Sidebar on desktop (lg breakpoint)

**Deliverables**: All four roles have functional UIs. App is usable on a phone.

---

## Phase 7 — Performance & Scaling
**Difficulty**: Medium | **Duration**: 2–3 days | **Depends on**: Phase 6

**Goals**: Fast under load (hundreds of concurrent users).

**Turso query optimisation**:
```sql
CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_attendance_session ON attendance_records(session_label, scanned_at);
CREATE INDEX idx_posts_feed ON posts(created_at DESC);
CREATE INDEX idx_users_registration ON users(registration_status);
```

**Caching strategy**:
- Cloudflare Cache API for public feed (TTL: 30s)
- React Query `staleTime: 30_000` for authenticated data
- R2 media: `Cache-Control: public, max-age=31536000, immutable`

**Deliverables**: Feed loads < 1s. QR scan validates < 200ms.

---

## Phase 8 — Security Hardening
**Difficulty**: Hard | **Duration**: 3–4 days | **Depends on**: Phase 6

**Goals**: Production-safe security.

**Rate limiting**:
| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 10/min per IP |
| `POST /scan/*` | 30/min per OC user |
| `POST /posts` | 20/hour per user |

**QR security**:
- HMAC secret rotation
- Token expiry (attendance: session; benefits: 7 days)
- One-time benefit tokens

**Deliverables**: Zod validation everywhere. Rate limits active. No replay attacks.

---

## Phase 9 — Testing & Deployment
**Difficulty**: Medium | **Duration**: 3–5 days | **Depends on**: Phase 8

**Testing strategy**:
- **Unit tests** (vitest): HMAC logic, schemas, utilities
- **Integration tests**: Full auth flow, QR validation
- **E2E tests** (Playwright): Happy path per role

**Environments**:
```toml
# wrangler.toml
[env.staging]
name = "trackmun-worker-staging"

[env.production]
name = "trackmun-worker"
```

**Pre-launch checklist**:
- [ ] Turso credentials set as secrets
- [ ] R2 CORS configured
- [ ] Brevo sender verified
- [ ] Admin account created

**Deliverables**: CI/CD pipeline. One-click deploy.

---

## Phase 10 — Advanced Features (Optional)

- Live attendance dashboard (Cron + stats snapshot)
- Push notifications (Web Push API)
- Bulk CSV import for delegates

---

## Critical Path Summary

**Critical**: P0 → P1 → P2 → P3 → P9

**Parallelizable**:
- P3 (QR) and P4 (Admin) can run simultaneously
- P5 (Press) independent after P1
- P6 (Frontend) page-by-page as APIs land

**Common time sinks**: QR replay logic (P3), R2 CORS (P5), camera permissions (P6).
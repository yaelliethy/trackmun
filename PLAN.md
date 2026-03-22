---

## MUN Platform — Full Development Roadmap

**Stack**: React + HeroUI · Cloudflare Workers · D1 · R2
**Primary**: `#04316c` · **Secondary**: White · **Style**: Mobile-first, minimal

------

## Phase 0 — Project Setup
**Difficulty**: Easy | **Duration**: 1–2 days | **No dependencies**

**Goals**: Everything needed to start coding without friction. Get the monorepo, tooling, and Cloudflare resources bootstrapped.

**Repo structure**:
```
/
├── apps/
│   ├── web/          ← React + HeroUI frontend (Vite)
│   └── worker/       ← Cloudflare Worker (Hono or itty-router)
├── packages/
│   └── shared/       ← Shared types, schemas, constants
├── migrations/       ← D1 SQL migrations (numbered: 0001_init.sql …)
├── wrangler.toml
└── package.json      ← pnpm workspace root
```

**Technical tasks**:
- Initialize pnpm workspace with TypeScript project references
- Configure ESLint + Prettier (shared config in `packages/`)
- Set up Wrangler and authenticate with Cloudflare account
- Create D1 database via `wrangler d1 create mun-db`
- Create R2 bucket via `wrangler r2 bucket create mun-media`
- Bind D1 and R2 in `wrangler.toml` (dev + prod environments)
- Write the base D1 schema migration (all tables up front — see Phase 1)
- Set up GitHub Actions for lint + type-check on PRs

**Deliverables**: `wrangler dev` runs with Worker + D1 + R2 bindings wired. `pnpm dev` runs the React app. CI passes.

---

## Phase 1 — Core Backend Foundation
**Difficulty**: Medium | **Duration**: 3–5 days | **Depends on**: Phase 0

**Goals**: Auth and RBAC that every other phase depends on. Get this right — it's foundational.

**Database schema (write all tables in migration 0001)**:
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('delegate','oc','chair','admin')),
  council TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
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

**Auth strategy**: Use short-lived JWTs (1 hour) + refresh tokens stored in D1 `sessions` table. Sign with `crypto.subtle` (available in Workers, no libraries needed). **Do not use third-party auth services** — you need admin impersonation, which requires owning the token lifecycle.

**Technical tasks**:
- Build router using **Hono** (best-in-class for Workers — typed middleware, zero deps)
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- JWT signing and verification via `crypto.subtle` (HMAC-SHA256, store secret in Worker secret)
- RBAC middleware: `requireRole(...roles)` — attach to every protected route
- `GET /me` — returns current user (used by frontend everywhere)
- Admin impersonation: `POST /admin/impersonate/:userId` sets a secondary JWT claim `acting_as`; `POST /admin/unimpersonate` clears it. All impersonated actions write to `impersonation_log`
- Error handling middleware with consistent JSON error format: `{ error: string, code: string }`
- Environment validation (fail fast if secrets missing)

**Critical path task**: The `requireRole` middleware. Everything in Phases 2–5 calls it.

**Deliverables**: Auth endpoints functional. Postman/curl tests pass. Role enforcement works across all four roles.

---

## Phase 2 — Delegate System
**Difficulty**: Medium | **Duration**: 3–4 days | **Depends on**: Phase 1

**Goals**: Delegates can register, have profiles, receive QR codes, and get emails.

**New migrations**:
```sql
CREATE TABLE delegate_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  year TEXT,
  country TEXT,
  press_agency TEXT,
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

**QR code strategy**: Generate a signed HMAC token: `base64(userId + purpose + timestamp + expiry)` + HMAC signature using a separate `QR_SECRET` Worker secret. Store in `qr_tokens` table. The QR code itself is generated **client-side** (use `qrcode.react`) — the backend only generates the token string.

**Technical tasks**:
- `GET /profile` — return full delegate profile
- `PATCH /profile` — update name, year (email changes require re-verification, skip for now)
- `POST /profile/qr` — generate signed QR token (one per purpose per user), return token string
- Email integration: use **Resend** (has a free tier, REST API, works fine from Workers). Send welcome email on registration with QR code embedded as a link
- `GET /profile/qr` — return current active QR token (regenerate if expired)
- Input validation with **Zod** (share schemas between `apps/worker` and `apps/web`)

**What to defer**: Profile photo uploads — do in Phase 6 when R2 is set up for press media.

**Deliverables**: Delegate registers, gets a welcome email, sees their QR code on their profile page.

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
  UNIQUE(user_id, benefit_type)  -- one redemption per benefit type per delegate
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
- **Replay protection**: Once a benefit QR is scanned successfully, delete or revoke the token in `qr_tokens`. Attendance QRs are session-scoped (include session label in HMAC payload), so the same QR can't be used for two sessions.
- **Rate limiting**: Use Cloudflare Workers rate limiting (built into the platform). Limit `/scan/*` endpoints to 30 req/min per OC user.
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
**Difficulty**: Medium | **Duration**: 3–4 days | **Depends on**: Phase 2 (can be done in parallel with Phase 3)

**Goals**: Chairs manage their council. Admins control everything and can impersonate.

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

**Chair endpoints** (require `role = 'chair'`, scoped to their council via JWT claim):
- `GET /council/delegates` — list all delegates in chair's council
- `POST /council/assign-country` — body: `{ userId, country }`
- `POST /council/award` — body: `{ userId, awardType, notes }`
- `DELETE /council/country-assignment/:id` — reassign if needed

**Admin endpoints** (require `role = 'admin'`):
- `GET /admin/users` — full user list with filters (role, council, search)
- `POST /admin/users` — create any user (bypass normal registration)
- `PATCH /admin/users/:id` — edit any user including role
- `POST /admin/impersonate/:userId` — returns a new JWT with `acting_as` claim; original admin identity preserved
- `POST /admin/unimpersonate` — clear impersonation
- `GET /admin/impersonation-log` — audit trail of all impersonations
- `GET /admin/stats` — attendance counts, benefit redemptions, award counts

**Important**: Chair can only see and modify their own council. Enforce this by storing `council` in the JWT at login. Chairs cannot access other councils' data even if they guess the endpoint.

**Deliverables**: Chair can log in, see their delegates, assign countries, give awards. Admin can view all users, impersonate any account (with logged trail), revert.

---

## Phase 5 — Press / Social Feed
**Difficulty**: Medium | **Duration**: 4–5 days | **Depends on**: Phase 1 (auth). Can start after Phase 1.

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
  CHECK(display_order < 2)  -- max 2 media per post
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
  -- No parent_reply_id — one level only, enforced by schema
);
```

**R2 presigned upload flow**:
1. Client calls `POST /media/upload-url` → body: `{ mimeType, size }`
2. Worker validates `mimeType` (allow: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`) and `size` (max 10MB images, 50MB video)
3. Worker generates an R2 presigned PUT URL with 5-minute expiry
4. Returns `{ uploadUrl, r2Key }` to client
5. Client uploads directly to R2 (not through the Worker)
6. Client calls `POST /posts` with the `r2Key` in the body — Worker writes `post_media` row only if the R2 object actually exists (check with `r2.head(key)`)

**Endpoints**:
- `GET /feed` — paginated (cursor-based, 20 posts per page), returns posts with author, like count, reply count, `liked_by_me`
- `POST /posts` — create post (body + optional media keys)
- `DELETE /posts/:id` — author or admin only
- `POST /posts/:id/like` / `DELETE /posts/:id/like`
- `GET /posts/:id/replies` — paginated
- `POST /posts/:id/replies`
- `DELETE /replies/:id` — author or admin only

**Pagination**: Use cursor-based (not offset). `cursor = last_post_created_at + last_post_id`. This handles real-time updates without duplicate/skipped posts.

**Deliverables**: Feed renders with real posts. Media uploads work. Likes update without page refresh. Replies are one level only, enforced in both schema and API.

---

## Phase 6 — Frontend Implementation
**Difficulty**: Hard | **Duration**: 7–10 days | **Depends on**: Phases 1–5 (but can start pages in parallel as APIs land)

**Goals**: Complete, responsive React UI for all four roles.

**Setup**:
- Vite + React + TypeScript
- **HeroUI** for components. Configure theme:
```ts
// tailwind.config.ts
heroui({
  themes: {
    light: {
      colors: {
        primary: { DEFAULT: "#04316c", foreground: "#ffffff" },
      }
    }
  }
})
```
- **React Query (TanStack Query)** for all API calls — handles caching, loading states, refetching
- **React Router v7** for routing
- **Zustand** for auth state (user, role, impersonation status)

**Route structure**:
```
/login                    → all
/register                 → public
/profile                  → delegate
/profile/qr               → delegate (full-screen QR for scanning)
/feed                     → all authenticated
/scan                     → oc, admin
/council                  → chair, admin
/council/awards           → chair, admin
/admin                    → admin
/admin/users              → admin
/admin/impersonate        → admin
```

**Key components to build** (in this order — simpler first):
1. `AuthProvider` + protected route HOC
2. `AppShell` — sidebar nav that renders different links per role
3. Login / Register pages
4. Delegate profile page + QR display (use `qrcode.react`)
5. Feed page — infinite scroll via React Query `useInfiniteQuery`
6. Post composer — text + media upload (drag-and-drop to R2)
7. Scan page — camera QR reader (`@zxing/browser`) + result toast
8. Council management table (Chair)
9. Award modal (Chair)
10. Admin user table with search + impersonation button
11. Admin impersonation banner (always visible when acting as someone else)

**Mobile-first rules**:
- All pages work on 375px viewport first
- Bottom nav bar on mobile (max 4 items, role-aware)
- Sidebar on desktop (lg breakpoint)
- Camera scan page is fullscreen on mobile

**What can be built in parallel with backend phases**:
- Login/Register (after Phase 1)
- Feed UI (after Phase 5)
- Scan UI (after Phase 3)
- Admin UI (after Phase 4)

**Deliverables**: All four roles have functional UIs. App is usable on a phone. No unstyled pages.

---

## Phase 7 — Performance & Scaling
**Difficulty**: Medium | **Duration**: 2–3 days | **Depends on**: Phase 6

**Goals**: The app stays fast under real conference load (hundreds of concurrent users, QR scans every few seconds).

**D1 query optimisation** — add these indexes in a new migration:
```sql
CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_attendance_session ON attendance_records(session_label, scanned_at);
CREATE INDEX idx_posts_feed ON posts(created_at DESC);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_replies_post ON post_replies(post_id, created_at);
CREATE INDEX idx_likes_post ON post_likes(post_id);
```

**Caching strategy**:
- Use **Cloudflare Cache API** inside Workers for public feed (`GET /feed` with no auth — or a public preview). TTL: 30 seconds.
- For authenticated feed: don't cache at edge — use React Query's `staleTime: 30_000` client-side
- R2 media: set `Cache-Control: public, max-age=31536000, immutable` on all uploaded media (content-addressed keys using hash)
- Stats endpoints (`/admin/stats`): cache in D1 as a materialized snapshot updated every 5 minutes via a Cron Trigger

**Cloudflare Cron Trigger** (in `wrangler.toml`):
```toml
[triggers]
crons = ["*/5 * * * *"]  # every 5 minutes
```
Worker handles `scheduled` event to recompute and store stats snapshot.

**Pagination audit**: Verify every list endpoint uses cursor-based pagination. No `OFFSET` queries.

**Deliverables**: Feed loads in under 1 second. QR scan validates in under 200ms. Admin stats page doesn't query live on every request.

---

## Phase 8 — Security Hardening
**Difficulty**: Hard | **Duration**: 3–4 days | **Depends on**: Phase 6

**Goals**: Production-safe security posture before going live.

**Input validation**: Every endpoint has a Zod schema. Validation runs before any DB query. On failure, return `400` with field-level errors. Schemas live in `packages/shared` — imported by both Worker (for validation) and React (for form validation).

**Rate limiting** (use Cloudflare's built-in Workers Rate Limiting API):
```ts
// wrangler.toml binding
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "1001"
simple = { limit = 30, period = 60 }

// In Worker
const { success } = await env.RATE_LIMITER.limit({ key: userId });
if (!success) return c.json({ error: 'Rate limit exceeded' }, 429);
```

Apply rate limits per endpoint category:

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 10/min per IP |
| `POST /scan/*` | 30/min per OC user |
| `POST /posts` | 20/hour per user |
| `POST /media/upload-url` | 10/min per user |

**QR security hardening**:
- HMAC secret rotation: store `QR_SECRET_V1`, `QR_SECRET_V2` — embed version in token, verify against appropriate secret
- QR expiry: attendance QRs expire after the conference day (midnight). Benefit QRs expire after redemption or 7 days
- One-time benefit tokens: delete from `qr_tokens` immediately after successful redemption
- Token entropy: use `crypto.getRandomValues()` for the nonce portion of the token

**Additional hardening**:
- CORS: lock `Access-Control-Allow-Origin` to your frontend domain only
- `Content-Security-Policy` header on all API responses
- SQL injection: Hono's D1 binding uses parameterized queries by default — never interpolate user input into SQL strings
- File upload: validate MIME type server-side by reading magic bytes via `r2.head()`, not just trusting the client-provided `mimeType`
- Admin impersonation: add a `X-Impersonation-Warning` header to all responses when acting as another user

**Deliverables**: Zod validation on all endpoints. Rate limits active. QR tokens expire and can't be replayed.

---

## Phase 9 — Testing & Deployment
**Difficulty**: Medium | **Duration**: 3–5 days | **Depends on**: Phase 8

**Goals**: Reliable deployment pipeline. Catch regressions before production.

**Testing strategy**:

- **Unit tests** (`vitest`): HMAC signing/verification logic, Zod schemas, utility functions in `packages/shared`
- **Integration tests** (`vitest` + `@cloudflare/vitest-pool-workers`): Test Worker endpoints against a real D1 (in-memory for tests). Test the full auth flow, QR generation + scan validation, benefit redemption anti-replay
- **E2E tests** (`Playwright`): Happy path for each role: register → get QR → OC scans → attendance recorded. Run against staging environment

**Environments**:
```toml
# wrangler.toml
[env.staging]
name = "mun-worker-staging"
d1_databases = [{ binding = "DB", database_name = "mun-db-staging", database_id = "..." }]

[env.production]
name = "mun-worker-prod"
d1_databases = [{ binding = "DB", database_name = "mun-db-prod", database_id = "..." }]
```

**Deployment pipeline** (GitHub Actions):
```
PR opened → lint + typecheck + unit tests
Merge to main → deploy to staging → run E2E tests
Manual approval → deploy to production
```

**D1 migrations**: Run `wrangler d1 migrations apply mun-db --env production` as part of deploy step. Migrations are numbered and tracked by D1.

**Pre-launch checklist**:
- [ ] All Worker secrets set in Cloudflare dashboard (not in code)
- [ ] Custom domain configured for Worker
- [ ] R2 CORS policy set (allow PUT from frontend origin for presigned uploads)
- [ ] Resend sending domain verified
- [ ] Rate limits tested under load (use `k6` for a quick load test)
- [ ] Admin account created with strong password

**Deliverables**: Staging environment identical to production. CI/CD pipeline runs automatically. Deploy to production is a one-button operation.

---

## Phase 10 — Advanced Features (Optional)
**Difficulty**: Medium | **Duration**: ongoing | **Depends on**: Phase 9

**Live attendance dashboard**: Use Cloudflare Durable Objects for a real-time attendance counter. OC scans trigger a Durable Object update; admin dashboard polls via WebSocket or SSE. Alternatively, Cron Trigger every 60 seconds writing stats to D1 is simpler and good enough for most conferences.

**Push notifications**: Use the **Web Push API** (supported in modern browsers). Store push subscriptions in D1. Worker sends push on relevant events (award given, session starting). Works well with Cloudflare Workers — no separate notification server needed.

**Offline QR scanning**: Use a Service Worker on the scan page. Cache the HMAC verification logic and a recent snapshot of valid tokens. Sync when connectivity returns. Complexity is high — only worth it if the venue has poor wifi.

**Bulk import**: Admin CSV upload to bulk-create delegate accounts. Worker parses CSV, validates rows with Zod, creates users in a single D1 batch transaction, sends welcome emails via Resend batch API.

---

## Critical Path Summary

The absolute critical path is: **P0 → P1 → P2 → P3 → P9**. You cannot do a conference without auth, delegates, and QR scanning working.

**What can be parallelized** once Phase 1 is done:
- Phase 3 (QR scanning) and Phase 4 (Chair/Admin) can be built simultaneously by two developers
- Phase 5 (Press feed) can start immediately after Phase 1 — it has no dependency on Phases 2–4
- Phase 6 (Frontend) can start page-by-page as each backend phase completes — don't wait for all phases to finish before writing UI

**Where teams commonly lose time**: QR anti-replay logic (Phase 3), R2 presigned URL CORS configuration (Phase 5), and mobile camera permissions for the scan page (Phase 6). Budget an extra day each for these three.
# AGENTS.md — AI Agent Contribution Guide

> This document governs how AI coding agents (Claude, GPT, Copilot, etc.) should reason, contribute, and behave when working inside this repository. All agents must read and follow this guide before making any changes.

---

## 1. Purpose

This file exists to ensure that AI agents contribute to this codebase in a consistent, safe, and maintainable way. It defines architectural principles, coding standards, security rules, and behavioral expectations that all agents must follow.

Human developers should also use this document as the authoritative reference for contribution standards.

If you are an AI agent working in this repository: **read this file fully before writing or modifying any code.**

---

## 2. Architecture Overview

This is a full-stack Model United Nations (MUN) platform built on Cloudflare Workers with Turso (libSQL) database.

### High-Level Structure

```
/
├── apps/
│ ├── web/ # React + shadcn/ui application (frontend)
│ └── worker/ # Cloudflare Workers (API backend)
├── packages/
│ └── shared/ # Shared TypeScript types and Zod schemas
└── apps/worker/migrations/ # Turso SQL migrations
```

### Core Principles

- **Frontend** is a React SPA served as a static site. It communicates exclusively with the Workers API. It has no direct database or storage access.
- **Backend** is a collection of Cloudflare Workers. Each Worker is stateless and handles a bounded domain (auth, QR, press, delegates, etc.). Workers respond to HTTP requests and return JSON.
- **Database** is **Turso (libSQL)**. Accessed only from Workers via Drizzle ORM, never from the frontend.
- **Storage** is Cloudflare R2 for media uploads. Files are uploaded directly from the client using presigned URLs. Workers generate presigned URLs but do not proxy file content.
- **API-driven design**: All data flows through well-defined REST endpoints. The frontend is a consumer, not a peer.

### Domain Services

The backend is organized into focused service modules:

| Service | Responsibility |
|-------------|-----------------------------------------------------|
| `auth` | **Better Auth** (email/password, sessions, JWT plugin); roles from Turso `users`; admin **impersonation** (HMAC JWT); email verification |
| `delegates` | Registration with pending approval, profile management, QR code issuance, committee choices |
| `qr` | QR code signing, validation, replay protection |
| `oc` | Attendance scanning, benefit tracking |
| `chairs` | Country assignment, award management |
| `admin` | Admin/setup routes, user management, registration approval, platform control |
| `press` | Social feed, posts, likes, replies, media |
| `upload` | Presigned URL generation for R2 |
| `email` | Transactional email delivery (Brevo integration) |

Agents must respect this service boundary. Do not create cross-service dependencies without explicit justification.

---

## 3. Coding Standards

### Language

- **TypeScript is mandatory everywhere** — frontend, Workers, scripts, and utilities.
- No plain JavaScript files. No `any` types unless unavoidable and explicitly commented.
- Enable strict mode in `tsconfig.json`. Do not disable strict checks.

### Naming Conventions

| Construct | Convention | Example |
|-------------------|---------------------|--------------------------------|
| Variables | `camelCase` | `delegateId`, `isVerified` |
| Functions | `camelCase` | `getDelegate()`, `signQRCode()`|
| Types / Interfaces| `PascalCase` | `DelegateProfile`, `QRPayload` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_MEDIA_ITEMS`, `JWT_TTL` |
| Files | `kebab-case` | `delegate-router.ts` |
| Database tables | `snake_case` | `delegate_profiles`, `press_posts` |

### Function Design

- Keep functions **small and focused** — one function, one responsibility.
- Prefer named functions over anonymous arrow functions for anything non-trivial.
- Avoid deeply nested logic. Extract branches into named helper functions.
- Do not write clever or obscure code. **Readability is the primary virtue.**
- Maximum function length: ~40 lines. If it's longer, split it.

### General Rules

- No magic numbers or strings. Define them as named constants.
- No hardcoded secrets, credentials, or environment-specific values in source code.
- Use environment variables (via `wrangler.toml` bindings or `.dev.vars`) for all configuration.
- Delete dead code — do not comment it out and leave it.

---

## 4. Frontend Guidelines

### Framework & Components

- Use **React** with functional components and hooks only. No class components.
- Use **shadcn/ui** as the primary component library. Components are located in `src/components/ui/`.
- Build reusable, composable components. A component should do one thing well.
- Keep components in logically named directories under `apps/web/src/components/`.
- **Follow the [Design & UX Philosophy](#design--ux-philosophy)** to ensure a consistent and premium user experience.

### Design System

The platform uses a strict two-color primary palette:

| Role | Value |
|-----------------|-----------|
| Primary | `#04316c` (HSL: `214 93% 22%`) |
| Primary Text | `#ffffff` |
| Surface / Base | `#ffffff` |
| Neutral accents | Derived from Tailwind's default scale |

- Always use design tokens or shadcn/ui's CSS variables. **Do not hardcode color hex values in component files.**
- Follow a **mobile-first** responsive design approach. Design for small screens first, then enhance for larger viewports.
- Maintain consistent spacing using Tailwind's spacing scale. Do not introduce arbitrary pixel values.
- Typography must be consistent. Use the type scale defined in the theme — do not set arbitrary font sizes inline.

### Component Rules

- **No inline styles.** Use Tailwind utility classes or the theme system.
- Every component that fetches data must handle three states explicitly: **loading**, **error**, and **success**.
- **Forms:** Use **React Hook Form** combined with **Zod** (`@hookform/resolvers/zod`) for all forms to display validation errors clearly and ensure strict validation.
- Interactive elements must have accessible labels (`aria-label`, `aria-describedby`) where visual context alone is insufficient.
- **Data Fetching:** Use **React Query** (`@tanstack/react-query`) for all server state and API data fetching. Do not use `useEffect` for data fetching.
- **State Management:** Use **Zustand** for client-side global state.

### File Organization

```
apps/web/src/
├── components/ # Reusable UI components
│ ├── ui/ # shadcn/ui base components
│ ├── common/ # Shared elements
│ ├── delegates/
│ ├── press/
│ └── ...
├── pages/ # Route-level page components
├── hooks/ # Custom React hooks
├── services/ # API client functions (typed fetch wrappers)
├── types/ # Shared TypeScript types
└── utils/ # Pure utility functions
```

---

## 5. Backend (Workers) Guidelines

### Handler Design

- Each Worker handles a **single domain** (e.g., `delegates-worker`, `press-worker`).
- Follow a strict **MVC (Model-View-Controller)** pattern for backend logic:
 - **Routes**: Define endpoints and OpenAPI specifications using **Hono Zod OpenAPI** (`@hono/zod-openapi`) (thin layer).
 - **Controllers**: Handle request/response orchestration (parse input → call service → return JSON).
 - **Services**: Contain business logic and database operations (stateless).
- Route handlers must be **small and focused**. Extract business logic into service functions; keep handlers as thin orchestrators.
- A handler's responsibility: parse the request → validate → authorize → call service → return response.

### File Organization (Worker)

```
apps/worker/src/
├── index.ts # Entry point & global middleware
├── controllers/ # Domain-specific controllers
├── services/ # Business logic & DB operations
├── routes/ # OpenAPI route definitions
├── middleware/ # Custom Hono middleware (auth, rbac)
├── lib/ # Shared helpers (e.g. better-auth factory, JWT verification)
├── db/ # Drizzle schema & D1 client (initializeDb, getDb)
└── types/ # Worker-specific types (env bindings, etc.)
```

SQL migrations live in **`apps/worker/migrations/`** (versioned files; not under `src/`).

### Unit tests (Worker)

- Worker unit tests live in **`apps/worker/tests/unit/`**, grouped by area (`auth/`, `lib/`, `middleware/`, `services/`, `app/`).
- Run them with **`pnpm --filter @trackmun/worker test`** (Vitest with **`@cloudflare/vitest-pool-workers`**). Vitest is pinned to a version compatible with that pool package (see `apps/worker/package.json`).
- Add tests for new business logic and security-sensitive helpers (auth, JWT verification, middleware) in that tree. Import production modules via the **`#src`** alias (see `apps/worker/vitest.config.ts` and `apps/worker/tsconfig.json`).

---

## Branding & Customization

This is an open-source project. All visual identity is controlled from a **single file** that deployers edit once.

### `apps/web/brand.config.ts`

Deployers edit this file to change the app's visual identity:

```typescript
export default {
 appName: 'TrackMUN',
 logoPath: '/logo.svg', // path relative to public/
 primary: '#04316c', // Hex color for primary brand color
 primaryForeground: '#ffffff', // Hex color for text on primary background
};
```

### How to Rebrand

1. **Colors & Name**: Edit `apps/web/brand.config.ts`. The `primary` color is automatically injected into the Tailwind theme via CSS variables in `index.css`.
2. **Logo**: Replace `apps/web/public/logo.svg` with your own logo asset.
3. **Runtime Access**: Components should import branding info from `@/config/brand` (which re-exports the config) to ensure consistency.

---

## Design & UX Philosophy

To ensure TrackMUN remains a premium, professional platform and avoids "AI slop" (generic, uninspired layouts), all agents must adhere to these design principles.

### 1. Visual Hierarchy & Spacing
- **Whitespace is a feature**: Never crowd elements. Use generous padding (`p-6` or `p-8`) for main containers.
- **Contrast & Typography**: Use font weights and sizes to create a clear hierarchy. Titles must be bold and distinct from body text.
- **Consistent Spacing**: Always use Tailwind's standard scale (e.g., `gap-4`, `gap-6`, `space-y-4`). **Never** use arbitrary pixel values for spacing.

### 2. Component Usage (shadcn/ui)
- **Cards**: Group primary data and sections in `Card` components. Maintain subtle borders and consistent padding. Avoid flat, borderless layouts for data-heavy views.
- **Buttons**: Use `variant="default"` for the main call-to-action. Use `variant="outline"` or `variant="ghost"` for secondary actions to maintain visual balance.
- **Inputs**: Always use shadcn `Input` with clear, descriptive `Label`s. Never use unstyled HTML inputs.
- **Feedback & Loading**: Use `Skeleton` for loading states to prevent layout shift. Use `Badge` for status indicators (e.g., "Active", "Pending", "Success") with appropriate semantic variants.

### 3. "Anti-Slop" Principles
- **Meaningful Iconography**: Use icons from `lucide-react` that match the semantic context. Avoid generic or repetitive icons.
- **Intentional Empty States**: Never show a blank screen when data is missing. Design beautiful empty states with a relevant icon, a clear explanatory message, and a primary action button to guide the user.
- **Subtle Motion**: Use `framer-motion` for entry animations or layout transitions. Keep animations fast (200-300ms) and purposeful; avoid "distracting" or "bouncy" effects.
- **Responsive by Default**: Mobile-first design is mandatory. Every layout must be tested and optimized for `sm`, `md`, and `lg` breakpoints.

### 4. Color & Branding
- **Semantic Tokens**: Stick to the theme palette (`primary`, `secondary`, `success`, `warning`, `destructive`).
- **Brand Consistency**: Always import branding details (app name, logo) from `@/config/brand`. Never hardcode these strings in components.

---

### Input Validation

- **Validate all inputs.** Never trust client-supplied data.
- Validate request bodies, query parameters, path parameters, and headers.
- Return `400 Bad Request` with a descriptive error message for invalid inputs.
- Use a consistent validation approach (e.g., Zod schemas) across all Workers.

### Authorization

- Every protected route must check the caller's role **explicitly**.
- **Identity** is managed by **[Better Auth](https://www.better-auth.com/)** on the Worker (`apps/worker/src/lib/auth.ts`): email/password, sessions, and a **JWT plugin**. The client sends **`Authorization: Bearer <access_token>`** on API calls.
- **Authorization (roles)** always comes from the **Turso `users` row** for the subject (`sub` / user id). Do **not** trust JWT custom claims alone for RBAC; load the user from Turso after verification.
- **Registration Status**: New delegates have `registration_status = 'pending'`. They must be approved by admin before accessing full features.
- Role hierarchy: `admin > chair > oc > delegate`
- **Admin Provisioning**: Admin users can provision new internal accounts (`oc` and `chair`) via the `AdminController.createUser` method.
- **Impersonation**: admins receive a short-lived **HMAC-SHA256** JWT (`typ: 'impersonation'`, secret `IMPERSONATION_SECRET`) only for targets whose role is **`oc` or `chair`**. Log events in **`impersonation_log`** via `AuthService.logImpersonation`.
- Required bindings / secrets are declared on **`Bindings`** in `apps/worker/src/types/env.ts` (e.g. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `IMPERSONATION_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `MEDIA`). Optional: `ENVIRONMENT` (`production` toggles Better Auth cookie settings in `lib/auth.ts`).
- Return `401 Unauthorized` for missing/invalid tokens. Return `403 Forbidden` for insufficient permissions or pending/rejected registration status.

### Middleware Patterns

- Apply authentication and role checks as **per-route** (or route-group) middleware.
- **`withAuth`**: parses `Bearer` token → if payload `typ === 'impersonation'`, verify HMAC and load **acting** user from D1; otherwise verify Better Auth access JWT (JWKS) and load user by `sub` from D1. Sets `user`, `isImpersonating`, and optional `adminId` on the context.
- **`requireRole(...roles)`**: ensures `user.role` is one of the allowed roles.
- Example pattern:

```typescript
router.post('/awards', withAuth, requireRole('chair'), assignAwardHandler);
```

### Response Format

All API responses must follow this envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Human-readable message", "code": "ERROR_CODE" }
```

Never return raw data without the envelope. Never expose internal error details (stack traces, SQL errors) to the client.

---

## 6. Database (Turso/libSQL) Guidelines

### Schema Design

- Normalize the schema. Avoid storing repeated data in multiple places.
- Every table must have a primary key (`id`), a `created_at` timestamp, and an `updated_at` timestamp.
- Use `snake_case` for all table and column names.
- Table names must be plural and descriptive: `users`, `delegate_profiles`, `press_posts`, `qr_tokens`, `awards`.

### Key Tables

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'delegate',
  registration_status TEXT NOT NULL DEFAULT 'pending',
  council TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE delegate_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  year TEXT,
  country TEXT,
  press_agency TEXT,
  first_choice TEXT,
  second_choice TEXT,
  awards TEXT DEFAULT '[]'
);
```

### Query Rules

- Write explicit, readable SQL. Avoid overly complex joins — if a query requires more than 3 joins, consider restructuring the data model.
- Always use parameterized queries via Drizzle ORM. **Never interpolate user input into SQL strings.**
- Prefer simple indexed lookups over full-table scans. Add indexes on foreign keys and commonly filtered columns.
- Paginate all list queries. Never return unbounded result sets.

### Migrations

- All schema changes must be written as versioned migration files in `apps/worker/migrations/`.
- Migration files are append-only. Never modify an already-applied migration.
- Migration naming: `0001_create_users.sql`, `0002_add_delegate_profiles.sql`.
- Apply migrations: `pnpm db:generate` then `pnpm db:push` (local) or manual apply (production).

---

## Drizzle ORM

All database access in the Worker uses **Drizzle ORM** for type-safe, composable queries with Turso (libSQL).

### Installation

Dependencies are declared in `apps/worker/package.json`:
- `drizzle-orm` — ORM runtime
- `@libsql/client` — Turso client driver
- `drizzle-kit` — CLI for migrations and schema management

### File Structure

```
apps/worker/src/
├── db/
│ ├── schema.ts # Table definitions and relations
│ └── client.ts # Database client initialization (Turso/libsql)
├── lib/
│ ├── auth.ts # better-auth instance factory
│ └── verify-better-auth-jwt.ts # Access JWT verification
├── middleware/
│ ├── auth.ts # withAuth
│ └── rbac.ts # requireRole
├── routes/ # OpenAPI routers
├── controllers/ # Thin handlers
└── services/
 ├── admin/ # Admin services
 └── auth/ # Auth services
```

### Usage Pattern

Services import the database client and query builder:

```typescript
import { getDb } from '../../db/client';
import { users, eq } from '../../db/schema';

async function getUserById(id: string) {
 const db = getDb();
 const user = await db.select().from(users).where(eq(users.id, id)).get();
 return user;
}
```

### Common Operations

**SELECT (single):**
```typescript
const user = await db.select().from(users).where(eq(users.id, id)).get();
```

**SELECT (multiple with pagination):**
```typescript
const results = await db
 .select()
 .from(users)
 .where(eq(users.registrationStatus, 'pending'))
 .limit(20)
 .offset((page - 1) * 20)
 .all();
```

**COUNT:**
```typescript
const result = await db.select({ count: count() }).from(users).get();
```

**INSERT:**
```typescript
await db.insert(users).values({
 id: 'user-123',
 email: 'user@example.com',
 firstName: 'John',
 lastName: 'Doe',
 name: 'John Doe',
 role: 'delegate',
 registrationStatus: 'pending',
}).run();
```

**UPDATE:**
```typescript
await db.update(users).set({ registrationStatus: 'approved' }).where(eq(users.id, id)).run();
```

**DELETE:**
```typescript
await db.delete(users).where(eq(users.id, id)).run();
```

### Database Commands

```bash
# Generate migration files from schema.ts changes
pnpm db:generate

# Push schema to local Turso
pnpm db:push

# Apply migrations to production (manual)
turso db shell <database-name> < migrations/0001_*.sql
```

### Why Drizzle + Turso?

1. **Type-safe**: Full TypeScript with compile-time checking
2. **No SQL injection**: Query builder eliminates string interpolation risk
3. **Composable**: Build complex queries from simple, reusable pieces
4. **Better concurrency**: Turso handles concurrent writes better than D1
5. **Auto-migrations**: Drizzle generates migrations from schema changes
6. **Parameterization**: Automatic; no manual query parameterization needed

---

## 7. R2 Upload Guidelines

- **Never proxy file uploads through Workers.** Workers have memory and CPU limits that make them unsuitable for large binary streams.
- The upload flow is always: client requests presigned URL from Worker → Worker validates request and generates presigned URL → client uploads directly to R2 → client notifies Worker of completion → Worker records the media reference.
- Presigned URLs must have a **short expiration** (maximum 15 minutes).
- Workers must validate the following before generating a presigned URL:
 - User is authenticated and authorized to upload
 - File type is in the allowed list (e.g., `image/jpeg`, `image/png`, `image/webp`, `video/mp4`)
 - Declared file size does not exceed the configured maximum
- After the client completes the upload, the Worker must verify the object exists in R2 before persisting the reference to D1.
- R2 object keys must be namespaced by context: `press/{postId}/{filename}`, `delegates/avatars/{delegateId}/{filename}`.

---

## 8. QR Code & Security Rules

### QR Code Signing

- All QR codes must be signed using **HMAC-SHA256** with a secret key stored in environment variables.
- The QR payload must include: `delegateId`, `purpose` (e.g., `attendance`, `benefit`), `issuedAt` (Unix timestamp), `expiresAt` (Unix timestamp).
- QR codes must have a defined expiration. Expired QR codes must be rejected.

### Validation Rules

- The scanning Worker must verify the HMAC signature before processing any QR payload.
- **Never trust client-supplied QR data.** Always re-derive and validate server-side.
- After validating the signature and expiration, check the token against a **nonce store** (D1 table) to prevent replay attacks. Mark the token as used upon first valid scan.
- One-time-use tokens must be invalidated immediately after first successful scan.

### General Security

- Never expose signing keys, **Better Auth** / **impersonation** secrets, or R2 credentials in source code, logs, or responses.
- Do not log QR payloads or tokens in plaintext.
- Rate-limit scanning endpoints to prevent brute-force attempts.

---

## 9. Press System Rules

### Data Model Constraints

- A press post can have a **maximum of 2 media items** (images or videos).
- Replies are **one level deep only**. Replies cannot have replies.
- Posts have: `id`, `authorId`, `content`, `mediaUrls[]`, `createdAt`, `likesCount`, `replyCount`.
- Likes are stored in a separate `post_likes` table (many-to-many between users and posts).

### API Design

- Feeds must be paginated using **cursor-based pagination** (not offset-based) for performance and consistency under concurrent updates.
- Never return the full dataset in a single response. Default page size: 20 items.
- When returning a post, include `likedByCurrentUser: boolean` — computed server-side, not client-side.
- Do not load replies eagerly with the feed. Fetch replies on demand when a post is expanded.

### Performance

- Index `post_likes` on `(post_id, user_id)` for fast like lookups and uniqueness enforcement.
- Index `press_posts` on `created_at DESC` for feed ordering.
- Cache public feed responses at the Worker level where appropriate (consider Cloudflare Cache API).

---

## 10. Performance Guidelines

### Backend

- Use the **Cloudflare Cache API** for publicly cacheable responses (e.g., public press feed, committee lists).
- Set appropriate `Cache-Control` headers on all responses.
- Use D1's prepared statements; avoid re-parsing the same query structure on every request.
- Keep Worker cold start time minimal: avoid heavy imports and unnecessary initialization at the module level.

### Frontend

- Implement **pagination or infinite scroll** for all list views. Never load a full dataset at once.
- Memoize expensive computations with `useMemo`. Stabilize callback references with `useCallback` where it prevents unnecessary re-renders.
- Lazy-load routes and heavy components using `React.lazy` and `Suspense`.
- Optimize images: serve WebP where possible, use appropriate dimensions, and avoid loading full-resolution images in list views.
- Avoid prop drilling beyond 2 levels — use **Zustand** for global client state.

---

## 11. Logging & Debugging

### What to Log

- All **admin actions**: impersonation events, forced role changes, data deletions.
- All **authentication events**: login, logout, token refresh failures.
- All **QR scan events**: success, failure reason, delegate ID, timestamp.
- Unhandled errors and unexpected states in Workers.

### What Not to Log

- Plaintext passwords, tokens, or secrets — ever.
- Full request/response bodies in production (may contain PII).
- High-frequency routine events (e.g., every feed page load) — this creates noise.

### Format

- Use structured logging (JSON) in Workers for compatibility with Cloudflare's log tooling.
- Include: `timestamp`, `level` (`info`/`warn`/`error`), `service`, `action`, `actorId`, and a `message`.

```json
{
 "timestamp": "2025-01-15T14:32:00Z",
 "level": "info",
 "service": "admin",
 "action": "impersonate",
 "actorId": "admin-001",
 "targetId": "delegate-042",
 "message": "Admin initiated impersonation"
}
```

---

## 12. Anti-Patterns to Avoid

These patterns are explicitly prohibited. If you encounter them in existing code, flag them. Do not introduce new instances.

| Anti-Pattern | Why It's Prohibited |
|---|---|
| **Monolithic handler functions** | Hard to test, review, and maintain. Split into service + handler. |
| **Proxying file uploads through Workers** | Exceeds memory limits, causes timeouts, adds unnecessary cost. |
| **Missing authorization checks** | Any endpoint without explicit role verification is a security vulnerability. |
| **Hardcoded secrets or credentials** | Must use environment variables and Cloudflare secrets binding. |
| **Unbounded database queries** | Will degrade under load. Always paginate. |
| **Inline SQL string interpolation** | SQL injection risk. Always use parameterized queries. |
| **Direct cross-service database access** | Services must communicate via API, not by sharing DB access. |
| **Trusting client-supplied IDs without validation** | Always resolve identity from the verified JWT, not the request body. |
| **Silently swallowing errors** | Catch errors, log them, and return an appropriate error response. |
| **Duplicated validation logic** | Define validation schemas once and reuse them. |
| **Undocumented environment variables** | All required env vars must be listed in `.dev.vars.example` and documented. |

---

## 13. Contribution Rules for AI Agents

### Before You Write Code

1. **Understand the scope.** Read the relevant service module and related types before making changes.
2. **Identify the pattern.** Find an existing similar implementation in the codebase and follow its structure.
3. **Assess impact.** Will this change affect other services, the database schema, or API contracts? If yes, flag it explicitly.

### How to Contribute

- **Explain your reasoning** before making significant changes. A brief comment or PR note describing *why* — not just *what* — is required for non-trivial modifications.
- **Prefer incremental changes.** A small, correct, reviewable change is better than a large refactor. Do not restructure unrelated code while fixing a bug.
- **Do not introduce breaking changes** to existing API contracts without explicit instruction and a migration path defined.
- **Follow existing patterns.** If the codebase uses a specific error handling pattern, validation approach, or folder structure — match it. Do not introduce a new pattern without discussion.
- **Do not add dependencies** (npm packages, Worker bindings, etc.) without justification. Every dependency is a maintenance and security liability.

### Code Quality Checklist

Before submitting any change, verify:

- [ ] TypeScript strict mode passes with no errors
- [ ] **Unit tests are written for all new business logic and utility functions** (place Worker tests under `apps/worker/tests/unit/`, run `pnpm --filter @trackmun/worker test`)
- [ ] All inputs to Workers are validated
- [ ] Authorization is enforced on every protected route
- [ ] New database queries are parameterized and paginated
- [ ] No secrets or credentials are present in source code
- [ ] Loading and error states are handled in any new frontend component
- [ ] New environment variables are documented in `.dev.vars.example`
- [ ] No anti-patterns from Section 12 are introduced

### What Agents Must Never Do

- Submit code without accompanying unit tests for new logic.
- Modify migration files that have already been applied.
- Disable TypeScript strict checks or add `@ts-ignore` without a detailed comment.
- Remove authorization middleware from any route.
- Introduce a new third-party service or external API dependency without raising it for human review first.
- Refactor large portions of the codebase speculatively — only change what is necessary for the task.

---

*This document is the source of truth for agent behavior in this repository. When in doubt, do less, explain more, and ask for clarification.*

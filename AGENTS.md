# AGENTS.md — AI Agent Contribution Guide

> This document governs how AI coding agents (Claude, GPT, Copilot, etc.) should reason, contribute, and behave when working inside this repository. All agents must read and follow this guide before making any changes.

---

## 1. Purpose

This file exists to ensure that AI agents contribute to this codebase in a consistent, safe, and maintainable way. It defines architectural principles, coding standards, security rules, and behavioral expectations that all agents must follow.

Human developers should also use this document as the authoritative reference for contribution standards.

If you are an AI agent working in this repository: **read this file fully before writing or modifying any code.**

---

## 2. Architecture Overview

This is a full-stack Model United Nations (MUN) platform built entirely on Cloudflare's ecosystem.

### High-Level Structure

```
/
├── frontend/          # React + HeroUI application
├── workers/           # Cloudflare Workers (API backend)
├── schema/            # D1 SQL migrations and schema definitions
└── docs/              # Architecture decisions and references
```

### Core Principles

- **Frontend** is a React SPA served as a static site. It communicates exclusively with the Workers API. It has no direct database or storage access.
- **Backend** is a collection of Cloudflare Workers. Each Worker is stateless and handles a bounded domain (auth, QR, press, delegates, etc.). Workers respond to HTTP requests and return JSON.
- **Database** is Cloudflare D1 (SQLite-compatible). Accessed only from Workers, never from the frontend.
- **Storage** is Cloudflare R2 for media uploads. Files are uploaded directly from the client using presigned URLs. Workers generate presigned URLs but do not proxy file content.
- **API-driven design**: All data flows through well-defined REST endpoints. The frontend is a consumer, not a peer.

### Domain Services

The backend is organized into focused service modules:

| Service     | Responsibility                                      |
|-------------|-----------------------------------------------------|
| `auth`      | Firebase identity sync, role enforcement, impersonation |
| `delegates` | Registration, profile management, QR code issuance  |
| `qr`        | QR code signing, validation, replay protection      |
| `oc`        | Attendance scanning, benefit tracking               |
| `chairs`    | Country assignment, award management                |
| `admin`     | Impersonation, full platform control                |
| `press`     | Social feed, posts, likes, replies, media           |
| `upload`    | Presigned URL generation for R2                     |

Agents must respect this service boundary. Do not create cross-service dependencies without explicit justification.

---

## 3. Coding Standards

### Language

- **TypeScript is mandatory everywhere** — frontend, Workers, scripts, and utilities.
- No plain JavaScript files. No `any` types unless unavoidable and explicitly commented.
- Enable strict mode in `tsconfig.json`. Do not disable strict checks.

### Naming Conventions

| Construct         | Convention          | Example                        |
|-------------------|---------------------|--------------------------------|
| Variables         | `camelCase`         | `delegateId`, `isVerified`     |
| Functions         | `camelCase`         | `getDelegate()`, `signQRCode()`|
| Types / Interfaces| `PascalCase`        | `DelegateProfile`, `QRPayload` |
| Constants         | `UPPER_SNAKE_CASE`  | `MAX_MEDIA_ITEMS`, `JWT_TTL`   |
| Files             | `kebab-case`        | `delegate-router.ts`           |
| Database tables   | `snake_case`        | `delegate_profiles`, `press_posts` |

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
- Use **HeroUI** as the primary component library. Do not introduce other component libraries without justification.
- Build reusable, composable components. A component should do one thing well.
- Keep components in logically named directories under `frontend/src/components/`.

### Design System

The platform uses a strict two-color primary palette:

| Role            | Value     |
|-----------------|-----------|
| Primary         | `#04316c` |
| Primary Text    | `#ffffff`  |
| Surface / Base  | `#ffffff`  |
| Neutral accents | Derived from HeroUI's default scale |

- Always use design tokens or HeroUI's theming system. **Do not hardcode color hex values in component files.**
- Follow a **mobile-first** responsive design approach. Design for small screens first, then enhance for larger viewports.
- Maintain consistent spacing using HeroUI's spacing scale. Do not introduce arbitrary pixel values.
- Typography must be consistent. Use the type scale defined in the theme — do not set arbitrary font sizes inline.

### Component Rules

- **No inline styles.** Use HeroUI's `className` prop with Tailwind utility classes or the theme system.
- Every component that fetches data must handle three states explicitly: **loading**, **error**, and **success**.
- Forms must display validation errors clearly and accessibly.
- Interactive elements must have accessible labels (`aria-label`, `aria-describedby`) where visual context alone is insufficient.
- Do not use `useEffect` for data that can be fetched with a proper data-fetching pattern (e.g., React Query or SWR if adopted).

### File Organization

```
frontend/src/
├── components/        # Reusable UI components
│   ├── common/        # Buttons, cards, modals, shared elements
│   ├── delegates/
│   ├── press/
│   └── ...
├── pages/             # Route-level page components
├── hooks/             # Custom React hooks
├── services/          # API client functions (typed fetch wrappers)
├── types/             # Shared TypeScript types
└── utils/             # Pure utility functions
```

---

## 5. Backend (Workers) Guidelines

### Handler Design

- Each Worker handles a **single domain** (e.g., `delegates-worker`, `press-worker`).
- Route handlers must be **small and focused**. Extract business logic into service functions; keep handlers as thin orchestrators.
- A handler's responsibility: parse the request → validate → authorize → call service → return response.

### Input Validation

- **Validate all inputs.** Never trust client-supplied data.
- Validate request bodies, query parameters, path parameters, and headers.
- Return `400 Bad Request` with a descriptive error message for invalid inputs.
- Use a consistent validation approach (e.g., Zod schemas) across all Workers.

### Authorization

- Every protected route must check the caller's role **explicitly**.
- Identity is managed by **Firebase Auth**. Workers verify Firebase ID tokens using the `@hono/firebase-auth` middleware.
- Do not assume a valid Firebase token implies sufficient permissions. Check the role claim from the D1 `users` table.
- Role hierarchy: `admin > chair > oc > delegate > guest`.
- Admins may impersonate any account using a Worker-signed HMAC JWT. Log all impersonation events.
- Return `401 Unauthorized` for missing/invalid tokens. Return `403 Forbidden` for insufficient permissions or unsynced users.

### Middleware Patterns

- Apply authentication and role checks as composable middleware.
- `verifyFirebaseAuth` (global) → `withAuth` (D1 user lookup) → `requireRole` (RBAC).
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

## 6. Database (D1) Guidelines

### Schema Design

- Normalize the schema. Avoid storing repeated data in multiple places.
- Every table must have a primary key (`id`), a `created_at` timestamp, and an `updated_at` timestamp.
- Use `snake_case` for all table and column names.
- Table names must be plural and descriptive: `delegates`, `press_posts`, `qr_tokens`, `awards`.

### Query Rules

- Write explicit, readable SQL. Avoid overly complex joins — if a query requires more than 3 joins, consider restructuring the data model.
- Always use parameterized queries. **Never interpolate user input into SQL strings.**
- Prefer simple indexed lookups over full-table scans. Add indexes on foreign keys and commonly filtered columns.
- Paginate all list queries. Never return unbounded result sets.

### Migrations

- All schema changes must be written as versioned migration files in `schema/migrations/`.
- Migration files are append-only. Never modify an already-applied migration.
- Migration naming: `0001_create_delegates.sql`, `0002_add_awards_table.sql`.

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

- Never expose signing keys, Firebase secrets, or R2 credentials in source code, logs, or responses.
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
- Avoid prop drilling beyond 2 levels — use context or a state management solution.

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
- [ ] **Unit tests are written for all new business logic and utility functions**
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
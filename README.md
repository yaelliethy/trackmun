# TrackMUN

A full-stack Model UN conference management platform. Built with React, Hono, Cloudflare Pages, Turso (libSQL), and Supabase Auth.

- **API docs** — `/api/doc` (Scalar) or `/api/docs` (Swagger UI)
- **Branding** — edit `brand.config.ts` + replace `public/logo.svg`, nothing else

## Features

- **Role-based access** — admin, chair, OC (organizing committee), delegate, and press
- **Delegate management** — registration, QR check-in, committee assignments, attendance tracking
- **Press module** — real-time press feed, photo gallery, media uploads, dispatch
- **Council management** — drag-and-drop ordering, council-specific settings
- **Admin panel** — user management, role assignment, impersonation for support
- **File uploads** — direct-to-R2 presigned URLs (avatars, press photos, documents)
- **Email notifications** — welcome emails, QR reminders, password resets via Brevo
- **White-label branding** — rebrand the entire app from a single file

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, React Router, Tailwind CSS |
| **State** | React Query (server), Zustand (client) |
| **Forms** | React Hook Form + Zod |
| **UI** | shadcn/ui + Radix UI, Framer Motion |
| **API** | Hono + `@hono/zod-openapi` |
| **Runtime** | Cloudflare Pages + Pages Functions (Workers) |
| **Database** | Turso (libSQL) + Drizzle ORM |
| **Auth** | Supabase Auth (JWT + RBAC in `app_metadata`) |
| **Storage** | Cloudflare R2 |
| **Email** | Brevo |
| **Testing** | Vitest + `@cloudflare/vitest-pool-workers` |
| **Packages** | pnpm workspace |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`pnpm add -g wrangler`)

### Setup

```bash
git clone https://github.com/yaelliethy/trackmun.git
cd trackmun
pnpm install
cp .env.example .env
cp .dev.vars.example .dev.vars
# Fill in your credentials in .env and .dev.vars
```

### Environment Variables

**Frontend** (`.env`):

| Variable | Description |
|---|---|
| `VITE_API_URL` | Local API URL (default: `http://localhost:8787`) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

**Backend** (`.dev.vars`):

| Variable | Required | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | Yes | Turso database URL |
| `TURSO_AUTH_TOKEN` | Yes | Turso auth token |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Backend-only service role |
| `SUPABASE_JWT_SECRET` | Yes | JWT verification secret |
| `IMPERSONATION_SECRET` | Yes | HMAC secret (32+ chars) |
| `QR_SECRET` | Yes | QR signing secret (32+ chars) |
| `FRONTEND_URL` | Yes | Frontend URL for redirects |
| `BREVO_API_KEY` | No | Brevo transactional API key |
| `BREVO_SENDER_EMAIL` | No | Email sender address |
| `BREVO_SENDER_NAME` | No | Email sender display name |
| `BREVO_WELCOME_TEMPLATE_ID` | No | Welcome email template ID |
| `BREVO_QR_REMINDER_TEMPLATE_ID` | No | QR reminder template ID |
| `BREVO_PASSWORD_RESET_TEMPLATE_ID` | No | Password reset template ID |
| `ENVIRONMENT` | No | `development` or `production` |

### Run

```bash
pnpm dev        # Vite watch + Wrangler on :3000
pnpm type-check # TypeScript type check
pnpm lint       # ESLint
```

### Database

```bash
pnpm db:generate  # Generate migration from schema.ts changes
pnpm db:push      # Push schema to local Turso
pnpm db:reset     # Wipe + reapply migrations + clear Supabase auth
```

Migrations are versioned SQL files in `migrations/`. Never modify an applied migration — create a new one instead.

### Test

```bash
pnpm test                              # All API tests
pnpm test:shared                       # Shared package tests
pnpm exec vitest run <file> --config vitest.functions.config.ts  # Single file
```

### Deploy

```bash
pnpm deploy   # Build + deploy to Cloudflare Pages
```

## Architecture

### Monorepo Layout

```
/
├── src/                      # React + Vite SPA
│   ├── components/           # shadcn/ui + custom components
│   ├── pages/                # Pages by role (admin, auth, chairs, delegate, oc, press)
│   ├── services/             # API client wrappers
│   ├── lib/                  # Client utilities
│   └── stores/               # Zustand stores
├── functions/api/            # Cloudflare Pages Functions (Hono API)
│   ├── [[path]].ts           # Entry: route mounting, CORS, cold-start init
│   ├── routes/               # OpenAPI route definitions only
│   ├── controllers/          # Parse → validate → authorize → call service → return
│   ├── services/             # Business logic + DB queries (stateless)
│   ├── middleware/           # withAuth, requireRole
│   ├── lib/                  # JWT verification, Supabase helpers
│   └── db/                   # Drizzle schema + client
├── packages/shared/          # @trackmun/shared — shared types & Zod schemas
├── migrations/               # Versioned SQL migration files
└── brand.config.ts           # Single-file app rebranding
```

### Backend MVC

Every domain follows the same three-layer pattern:

```
Routes (routes/) → Controllers (controllers/) → Services (services/)
```

**Routes** — OpenAPI definitions via `createRoute` with Zod schemas. No logic.
**Controllers** — Parse, validate, authorize, call service, return JSON.
**Services** — Business logic and DB queries. Stateless.

Response envelope (every endpoint):

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Message", "code": "ERROR_CODE" }
```

Domain services: `auth`, `delegates`, `qr`, `oc`, `chairs`, `admin`, `press`, `upload`, `email`. Each service owns its tables.

### Auth & RBAC

- **Supabase Auth** — clients send `Authorization: Bearer <access_token>`
- **JWT verification** — `app_metadata.trackmun` holds RBAC claims (no DB round-trip)
- **Role hierarchy** — `admin > chair > oc > delegate`. New delegates start as `pending`
- **Impersonation** — admins can impersonate `oc`/`chair` users via short-lived HMAC-SHA256 JWT; events logged to `impersonation_log`
- **JWT sync** — after role/status changes, `SupabaseAdmin.syncTrackmunJwtMetadata` ensures the next token reflects the update

### Database

Turso (libSQL) via Drizzle ORM. Schema in `functions/api/db/schema.ts`. DB initializes once on cold start with a module-level `initPromise` guard. All queries use Drizzle — no raw SQL interpolation.

### File Uploads

1. Client requests presigned URL from API
2. Client uploads directly to Cloudflare R2
3. Client notifies API, which verifies object exists and records reference

Presigned URLs expire in 15 minutes. Keys are namespaced: `press/{postId}/{filename}`, `delegates/avatars/{delegateId}/{filename}`.

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Vite watch + Wrangler on :3000 |
| `pnpm dev:watch` | Build frontend in watch mode |
| `pnpm dev:server` | Start Wrangler Pages dev server |
| `pnpm build` | Type-check + production build |
| `pnpm type-check` | `tsc --noEmit` |
| `pnpm lint` | ESLint (zero warnings) |
| `pnpm preview` | Preview production build |
| `pnpm deploy` | Build + deploy to Cloudflare Pages |
| `pnpm db:generate` | Generate Drizzle migration |
| `pnpm db:push` | Push schema to local Turso |
| `pnpm db:reset` | Wipe DB + reapply migrations + clear auth |
| `pnpm test` | Run all API unit tests |
| `pnpm test:shared` | Run shared package tests |

## Conventions

- TypeScript strict mode — no `any` without explanation
- **Naming** — files: `kebab-case`, types: `PascalCase`, DB columns: `snake_case`, constants: `UPPER_SNAKE_CASE`
- Functions ~40 lines max; extract branches into named helpers
- All list endpoints must be paginated (cursor-based for press, limit/offset for others)
- New env vars → `.dev.vars.example` + `functions/api/types/env.ts`
- No `useEffect` for data fetching — use React Query
- Shared types go in `@trackmun/shared`, not in domain-specific files

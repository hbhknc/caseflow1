# CaseFlow

CaseFlow is a private internal matter management app for probate workflow. It is built for Cloudflare Pages, stores data in D1, and now uses Cloudflare Access identity so backend actions can be attributed to a real authenticated user.

This is not a public site. In production, the app is expected to sit behind Cloudflare Access with Microsoft Entra as the identity provider.

## Stack

- React
- TypeScript
- Vite
- Cloudflare Pages Functions
- Cloudflare D1
- `@cloudflare/pages-plugin-cloudflare-access`
- Lightweight custom CSS with reusable UI components

## Repository Structure

```text
.
|-- functions/
|   |-- _middleware.ts
|   |-- _lib/
|   |   |-- auth.ts
|   |   |-- currentUser.ts
|   |   |-- http.ts
|   |   |-- matterRepository.ts
|   |   |-- stages.ts
|   |   `-- types.ts
|   `-- api/
|       |-- boards.ts
|       |-- matters.ts
|       |-- me.ts
|       |-- notes.ts
|       |-- settings.ts
|       |-- stats.ts
|       |-- tasks.ts
|       `-- matters/
|           |-- [[id]].ts
|           |-- archive.ts
|           |-- import.ts
|           `-- unarchive.ts
|-- migrations/
|   |-- 0001_init.sql
|   |-- 0002_seed.sql
|   |-- ...
|   |-- 0008_add_access_identity_audit_fields.sql
|   `-- dev_seed.sql
|-- src/
|   |-- app/
|   |   |-- AppShell.tsx
|   |   |-- AuthContext.tsx
|   |   `-- router.tsx
|   |-- features/
|   |   |-- auth/components/AccessRequiredScreen.tsx
|   |   |-- board/components/
|   |   |-- matters/components/
|   |   |-- notes/components/
|   |   `-- settings/components/
|   |-- pages/
|   |   |-- BoardPage.tsx
|   |   `-- SettingsPage.tsx
|   |-- services/
|   |   |-- apiClient.ts
|   |   |-- boards.ts
|   |   |-- currentUser.ts
|   |   |-- matters.ts
|   |   |-- settings.ts
|   |   `-- stats.ts
|   |-- styles/
|   |-- types/
|   `-- main.tsx
|-- .dev.vars.example
|-- .env.example
|-- package.json
`-- wrangler.toml
```

## What This App Includes

- Kanban-style probate board with stage buckets
- Matter cards showing decedent, client, file number, and last activity
- Search across decedent name, client name, and file number
- Board-scoped CSV import for migration from a prior platform
- Matter drawer for create, edit, delete, archive, unarchive, and note entry
- Reverse-chronological activity log for matter notes
- Pages Functions endpoints for matters, notes, tasks, boards, stats, settings, and current user lookup
- D1 migrations for schema, shared account scoping, and audit attribution

## Cloudflare Access Identity

CaseFlow now validates Cloudflare Access identity on the server side for all `/api/*` routes.

- `functions/_middleware.ts` is the central API gate.
- It uses the official Cloudflare Pages Access plugin to validate the incoming `Cf-Access-Jwt-Assertion`.
- It extracts the authenticated user from the validated JWT and stores it in shared request data for downstream handlers.
- `functions/_lib/currentUser.ts` can optionally enrich that identity with Cloudflare Access `getIdentity()` data to obtain a display name when available.
- `/api/me` returns the current authenticated user for the frontend.

At minimum, CaseFlow captures:

- email
- display name when Access identity lookup provides one
- user subject / identifier

### Protected routes

All `/api/*` routes require authenticated identity. If validation fails, the API returns a clean `401` response instead of trusting any client-provided user information.

### Audit stamping

The following actions are stamped with the authenticated actor:

- creating a matter
- importing matters
- editing a matter
- moving or reordering a matter
- adding a note
- deleting a matter
- archiving and unarchiving a matter
- completing a task

The D1 schema now stores:

- `matter_notes.created_by`, `created_by_email`, `created_by_id`
- `matters.created_by_email`, `created_by_id`
- `matters.last_updated_by_email`, `last_updated_by_id`
- `audit_events.matter_id`, `actor_email`, `actor_id`, `actor_name`

## Shared Account Scope Assumption

This repository already scopes data through an `accounts` table. The Cloudflare Access work keeps that architecture intact and assumes all authenticated staff operate inside one shared CaseFlow account unless you later add a user-to-account mapping layer.

By default, the shared scope is:

- `CASEFLOW_ACCOUNT_ID=account_default`

If you need multi-account or per-user tenancy later, add a mapping from Access identity to `accounts.id`.

## Local Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Wrangler CLI installed separately when you want local Pages Functions or D1 emulation
- A Cloudflare account for Pages and D1 beyond local development

### Install

```bash
npm install
```

### Frontend-only development

```bash
npm run dev
```

The Vite dev server runs at `http://127.0.0.1:5173`.

This is useful for UI work, but authenticated API features depend on Pages Functions and D1, so use `wrangler pages dev` for end-to-end identity-aware behavior.

### Local Pages Functions + D1 workflow

1. Create a local or remote D1 database named `caseflow` or `caseflow-prod`.
2. Update the placeholder `database_id` values in `wrangler.toml`.
3. Copy `.dev.vars.example` to `.dev.vars` and fill in the Cloudflare Access settings you need locally.
4. Apply the schema migrations.
5. Optionally seed demo data for local/dev environments only.
6. Build the frontend and run Pages locally.

```bash
npm run db:migrate:local
npm run db:seed:local
npm run build
npm run pages:dev
```

`wrangler pages dev` serves the built Vite app from `dist/` and runs the `functions/` directory so the `/api` endpoints execute in the Cloudflare runtime.

### Local dev fallback

Cloudflare Access headers are usually not present in local development. CaseFlow supports a local-only bypass that is intentionally isolated from production:

- set `ACCESS_DEV_BYPASS=true`
- only use it through `localhost`, `127.0.0.1`, `::1`, or `*.localhost`
- provide mock values with `ACCESS_DEV_USER_EMAIL`, `ACCESS_DEV_USER_NAME`, and `ACCESS_DEV_USER_ID`

If `ACCESS_DEV_BYPASS` is not enabled, production-style Cloudflare Access validation remains required.

## Environment Variables

### Required for production / preview

- `APP_NAME`
- `CLOUDFLARE_ACCESS_DOMAIN`
- `CLOUDFLARE_ACCESS_AUD`
- `CASEFLOW_ACCOUNT_ID`
- `DB` D1 binding

### Local-only optional

- `ACCESS_DEV_BYPASS`
- `ACCESS_DEV_USER_EMAIL`
- `ACCESS_DEV_USER_NAME`
- `ACCESS_DEV_USER_ID`

## API Endpoints

All endpoints below require authenticated identity unless noted otherwise.

- `GET /api/me`
- `GET /api/boards`
- `POST /api/boards`
- `PUT /api/boards`
- `DELETE /api/boards`
- `GET /api/matters`
- `POST /api/matters`
- `POST /api/matters/import`
- `PUT /api/matters/:id`
- `PATCH /api/matters/:id`
- `DELETE /api/matters/:id`
- `POST /api/matters/archive`
- `POST /api/matters/unarchive`
- `GET /api/notes?matterId=:id`
- `POST /api/notes`
- `GET /api/tasks?boardId=:id`
- `POST /api/tasks`
- `GET /api/stats?boardId=:id`
- `GET /api/settings`
- `PUT /api/settings`

## D1 Notes

- `migrations/0001_init.sql` creates the initial schema.
- `migrations/0002_seed.sql` contains production-safe app defaults.
- `migrations/dev_seed.sql` is the optional demo dataset for local/dev testing.
- `migrations/0006_add_accounts_and_practice_boards.sql` provisions the shared account and owned boards.
- `migrations/0008_add_access_identity_audit_fields.sql` adds user-attribution columns for matters, notes, and audit events.
- Archived matters are excluded from the main board by default.
- Boards, matters, notes, tasks, archive data, and stats remain scoped to the configured CaseFlow account.
- CSV import expects `decedentName`, `clientName`, `fileNumber`, and `stage`, with optional `createdAt` and `lastActivityAt`.

## Cloudflare Pages Deployment

Recommended Pages settings:

- Framework preset: `React (Vite)`
- Build command: `npm run build`
- Build output directory: `dist`
- Functions directory: `functions`
- D1 binding name: `DB`

Also configure:

- `APP_NAME=CaseFlow`
- `CLOUDFLARE_ACCESS_DOMAIN=https://your-team.cloudflareaccess.com`
- `CLOUDFLARE_ACCESS_AUD=<your-access-application-audience>`
- `CASEFLOW_ACCOUNT_ID=account_default`

Production and preview environments should leave `ACCESS_DEV_BYPASS` disabled.

## pages.dev First, Custom Subdomain Later

The repository assumes an initial standalone `pages.dev` deployment. When the firm is ready, the same Pages project can later be attached to a custom hostname such as `caseflow.example.com` without changing the core app architecture.

## Developer Notes

- `src/services/` is the frontend boundary for network calls.
- `functions/_lib/` is the backend boundary for auth helpers, HTTP helpers, D1 access, and business rules.
- `functions/_middleware.ts` is the centralized API protection layer.
- `src/types/` keeps frontend data contracts explicit.
- The UI is intentionally modular and light so future work can extend it without a heavy component framework.
- App-managed usernames and passwords are no longer part of the runtime model.

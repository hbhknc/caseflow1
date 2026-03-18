# CaseFlow

CaseFlow is a private internal matter management starter app focused on probate workflow. This repository is set up for a Cloudflare Pages deployment on a separate `pages.dev` project today, while keeping the codebase ready for Cloudflare Access and Microsoft Entra integration later.

This is not a public marketing site. It is a firm-only operational web application intended to sit behind Cloudflare Access once infrastructure policy is ready.

## Stack

- React
- TypeScript
- Vite
- Cloudflare Pages Functions
- Cloudflare D1
- Lightweight custom CSS with reusable UI components

## Repository Structure

```text
.
|-- functions/
|   |-- _lib/
|   |   |-- http.ts
|   |   |-- matterRepository.ts
|   |   |-- stages.ts
|   |   `-- types.ts
|   `-- api/
|       |-- matters.ts
|       |-- matters/
|       |   |-- [[id]].ts
|       |   `-- archive.ts
|       |-- notes.ts
|       `-- settings.ts
|-- migrations/
|   |-- 0001_init.sql
|   `-- 0002_seed.sql
|-- public/
|   `-- favicon.svg
|-- src/
|   |-- app/
|   |   |-- AppShell.tsx
|   |   `-- router.tsx
|   |-- components/
|   |   |-- Drawer.tsx
|   |   |-- EmptyState.tsx
|   |   |-- SearchField.tsx
|   |   `-- StatusPill.tsx
|   |-- features/
|   |   |-- board/components/
|   |   |   |-- BoardColumn.tsx
|   |   |   `-- MatterCard.tsx
|   |   |-- matters/components/
|   |   |   `-- MatterDrawer.tsx
|   |   |-- notes/components/
|   |   |   `-- NotesTimeline.tsx
|   |   `-- settings/components/
|   |       `-- SettingsPanel.tsx
|   |-- hooks/
|   |   `-- useMattersBoard.ts
|   |-- lib/
|   |   |-- dates.ts
|   |   `-- demoData.ts
|   |-- pages/
|   |   |-- BoardPage.tsx
|   |   `-- SettingsPage.tsx
|   |-- services/
|   |   |-- apiClient.ts
|   |   |-- demoApi.ts
|   |   |-- matters.ts
|   |   `-- settings.ts
|   |-- styles/
|   |   |-- base.css
|   |   |-- components.css
|   |   |-- layout.css
|   |   `-- tokens.css
|   |-- types/
|   |   |-- api.ts
|   |   `-- matter.ts
|   |-- utils/
|   |   `-- stages.ts
|   `-- main.tsx
|-- .editorconfig
|-- .env.example
|-- .gitignore
|-- .npmrc
|-- LICENSE
|-- index.html
|-- package.json
|-- tsconfig.json
|-- tsconfig.node.json
|-- vite.config.ts
`-- wrangler.toml
```

## What v1 Includes

- Kanban-style probate board with stage buckets
- Matter cards showing decedent, client, file number, and last activity
- Search across decedent name, client name, and file number
- Board-scoped CSV import for migrating matters from a prior platform
- Right-side matter drawer for create, edit, delete, archive, and note entry
- Reverse-chronological activity log with separate note timestamps
- Pages Functions endpoints for matters, notes, and app status
- D1 migrations for schema and production-safe defaults

## Local Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Wrangler CLI installed separately when you want local Pages Functions or D1 emulation
- A Cloudflare account for Pages and D1 once you move beyond demo fallback

### Install

```bash
npm install
```

### Frontend-only development

This is the fastest way to start working on the UI:

```bash
npm run dev
```

The Vite dev server runs at `http://127.0.0.1:5173`.

This repository now expects the Pages Functions API to handle authentication and data access. The frontend no longer falls back to bundled matter data for protected routes.

### Local Pages Functions + D1 workflow

1. Create a local or remote D1 database named `caseflow` or `caseflow-prod`.
2. Update the placeholder `database_id` values in `wrangler.toml`.
3. Set `AUTH_USERNAME`, `AUTH_PASSWORD`, and a strong `SESSION_SECRET` in `wrangler.toml` or local secrets.
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

Note: this repository does not pin `wrangler` inside `package.json` because current `workerd` binaries can fail to install on some Windows ARM environments. The app itself still builds normally with `npm install`, and local Pages runtime work can be done by installing Wrangler separately on a supported machine.

## API Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/matters`
- `POST /api/matters`
- `POST /api/matters/import`
- `PUT /api/matters/:id`
- `PATCH /api/matters/:id`
- `DELETE /api/matters/:id`
- `POST /api/matters/archive`
- `GET /api/notes?matterId=:id`
- `POST /api/notes`
- `GET /api/settings`

## D1 Notes

- `migrations/0001_init.sql` creates the initial schema.
- `migrations/0002_seed.sql` now contains only production-safe app defaults.
- `migrations/dev_seed.sql` is the optional demo dataset for local/dev testing.
- `migrations/0006_add_accounts_and_practice_boards.sql` provisions the seeded account and owned boards.
- Archived matters are excluded from the main board by default.
- Stage history and audit events are captured now so later workflow reporting has a clean foundation.
- Boards, matters, notes, tasks, archive data, and stats are now scoped to the authenticated account.
- CSV import expects `decedentName`, `clientName`, `fileNumber`, and `stage`, with optional `createdAt` and `lastActivityAt`.

## Cloudflare Pages Deployment

Recommended Pages settings:

- Framework preset: `React (Vite)`
- Build command: `npm run build`
- Build output directory: `dist`

Also configure:

- Functions directory: `functions`
- D1 binding name: `DB`
- Environment variable: `APP_NAME=CaseFlow`
- Environment variable: `AUTH_USERNAME=hbhklaw`
- Environment variable: `AUTH_PASSWORD=barnes`
- Environment variable: `SESSION_SECRET=<strong random secret>`

For production and preview environments, bind the correct D1 database IDs in Cloudflare and keep `wrangler.toml` aligned with the project.

## Private Access Roadmap

This repository now includes a temporary app-level login gate for internal use, but the intended long-term direction is still:

- Cloudflare Access in front of the app
- Microsoft Entra as the identity provider
- App-level role handling added later only if business rules require it

The current temporary login defaults to:

- Username: `hbhklaw`
- Password: `barnes`

For deployment, move those values into environment configuration and replace the session secret with a strong unique value.

That keeps the first release focused on workflow while leaving a clean path for firm-only access controls.

## pages.dev First, Custom Subdomain Later

The repository assumes an initial standalone `pages.dev` deployment. When the firm is ready, the same Pages project can later be attached to a custom hostname such as `caseflow.example.com` without changing the core app architecture.

## Developer Notes

- `src/services/` is the frontend boundary for network and demo fallback behavior.
- `functions/_lib/` is the backend boundary for HTTP helpers, D1 access, and business rules.
- `src/types/` keeps frontend data contracts simple and explicit.
- The UI is intentionally modular and light so future Codex work can extend it without fighting a heavy component framework.
- Auth, document management, billing, and client portal concerns are intentionally out of scope for this starter.

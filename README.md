# Azora BuildSpaces

Azora BuildSpaces is a Next.js-based collaborative cloud development platform with multiple domain rooms (Code Chamber, Spec Chamber, Design Studio, AI Studio, Collaboration Pod, and more).

## Current Status (Mar 2026)

- Platform: active development (beta)
- Architecture: monolithic Next.js app with App Router, API routes, and shared services under `lib/`
- Code Chamber: substantial IDE surface implemented (editor, terminal, file explorer, source control, AI tooling)
- Gaps: several services and room capabilities are partially implemented and still need production hardening

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS + Radix/shadcn primitives
- Monaco Editor + xterm.js
- Zustand state stores
- Prisma + PostgreSQL
- NextAuth authentication
- Vercel AI SDK + OpenAI integration

## Repository Layout

- `app/` — pages and API routes
- `components/` — room UIs and workspace shell
- `lib/` — services, stores, orchestration, adapters, guards
- `prisma/` — schema and migrations
- `tests/` — Jest + Playwright coverage
- `k8s/` — Kubernetes manifests
- `archive_docs/` — archived historical docs

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Set environment variables:

```bash
cp .env.example .env.local
```

Minimum required values:

```env
DATABASE_URL=postgresql://user:password@host:5432/azora_buildspaces
NEXTAUTH_SECRET=replace-with-random-secret
NEXTAUTH_URL=http://localhost:3000
```

3. Generate Prisma client and migrate DB:

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

4. Run development server:

```bash
pnpm dev
```

5. Open:

- App: `http://localhost:3000`
- Health: `http://localhost:3000/api/health`

## Core Scripts

- `pnpm dev` — local dev server
- `pnpm build` — production build
- `pnpm start` — production server
- `pnpm lint` — lint codebase
- `pnpm type-check` — TypeScript checks
- `pnpm test` — unit/integration tests
- `pnpm test:e2e` — Playwright tests
- `pnpm verify:env` — environment validation

## Code Chamber (Cloud IDE)

Implemented today:

- Monaco-based editor workbench
- Integrated terminal backed by `/api/fs/exec`
- File tree/content CRUD via `/api/fs/*`
- AI endpoints: explain, lint, refactor, docgen, completion
- Extension marketplace API: `/api/code-chamber/extensions`

Priority parity gaps vs hosted IDEs:

- containerized workspace isolation per user/session
- production-grade debugger/runtime hooks
- deterministic test and profiler pipelines
- hardened extension runtime and permissions model
- richer collaboration/session conflict handling

## Notes

- This repository includes both production-ready and in-progress modules.
- Prefer live code and API behavior over historical status docs.
- See `archive_docs/` for superseded documentation snapshots.

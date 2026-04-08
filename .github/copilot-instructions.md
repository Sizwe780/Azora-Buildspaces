# Copilot Instructions for Azora Buildspaces

## Build, test, lint, and verification commands

Use `pnpm` (repo `packageManager` is `pnpm@9`).

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm type-check
```

Unit/integration tests (Jest):

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

Run a single Jest test file:

```bash
pnpm test -- tests/api/health.test.ts
```

Run tests matching a name:

```bash
pnpm test -- -t "health"
```

E2E tests (Playwright):

```bash
pnpm playwright:install
pnpm test:e2e
```

Run a single E2E spec:

```bash
pnpm test:e2e -- tests/e2e/auth.spec.ts
```

Prisma/database utilities:

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:push
pnpm prisma:studio
pnpm prisma:test
pnpm verify:prisma
pnpm verify:env
```

## High-level architecture

- This is a Next.js App Router monolith with two main surfaces:
  - UI pages in `app/**` (notably `app/workspace/page.tsx` for the multi-room workspace shell).
  - Many server endpoints in `app/api/**/route.ts` for agent orchestration, filesystem/git operations, design/spec generation, auth, knowledge indexing, observability, etc.

- Root composition:
  - `app/layout.tsx` wraps the app in NextAuth `SessionProvider` (`components/providers/session-provider.tsx`), includes analytics, and global CSS output.
  - `middleware.ts` applies global security headers and rate limiting with per-path tiers (with optional Redis-backed limiter).

- Auth flow:
  - NextAuth route: `app/api/auth/[...nextauth]/route.ts`.
  - Canonical auth configuration is in `lib/auth/config.ts` with providers/callbacks split into `lib/auth/providers.ts` and `lib/auth/callbacks.ts`.
  - Most protected API routes gate access via `getServerSession(authOptions)`.

- Data layer:
  - Prisma schema in `prisma/schema.prisma` (PostgreSQL datasource).
  - Shared client in `lib/database/client.ts` (singleton + `@prisma/adapter-pg` pooling path).
  - If DB/client is unavailable, the code intentionally returns explicit proxy errors rather than silent no-ops.

- Workspace/agent subsystems:
  - Workspace UI dynamically loads room implementations (`code-chamber`, `ai-studio`, `design-studio`, etc.) from `app/workspace/page.tsx`.
  - Knowledge indexing/search is in `lib/knowledge/indexer.ts` (MiniSearch over the internal filesystem abstraction).
  - Internal MCP endpoint is exposed at `app/api/mcp/route.ts` via `lib/agents/mcp-server.ts`.
  - Filesystem abstraction (`lib/workspace/file-system.ts`) uses LightningFS in browser and Node fs fallback in server/tests.

## Key repository conventions

- Prefer `@/` import alias for app/lib/components imports (configured in `tsconfig.json` and Jest mapper).

- API route convention is App Router style (`app/api/**/route.ts`) with named method exports (`GET`, `POST`, etc.).

- Auth-protected API routes typically perform session checks at route entry:
  - `const session = await getServerSession(authOptions)`
  - return `401` when missing.

- Workspace file operations must be scoped to `workspaces/<workspaceId>` and path-validated to prevent traversal:
  - Use the existing `resolveWorkspaceRoot`/`validateWorkspacePath` patterns (`app/api/fs/route.ts`).

- Security posture is centralized:
  - Global headers in `next.config.mjs` and mirrored by middleware.
  - Rate limiting policy lives in `middleware.ts` with path-specific limits.

- Testing setup:
  - Jest roots: `tests`, `app`, `lib`.
  - Environment/bootstrap is split between `tests/setupEnv.ts` (runtime shims/env) and `tests/setupTests.ts` (Jest + DOM helpers/mocks).
  - Jest `testMatch` is currently `**/*.test.ts` and `**/*.test.tsx`; `.test.js` files are not picked up by default.

- E2E convention:
  - Playwright config is at `tests/playwright.config.ts`.
  - It starts `pnpm dev` via `webServer` and defaults base URL to `http://localhost:3000`.

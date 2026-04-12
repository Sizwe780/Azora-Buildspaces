# Implementation Tasks
## Full Application Audit & Implementation Plan — BuildSpaces

## Phase 1 — Critical Fixes

- [x] 1. Add authentication to unprotected routes
  - [x] 1.1 Add `getServerSession` auth check to `GET /api/notebook/kernel`
  - [x] 1.2 Add `getServerSession` auth check to `POST /api/notebook/kernel`
  - [x] 1.3 Scope notebook kernel ID to authenticated user (`kernel-${session.user.id}`)
  - [x] 1.4 Add `getServerSession` auth check to `GET /api/code-chamber/tests`
  - [x] 1.5 Add `getServerSession` auth check to `POST /api/code-chamber/tests/run`
  - [x] 1.6 Add `getServerSession` auth check to `GET /api/collaboration/presence`
  - [x] 1.7 Add `getServerSession` auth check to `GET /api/collaboration/cursors`
  - [x] 1.8 Add `getServerSession` auth check to `GET /api/web3` (public chain list may remain open, wallet/contracts require auth)

- [x] 2. Replace fake test runner with real implementation
  - [x] 2.1 Rewrite `GET /api/code-chamber/tests` to read actual file from workspace filesystem and parse test blocks
  - [x] 2.2 Add path traversal protection (ensure file is within `WORKSPACE_ROOT`)
  - [x] 2.3 Rewrite `POST /api/code-chamber/tests/run` to use `lib/services/qa-testing.ts` `runTests()` method
  - [x] 2.4 Wire authentication to both test routes
  - [x] 2.5 Return real test results (pass/fail, duration, error messages) from actual test runner

- [x] 3. Add missing Prisma models and run migrations
  - [x] 3.1 Add `TheaterSession`, `TheaterPresentation`, `TheaterQAEntry`, `TheaterChatMessage` models to `prisma/schema.prisma`
  - [x] 3.2 Add `Notebook`, `NotebookCell` models
  - [x] 3.3 Add `MarketplaceTemplate`, `TemplateReview` models
  - [x] 3.4 Add `FocusSession`, `FocusAnalytics` models
  - [x] 3.5 Add `ActivityEntry` model
  - [x] 3.6 Add `AIUsageRecord` model
  - [x] 3.7 Add `VerificationSubmission` model
  - [x] 3.8 Add `CommandHistory` model
  - [x] 3.9 Run `pnpm prisma migrate dev --name add-missing-models` to generate migration
  - [x] 3.10 Update `User` model relations to include all new models

- [x] 4. Fix health check endpoint
  - [x] 4.1 Replace stub `getProviderHealth()` in `app/api/health/route.ts` with real feature flag checks
  - [x] 4.2 Report which features are enabled/disabled based on env vars
  - [x] 4.3 Return 503 when critical features (database, auth) are not configured
  - [x] 4.4 Fix same stub in `app/api/metrics/route.ts`

## Phase 2 — Persistence (Replace In-Memory Stores)

- [x] 5. Theater room persistence
  - [x] 5.1 Replace `qaStore = new Map()` in `app/api/theater/qa/route.ts` with Prisma `TheaterQAEntry` queries
  - [x] 5.2 Replace in-memory chat in `app/api/theater/chat/route.ts` with Prisma `TheaterChatMessage` queries
  - [x] 5.3 Replace in-memory reactions in `app/api/theater/reaction/route.ts` with Prisma aggregation
  - [x] 5.4 Replace in-memory presentations in `app/api/theater/presentations/route.ts` with Prisma `TheaterPresentation` queries
  - [x] 5.5 Replace in-memory viewer store in `app/api/theater/viewers/route.ts` with Redis (keep in-memory fallback)
  - [x] 5.6 Replace in-memory stream state in `app/api/theater/stream/route.ts` with Redis persistence

- [x] 6. Notebook persistence
  - [x] 6.1 Replace `notebooks = new Map()` in `app/api/notebook/cells/route.ts` with Prisma `Notebook`/`NotebookCell` queries
  - [x] 6.2 Scope notebooks to authenticated user
  - [x] 6.3 Support CRUD operations (create, read, update, delete cells)

- [x] 7. Marketplace persistence
  - [x] 7.1 Replace `publishedTemplates = new Map()` in `app/api/marketplace/publish/route.ts` with Prisma `MarketplaceTemplate` queries
  - [x] 7.2 Replace `reviewsStore = new Map()` in `app/api/marketplace/templates/[id]/reviews/route.ts` with Prisma `TemplateReview` queries
  - [x] 7.3 Update `app/api/marketplace/templates/route.ts` to query DB instead of in-memory
  - [x] 7.4 Update `app/api/marketplace/install/route.ts` to record installation in DB

- [x] 8. Deep Focus persistence
  - [x] 8.1 Replace `activeTimers = new Map()` in `app/api/deep-focus/timer/route.ts` with Redis for active state
  - [x] 8.2 Replace `sessionHistory = new Map()` in `app/api/deep-focus/sessions/route.ts` with Prisma `FocusSession` queries
  - [x] 8.3 Replace `focusAnalytics = new Map()` in `app/api/deep-focus/analytics/route.ts` with DB-computed analytics

- [x] 9. Collectibles & Economy persistence
  - [x] 9.1 Replace hardcoded demo leaderboard data in `app/api/collectibles/leaderboard/route.ts` with real DB query using `prisma.collectible.groupBy()`
  - [x] 9.2 Replace in-memory achievements in `app/api/collectibles/achievements/route.ts` with DB queries
  - [x] 9.3 Replace `mintReceipts = new Map()` in `app/api/web3/mint/route.ts` with `prisma.collectible.update()` to set `minted: true` and `transaction` hash

- [x] 10. Collaboration persistence
  - [x] 10.1 Replace `presenceStore = new Map()` in `app/api/collaboration/presence/route.ts` with Redis (TTL-based)
  - [x] 10.2 Replace `cursorStore = new Map()` in `app/api/collaboration/cursors/route.ts` with Redis (short TTL)
  - [x] 10.3 Replace `conflicts = new Map()` in `app/api/collaboration/conflicts/route.ts` with DB queries

- [x] 11. Activity & usage persistence
  - [x] 11.1 Replace in-memory activity store in `app/api/activity/route.ts` with Prisma `ActivityEntry` queries
  - [x] 11.2 Replace in-memory usage records in `app/api/ai-studio/usage/route.ts` with Prisma `AIUsageRecord` queries
  - [x] 11.3 Replace in-memory command history in `app/api/command-desk/route.ts` with Prisma `CommandHistory` queries
  - [x] 11.4 Replace in-memory conversation memory in `app/api/command-desk/stream/route.ts` with Redis (session-scoped)

- [x] 12. Verification persistence
  - [x] 12.1 Replace `submissions = new Map()` in `app/api/verification/route.ts` with Prisma `VerificationSubmission` queries
  - [x] 12.2 Remove comment "In-memory store for demo (use database in production)"

- [x] 13. Agent workflow persistence
  - [x] 13.1 Replace in-memory current workflow in `app/api/agents/workflows/current/route.ts` with DB queries
  - [x] 13.2 Ensure agent execution records are persisted via `lib/agents/persistence.ts`

## Phase 3 — Real-time Infrastructure

- [x] 14. WebSocket server setup
  - [x] 14.1 Create `server.ts` custom Next.js server with `ws` WebSocket server
  - [x] 14.2 Wire Y.js `y-websocket` server from `lib/collaboration/server.ts` to the WebSocket server
  - [x] 14.3 Implement WebSocket authentication using NextAuth session token validation
  - [x] 14.4 Add room-based routing (clients join rooms by ID)
  - [x] 14.5 Update `package.json` start script to use custom server

- [x] 15. Presence via WebSocket
  - [x] 15.1 Replace HTTP polling in collaboration presence with WebSocket push
  - [x] 15.2 Broadcast presence join/leave/update events to all room members
  - [x] 15.3 Implement stale presence cleanup on WebSocket disconnect
  - [x] 15.4 Update `components/rooms/collaboration-pod/CollaborationPod.tsx` to use WebSocket

- [x] 16. Cursor sync via WebSocket
  - [x] 16.1 Replace HTTP polling in cursor sync with WebSocket push
  - [x] 16.2 Broadcast cursor position updates to all room members in real-time
  - [x] 16.3 Wire Y.js awareness protocol for cursor positions via `y-monaco`

- [x] 17. SSE for notifications
  - [x] 17.1 Create `GET /api/notifications/stream` SSE endpoint
  - [x] 17.2 Push new notifications to connected clients via SSE
  - [x] 17.3 Create `GET/POST /api/notifications` CRUD endpoint using `Notification` Prisma model

## Phase 4 — Backend Services

- [x] 18. LSP Broker Service
  - [x] 18.1 Promote `scripts/lsp-broker.ts` to `services/lsp-broker/index.ts` as a proper long-running service
  - [x] 18.2 Implement TypeScript/JavaScript LSP support via `typescript-language-server --stdio`
  - [x] 18.3 Implement Python LSP support via `pylsp`
  - [x] 18.4 Implement HTTP POST endpoint that accepts JSON-RPC LSP messages and returns responses
  - [x] 18.5 Wire `lib/services/language-servers.ts` methods to call the broker via `LSP_BACKEND_URL`
  - [x] 18.6 Add health check endpoint to broker
  - [x] 18.7 Add `lsp-broker` service to `docker-compose.yml`

- [x] 19. DAP Broker Service
  - [x] 19.1 Create `services/dap-broker/index.ts` DAP broker service
  - [x] 19.2 Implement Node.js debugging via `@vscode/debugadapter`
  - [x] 19.3 Implement Python debugging via `debugpy`
  - [x] 19.4 Wire `lib/services/debug-adapter.ts` to call the broker via `DAP_BACKEND_URL`
  - [x] 19.5 Add `dap-broker` service to `docker-compose.yml`

## Phase 5 — Authentication Flows

- [x] 20. Password reset
  - [x] 20.1 Enable password reset when `AUTH_PASSWORD_RESET_ENABLED=true` and `RESEND_API_KEY` are set
  - [x] 20.2 Generate cryptographically secure reset tokens stored in `Token` model
  - [x] 20.3 Send branded reset email via Resend
  - [x] 20.4 Implement token validation and single-use enforcement
  - [x] 20.5 Add rate limiting (max 3 requests per email per hour)

- [x] 21. Email verification
  - [x] 21.1 Enable email verification when `AUTH_EMAIL_VERIFICATION_ENABLED=true` is set
  - [x] 21.2 Send verification email on registration via Resend
  - [x] 21.3 Implement 24-hour token expiry
  - [x] 21.4 Add re-send verification endpoint

- [x] 22. OAuth provider validation
  - [x] 22.1 Validate GitHub OAuth credentials are configured before enabling GitHub login
  - [x] 22.2 Validate Google OAuth credentials are configured before enabling Google login
  - [x] 22.3 Implement account linking when OAuth email matches existing account

## Phase 6 — Code Quality & Cleanup

- [x] 23. Remove duplicate and backup files
  - [x] 23.1 Delete `components/workspace/copilot-chat-panel.tsx.bak`
  - [x] 23.2 Delete `components/rooms/ai-studio/AgentMetrics.tsx.backup`
  - [x] 23.3 Delete `app/page.old.tsx`
  - [x] 23.4 Consolidate `components/rooms/deep-focus/deep-focus.tsx` and `DeepFocus.tsx` into one canonical file
  - [x] 23.5 Consolidate duplicate `workbench-layout.tsx` files
  - [x] 23.6 Consolidate duplicate `activity-bar.tsx` files
  - [x] 23.7 Consolidate duplicate `status-bar.tsx` files
  - [x] 23.8 Update all imports to reference canonical versions

- [x] 24. Fix hardcoded values
  - [x] 24.1 Replace hardcoded `agentCount={3}` and `activeAgents={1}` in `app/workspace/page.tsx` with real agent orchestrator data
  - [x] 24.2 Replace hardcoded "Active" agent status in dashboard with real health check results
  - [x] 24.3 Remove `'fake-key'` fallback in `app/api/code-chamber/chat/route.ts`
  - [x] 24.4 Remove `// Mock success` response in `app/api/ai-test/route.ts`

- [x] 25. Environment variable validation
  - [x] 25.1 Add startup validation in `next.config.mjs` for required production env vars
  - [x] 25.2 Update `.env.example` with all required variables and documentation
  - [x] 25.3 Add `PISTON_API_URL`, `LSP_BACKEND_URL`, `DAP_BACKEND_URL` to K8s secrets manifest

- [x] 26. Docker & Kubernetes updates
  - [x] 26.1 Add Piston service to `docker-compose.yml`
  - [x] 26.2 Add LSP broker service to `docker-compose.yml`
  - [x] 26.3 Add DAP broker service to `docker-compose.yml`
  - [x] 26.4 Add K8s deployment manifests for LSP broker and DAP broker
  - [x] 26.5 Add health checks to all Docker services

- [x] 27. Missing API routes
  - [x] 27.1 Implement `GET/POST /api/notifications` using `Notification` Prisma model
  - [x] 27.2 Implement `GET/PUT /api/subscriptions` for subscription management
  - [x] 27.3 Implement `GET /api/projects/[projectId]/snapshot` for project state snapshots
  - [x] 27.4 Implement `GET /api/agents/sessions/[executionId]` for execution session details

- [x] 28. Input validation hardening
  - [x] 28.1 Add Zod schema validation to all POST/PUT routes that currently lack it
  - [x] 28.2 Ensure all routes return 400 with field-level errors on invalid input
  - [x] 28.3 Add request size limits to file upload and code execution routes

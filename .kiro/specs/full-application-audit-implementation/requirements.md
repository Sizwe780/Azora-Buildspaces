# Requirements Document
## Full Application Audit & Implementation Plan — BuildSpaces

### Introduction

BuildSpaces is a cloud-based IDE platform with 12 specialized workspace rooms, Constitutional AI governance, an AZR token economy, and a full AI agent ecosystem. This document captures every gap, stub, mock, placeholder, and missing implementation found during a comprehensive codebase audit. It serves as the single source of truth for bringing the application to full production functionality.

---

## 1. Core Infrastructure

### 1.1 Database Configuration & Migrations

**Current State:** `DATABASE_URL` is optional — when absent, a proxy object silently swallows all DB calls. No migration files exist in the repo. The Prisma schema is 2080 lines with 50+ models but there is no evidence migrations have been applied.

**Requirements:**
- The application MUST fail fast with a clear error if `DATABASE_URL` is not set in production
- Prisma migrations MUST be committed to the repo and applied as part of CI/CD
- A seed script MUST populate required lookup data (skills, reward rates, subscription tiers)
- The database proxy MUST log a structured error and return a 503 response rather than throwing unhandled exceptions

**Correctness Properties:**
- Every API route that reads/writes data MUST return a 503 with `{ error: "Database unavailable" }` when the DB is unreachable, not a 500 with an internal stack trace
- All Prisma model operations MUST be wrapped in try/catch with typed error handling

**Priority:** Critical

### 1.2 Missing Prisma Models

**Current State:** The following features have in-memory stores but NO corresponding Prisma models, meaning all data is lost on every server restart:

- Theater sessions (presentations, Q&A, chat, reactions, viewers)
- Notebook cells and notebooks
- Marketplace templates and reviews
- Deep Focus sessions and analytics
- Command history per user
- Collaboration presence and cursor positions
- Activity feed entries
- AI Studio token usage records
- Agent workflow execution records
- Verification submissions

**Requirements:**
- Add `TheaterSession`, `TheaterPresentation`, `TheaterQAEntry`, `TheaterChatMessage`, `TheaterReaction` models
- Add `Notebook`, `NotebookCell` models
- Add `MarketplaceTemplate`, `TemplateReview` models
- Add `FocusSession`, `FocusAnalytics` models
- Add `CommandHistory` model
- Add `ActivityEntry` model
- Add `AIUsageRecord` model
- Add `AgentExecution`, `AgentWorkflow` models (beyond what exists)
- Add `VerificationSubmission` model
- All models MUST have `userId` foreign keys and proper cascade deletes

**Priority:** Critical

### 1.3 Environment Variable Configuration

**Current State:** Many features are silently disabled when env vars are absent. There is no startup validation that warns operators which features are non-functional.

**Required Environment Variables (currently undocumented or missing):**

| Variable | Purpose | Default Behavior When Missing |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection | All DB features broken |
| `NEXTAUTH_SECRET` | Session signing | Auth broken in production |
| `AUTH_PASSWORD_RESET_ENABLED` | Enable password reset | Reset disabled |
| `AUTH_EMAIL_VERIFICATION_ENABLED` | Enable email verification | Verification disabled |
| `RESEND_API_KEY` | Email sending | Falls back to console.log |
| `PISTON_API_URL` | Code execution sandbox | Falls back to public rate-limited instance |
| `LSP_BACKEND_ENABLED` | Language server features | All LSP features throw errors |
| `DAP_BACKEND_ENABLED` | Debug adapter features | All debug features return 503 |
| `QA_WATCH_MODE_ENABLED` | Test watch mode | Watch mode disabled |
| `FIGMA_TOKEN` | Figma import | Import non-functional |
| `REDIS_URL` | Real-time pub/sub | Falls back to in-memory (no persistence) |
| `WEB3_BRIDGE_URL` | NFT minting bridge | Minting records as "pending" forever |
| `LOCAL_LLM_API_URL` | Local Mistral model | Local AI unavailable |
| `WORKSPACE_COMMANDS_ENABLED` | Deploy commands | Deploy disabled |
| `GITHUB_CLIENT_ID/SECRET` | GitHub OAuth | GitHub login broken |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth | Google login broken |
| `OPENAI_API_KEY` | AI features | AI features broken |

**Requirements:**
- A startup health check endpoint (`/api/health`) MUST report which features are enabled/disabled based on env vars
- `.env.example` MUST be kept up to date with all required variables and documentation
- Production deployments MUST validate required vars before accepting traffic

**Priority:** Critical

---

## 2. Authentication & Security

### 2.1 Password Reset Flow

**Current State:** Password reset is disabled by default (`AUTH_PASSWORD_RESET_ENABLED !== 'true'`). The route exists but returns a 503 when the flag is not set.

**Requirements:**
- Password reset MUST work when `RESEND_API_KEY` and `AUTH_PASSWORD_RESET_ENABLED=true` are set
- Reset tokens MUST be stored in the `Token` model with a 1-hour expiry
- Reset emails MUST be sent via Resend with a branded template
- Tokens MUST be single-use and invalidated after use
- Rate limiting MUST prevent abuse (max 3 reset requests per email per hour)

**Correctness Properties:**
- A reset token used once MUST be rejected on second use
- An expired token (>1 hour) MUST be rejected
- A valid token MUST allow password change and then be invalidated

**Priority:** High

### 2.2 Email Verification

**Current State:** Email verification is disabled by default (`AUTH_EMAIL_VERIFICATION_ENABLED !== 'true'`).

**Requirements:**
- Email verification MUST send a verification link on registration when enabled
- Verification tokens MUST expire after 24 hours
- Unverified users MUST be restricted from accessing paid features
- Re-send verification email endpoint MUST be available

**Priority:** High

### 2.3 OAuth Providers

**Current State:** GitHub and Google OAuth providers are configured in `lib/auth/providers.ts` but require env vars that are not validated at startup.

**Requirements:**
- OAuth login MUST work when provider credentials are configured
- OAuth accounts MUST be linked to existing email accounts when the email matches
- Failed OAuth MUST redirect to `/auth/error` with a descriptive message

**Priority:** High

---

## 3. BuildSpaces Rooms — Functional Gaps

### 3.1 Code Chamber — Test Runner (CRITICAL STUB)

**Current State:**
- `GET /api/code-chamber/tests?file=` returns 5 hardcoded fake test names regardless of the actual file content
- `POST /api/code-chamber/tests/run` simulates test execution using `Math.random() > 0.1` for pass/fail with random error messages — this is completely fake

**Requirements:**
- Test discovery MUST read the actual file from the workspace filesystem and parse `describe`/`it`/`test` blocks
- Test execution MUST invoke the real test runner (Jest or Vitest) via `child_process.spawn` for the specified file
- Results MUST include real pass/fail status, actual error messages, and real durations
- The existing `lib/services/qa-testing.ts` service MUST be wired to these routes
- Authentication MUST be required for test execution

**Correctness Properties:**
- Running a test file with a known failing test MUST return `pass: false` with the actual error message
- Running a test file with all passing tests MUST return `pass: true` for all
- Test discovery on a file with 3 `it()` blocks MUST return exactly 3 tests

**Priority:** Critical

### 3.2 Code Chamber — Language Server Protocol

**Current State:** All LSP methods in `lib/services/language-servers.ts` throw `"requires broker integration implementation"` errors. The service requires `LSP_BACKEND_ENABLED=true` but no broker exists.

**Requirements:**
- An LSP broker script (`scripts/lsp-broker.ts`) MUST be promoted to a proper service
- The broker MUST proxy LSP requests to language-specific servers (typescript-language-server, pylsp, etc.)
- Completions, hover, go-to-definition, diagnostics, and formatting MUST work for TypeScript/JavaScript at minimum
- The broker MUST be startable via `npm run lsp-broker` and configurable via `LSP_BACKEND_URL`
- Graceful degradation: when LSP is unavailable, the editor MUST still function without crashing

**Priority:** High

### 3.3 Code Chamber — Debug Adapter Protocol

**Current State:** All debug operations return 503 "Debug adapter backend is not configured" when `DAP_BACKEND_ENABLED` is not set. No DAP broker exists.

**Requirements:**
- A DAP broker service MUST be implemented that proxies DAP requests to language-specific debug adapters
- Node.js debugging MUST work at minimum (using `@vscode/debugadapter`)
- Breakpoints, step-over, step-into, step-out, continue, pause MUST function
- Variable inspection and watch expressions MUST return real values
- The broker MUST be configurable via `DAP_BACKEND_URL`

**Priority:** High

### 3.4 AI Studio Room

**Current State:**
- Token usage records stored in-memory (lost on restart, max 50k records)
- Agent workflow executions not persisted to DB
- Current workflow state stored in-memory

**Requirements:**
- Token usage MUST be persisted to `AIUsageRecord` DB model
- Agent workflow executions MUST be persisted to `AgentExecution` DB model
- Workflow state MUST survive server restarts
- Usage analytics MUST be queryable by user, date range, and model

**Priority:** High

### 3.5 Collaboration Pod Room

**Current State:**
- Presence tracking uses HTTP polling (GET every N seconds) — not real-time
- Cursor sync uses HTTP polling — not real-time
- Video conferencing component exists but WebRTC signaling is not implemented
- All collaboration data is in-memory

**Requirements:**
- Presence MUST be updated via WebSocket or SSE, not polling
- Cursor positions MUST be broadcast in real-time via Y.js or WebSocket
- Collaboration data MUST be persisted to Redis (with DB fallback)
- Video conferencing MUST implement WebRTC signaling via the existing `simple-peer` package
- Y.js collaborative editing MUST be wired to the Monaco editor via `y-monaco`

**Correctness Properties:**
- When user A moves their cursor, user B MUST see the update within 200ms
- When a user disconnects, their presence MUST be removed within the stale timeout period

**Priority:** High

### 3.6 Innovation Theater Room

**Current State:** All theater data (Q&A, chat, reactions, presentations, viewers) is in-memory. Data is lost on server restart. Comments in code say "production: use database".

**Requirements:**
- Theater sessions MUST be persisted to DB
- Q&A entries MUST be persisted and retrievable after page refresh
- Chat messages MUST be persisted
- Reactions MUST be aggregated and persisted
- Viewer presence MUST use Redis pub/sub when available
- Presentations MUST be persisted with slide content

**Priority:** High

### 3.7 Deep Focus Room

**Current State:** Timer state, focus sessions, and analytics are all in-memory Maps.

**Requirements:**
- Active timer state MUST be persisted to Redis (for cross-request consistency)
- Completed focus sessions MUST be persisted to `FocusSession` DB model
- Analytics MUST be computed from persisted session data
- Timer MUST resume correctly after page refresh

**Priority:** Medium

### 3.8 Maker Lab Room

**Current State:** Circuit simulator and firmware editor components exist but their backend integration needs verification.

**Requirements:**
- Circuit simulator MUST have a working simulation engine (or clearly documented as client-side only)
- Component generation MUST call the real AI endpoint
- Database designer MUST generate valid SQL/Prisma schema output
- API endpoint generator MUST produce working Next.js route code

**Priority:** Medium

### 3.9 Knowledge Ocean Room

**Current State:** Knowledge graph conversations stored in-memory. Semantic indexer requires ChromaDB or similar.

**Requirements:**
- Knowledge graph conversations MUST be persisted to DB
- Semantic search MUST work with the installed `chromadb` package or `minisearch` as fallback
- File indexing MUST scan the workspace and build a searchable index
- Search results MUST include file path, line number, and snippet

**Priority:** Medium

### 3.10 Marketplace Room

**Current State:** Published templates and reviews are in-memory Maps with comments saying "replace with DB in production".

**Requirements:**
- Templates MUST be persisted to `MarketplaceTemplate` DB model
- Reviews MUST be persisted to `TemplateReview` DB model
- Template install MUST record the installation in DB
- Template search MUST query the DB, not an in-memory array

**Priority:** Medium

### 3.11 Collectibles & Economy

**Current State:**
- Leaderboard has hardcoded demo data (`demo-1 "Naledi"`, etc.)
- Achievements stored in in-memory arrays
- Web3 mint receipts stored in in-memory Map

**Requirements:**
- Leaderboard MUST be computed from real `Collectible` and `User` DB records
- Achievements MUST be persisted to DB and linked to users
- Mint receipts MUST be persisted to DB
- The hardcoded demo leaderboard data MUST be removed

**Correctness Properties:**
- Leaderboard rank MUST be deterministic — same data MUST produce same ranking
- A minted collectible MUST appear in the owner's collection after page refresh

**Priority:** High

---

## 4. API Layer

### 4.1 Missing API Routes

**Current State:** Several features have UI components but missing or incomplete API routes.

**Requirements:**
- `GET/POST /api/notifications` — CRUD for the `Notification` Prisma model
- `GET/PUT /api/subscriptions` — Subscription management
- `GET /api/projects/[projectId]/snapshot` — Project state snapshot
- `GET/POST /api/agents/sessions/[executionId]` — Agent execution session details
- `GET/POST /api/users/[userId]` — User profile management (admin)
- `POST /api/workspace-persistence` — Full workspace state save/restore

**Priority:** High

### 4.2 Authentication Missing on Public Routes

**Current State:** Several API routes lack authentication checks:
- `GET /api/collaboration/presence` — no auth
- `GET /api/collaboration/cursors` — no auth
- `GET /api/notebook/kernel` — no auth
- `POST /api/notebook/kernel` — no auth
- `GET /api/code-chamber/tests` — no auth
- `POST /api/code-chamber/tests/run` — no auth
- `GET /api/web3` — no auth

**Requirements:**
- Every API route that reads or writes user data MUST require authentication
- Unauthenticated requests MUST return 401
- Public read-only endpoints (health, chains list) MAY remain unauthenticated

**Priority:** Critical

### 4.3 Input Validation

**Current State:** Many routes parse `req.json()` without schema validation, relying on runtime checks.

**Requirements:**
- All POST/PUT routes MUST validate request bodies using Zod schemas
- Invalid input MUST return 400 with field-level error details
- SQL injection and XSS vectors MUST be sanitized

**Priority:** High

---

## 5. Real-time Infrastructure

### 5.1 WebSocket Server

**Current State:** No WebSocket server exists. Collaboration features use HTTP polling. Y.js, y-websocket, y-webrtc, and y-monaco are all installed but not wired up.

**Requirements:**
- A WebSocket server MUST be implemented (using the installed `ws` package or Next.js custom server)
- Y.js document sync MUST be served over WebSocket for collaborative editing
- Presence updates MUST be pushed via WebSocket, not polled
- The WebSocket server MUST authenticate connections using the NextAuth session token
- Reconnection with exponential backoff MUST be implemented on the client

**Correctness Properties:**
- Two clients editing the same document MUST converge to the same state (Y.js CRDT guarantee)
- A client that disconnects and reconnects MUST receive all missed updates

**Priority:** High

### 5.2 Server-Sent Events (SSE)

**Current State:** Agent stream (`/api/agents/stream`) uses SSE correctly. Theater stream uses SSE with Redis fallback. Other real-time features use polling.

**Requirements:**
- Notification delivery MUST use SSE (`/api/notifications/stream`)
- Activity feed updates MUST use SSE
- Build/deploy status MUST stream via SSE

**Priority:** Medium

---

## 6. LSP & DAP Integration

### 6.1 LSP Broker Service

**Current State:** `scripts/lsp-broker.ts` exists as a script. The `lib/services/language-servers.ts` service throws errors for all operations.

**Requirements:**
- The LSP broker MUST be a proper long-running service (not a one-shot script)
- It MUST support TypeScript/JavaScript via `typescript-language-server`
- It MUST support Python via `pylsp`
- It MUST proxy JSON-RPC messages between the Next.js API and the language server process
- Health check endpoint MUST report which language servers are running
- The broker URL MUST be configurable via `LSP_BACKEND_URL`

**Priority:** High

### 6.2 DAP Broker Service

**Current State:** No DAP broker exists. All debug operations return 503.

**Requirements:**
- The DAP broker MUST support Node.js debugging via `@vscode/debugadapter`
- It MUST support Python debugging via `debugpy`
- Breakpoints MUST be set before and during execution
- Variable inspection MUST return real runtime values
- The broker URL MUST be configurable via `DAP_BACKEND_URL`

**Priority:** High

---

## 7. Testing Infrastructure

### 7.1 Real Test Runner Integration

**Current State:** `POST /api/code-chamber/tests/run` uses `Math.random()` for pass/fail. This is a critical fake implementation.

**Requirements:**
- The route MUST use `lib/services/qa-testing.ts` which already has real `child_process.spawn` integration
- Test results MUST reflect actual test outcomes
- The route MUST support Jest, Vitest, and Mocha frameworks
- Coverage reports MUST be read from `coverage/coverage-summary.json` when available
- Authentication MUST be required

**Priority:** Critical

### 7.2 Test Discovery

**Current State:** `GET /api/code-chamber/tests` returns hardcoded fake test arrays.

**Requirements:**
- The route MUST read the actual file content from the workspace filesystem
- It MUST parse `describe`, `it`, `test`, `beforeEach`, `afterEach` blocks
- It MUST return the actual line numbers of each test
- It MUST handle TypeScript, JavaScript, JSX, and TSX files

**Priority:** Critical

### 7.3 Application Test Coverage

**Current State:** Test coverage is sparse. Most API routes have no tests.

**Requirements:**
- Every API route MUST have at least one integration test
- Authentication middleware MUST have unit tests
- The economy/mining engine MUST have property-based tests
- Critical paths (auth, payment, token award) MUST have 90%+ coverage

**Priority:** High

---

## 8. Economy & Web3

### 8.1 Token Economy Persistence

**Current State:** Mining engine uses DB via Prisma but some routes bypass it with in-memory stores.

**Requirements:**
- All token transactions MUST be persisted to the `Transaction` DB model
- Token balance MUST be computed from DB records, not in-memory state
- The `miningEngine.getBalance()` MUST query the DB
- Transaction history MUST be paginated

**Priority:** High

### 8.2 Web3 Mint Receipts

**Current State:** Mint receipts stored in `mintReceipts = new Map()` — lost on restart.

**Requirements:**
- Mint receipts MUST be persisted to the `Collectible` DB model
- The `minted` flag MUST be set to `true` after successful minting
- The `transaction` field MUST store the real transaction hash
- Pending mints MUST be retried when the bridge becomes available

**Priority:** High

### 8.3 Collectibles Leaderboard

**Current State:** Leaderboard has hardcoded demo data with fake users.

**Requirements:**
- Leaderboard MUST be computed from real `Collectible` records grouped by `ownerId`
- It MUST be cached (Redis or in-memory with TTL) to avoid expensive DB queries on every request
- Demo data MUST be removed
- Pagination MUST be supported

**Priority:** High

---

## 9. Code Quality & Cleanup

### 9.1 Duplicate & Backup Files

**Current State:** Multiple duplicate and backup files exist in the production codebase.

**Files to remove or consolidate:**
- `components/workspace/copilot-chat-panel.tsx.bak`
- `components/rooms/ai-studio/AgentMetrics.tsx.backup`
- `app/page.old.tsx`
- `components/rooms/deep-focus/deep-focus.tsx` (duplicate of `DeepFocus.tsx`)
- `components/workspace/workbench-layout.tsx` (duplicate of `layout/workbench-layout.tsx`)
- `components/workspace/activity-bar.tsx` (duplicate of `layout/activity-bar.tsx`)
- `components/workspace/status-bar.tsx` (duplicate of `layout/status-bar.tsx`)

**Requirements:**
- All `.bak` and `.backup` files MUST be removed from the codebase
- Duplicate components MUST be consolidated to a single canonical version
- All imports MUST be updated to reference the canonical version

**Priority:** Medium

### 9.2 Hardcoded Values

**Current State:** Several places have hardcoded values that should be configurable:
- `agentCount={3}` and `activeAgents={1}` hardcoded in `StatusBar` props in `workspace/page.tsx`
- Agent status always shows "Active" with green dot in dashboard (not real status)
- `fake-key` used as OpenAI API key fallback in `code-chamber/chat/route.ts`

**Requirements:**
- Agent count MUST be fetched from the real agent orchestrator
- Agent status MUST reflect real health check results
- API key fallbacks MUST never use placeholder strings like `fake-key`

**Priority:** Medium

### 9.3 Missing Auth on Notebook Routes

**Current State:** `GET /api/notebook/kernel` and `POST /api/notebook/kernel` have no authentication. The notebook executes arbitrary TypeScript in a VM sandbox — this MUST be protected.

**Requirements:**
- All notebook routes MUST require authentication
- Kernel state MUST be scoped per user (not shared across all users)
- The kernel ID MUST be derived from the authenticated user's session

**Priority:** Critical

---

## 10. Deployment & Infrastructure

### 10.1 Docker Compose

**Current State:** `docker-compose.yml` exists but is missing services for LSP broker, DAP broker, and Piston code execution.

**Requirements:**
- `docker-compose.yml` MUST include a Piston service for local development
- `docker-compose.yml` MUST include an LSP broker service
- `docker-compose.yml` MUST include a DAP broker service
- All services MUST have health checks
- Environment variable documentation MUST be in `docker-compose.yml` comments

**Priority:** High

### 10.2 Kubernetes

**Current State:** K8s manifests exist for the main app, PostgreSQL, and Redis. Missing services for LSP/DAP brokers and Piston.

**Requirements:**
- K8s manifests MUST include deployments for LSP broker, DAP broker, and Piston
- Secrets MUST be managed via `buildspaces-secrets.yaml` (not hardcoded)
- Horizontal pod autoscaling MUST be configured for the main app
- Liveness and readiness probes MUST be configured

**Priority:** Medium

### 10.3 CI/CD Pipeline

**Current State:** `.github/workflows/` exists but content is unknown.

**Requirements:**
- CI MUST run `pnpm prisma:generate` before building
- CI MUST run the full test suite
- CI MUST fail if TypeScript compilation fails
- CD MUST run `pnpm prisma:migrate deploy` before deploying
- Environment variables MUST be injected from GitHub Secrets

**Priority:** High

---

## Summary of Priorities

### Critical (Must fix before any production use)
1. Fake test runner (`/api/code-chamber/tests/run`) — returns random results
2. Fake test discovery (`/api/code-chamber/tests`) — returns hardcoded tests
3. Missing auth on notebook routes — arbitrary code execution exposed
4. Missing auth on collaboration/cursor routes
5. Database not configured = silent failures
6. Missing Prisma migrations

### High (Required for core functionality)
7. In-memory stores → DB persistence (20+ routes)
8. LSP broker service
9. DAP broker service
10. Real-time WebSocket infrastructure
11. Password reset and email verification
12. Theater room persistence
13. Collectibles leaderboard (remove hardcoded demo data)
14. Web3 mint receipt persistence
15. Missing API routes (notifications, subscriptions)

### Medium (Important for completeness)
16. Deep Focus persistence
17. Knowledge Ocean vector search
18. Marketplace persistence
19. Duplicate file cleanup
20. Docker/K8s service additions
21. SSE for notifications and activity feed

### Low (Polish and optimization)
22. Hardcoded agent status in dashboard
23. Performance profiling integration
24. Full E2E test coverage
25. API documentation (OpenAPI spec update)

# Design Document
## Full Application Audit & Implementation Plan — BuildSpaces

### Overview

This design document translates the audit findings into concrete technical decisions, architecture changes, and implementation patterns. It covers the system-level changes needed to move BuildSpaces from a partially-stubbed prototype to a fully functional production application.

---

## 1. Core Infrastructure Design

### 1.1 Database Persistence Strategy

**Decision:** Replace all in-memory `Map` stores with Prisma DB calls. Use Redis as a caching/pub-sub layer where low-latency is required (presence, cursors, timers).

**Pattern for migrating in-memory stores:**
```typescript
// BEFORE (in-memory)
const qaStore = new Map<string, QAEntry[]>()

// AFTER (DB-backed with Redis cache)
async function getQAEntries(sessionId: string): Promise<QAEntry[]> {
  const cached = await redis?.get(`qa:${sessionId}`)
  if (cached) return JSON.parse(cached)
  const entries = await prisma.theaterQAEntry.findMany({ where: { sessionId } })
  await redis?.setex(`qa:${sessionId}`, 60, JSON.stringify(entries))
  return entries
}
```

**New Prisma Models to add to `prisma/schema.prisma`:**

```prisma
model TheaterSession {
  id          String   @id @default(cuid())
  userId      String
  title       String
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  presentations TheaterPresentation[]
  qaEntries   TheaterQAEntry[]
  chatMessages TheaterChatMessage[]
  @@map("theater_sessions")
}

model TheaterPresentation {
  id          String   @id @default(cuid())
  sessionId   String
  title       String
  slides      Json
  activeIndex Int      @default(0)
  createdAt   DateTime @default(now())
  session     TheaterSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  @@map("theater_presentations")
}

model TheaterQAEntry {
  id          String   @id @default(cuid())
  sessionId   String
  userId      String?
  displayName String
  question    String
  upvotes     Int      @default(0)
  answered    Boolean  @default(false)
  createdAt   DateTime @default(now())
  session     TheaterSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  @@map("theater_qa_entries")
}

model TheaterChatMessage {
  id          String   @id @default(cuid())
  sessionId   String
  userId      String?
  displayName String
  content     String
  pinned      Boolean  @default(false)
  createdAt   DateTime @default(now())
  session     TheaterSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  @@map("theater_chat_messages")
}

model Notebook {
  id        String         @id @default(cuid())
  userId    String
  title     String         @default("Untitled Notebook")
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  cells     NotebookCell[]
  @@map("notebooks")
}

model NotebookCell {
  id         String   @id @default(cuid())
  notebookId String
  type       String   @default("code")
  content    String
  output     String?
  order      Int
  createdAt  DateTime @default(now())
  notebook   Notebook @relation(fields: [notebookId], references: [id], onDelete: Cascade)
  @@map("notebook_cells")
}

model MarketplaceTemplate {
  id          String   @id @default(cuid())
  publisherId String
  name        String
  description String
  category    String
  tags        String[]
  files       Json
  price       Float    @default(0)
  downloads   Int      @default(0)
  rating      Float    @default(0)
  status      String   @default("published")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  publisher   User     @relation(fields: [publisherId], references: [id], onDelete: Cascade)
  reviews     TemplateReview[]
  @@map("marketplace_templates")
}

model TemplateReview {
  id         String   @id @default(cuid())
  templateId String
  userId     String
  rating     Int
  comment    String?
  createdAt  DateTime @default(now())
  template   MarketplaceTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([templateId, userId])
  @@map("template_reviews")
}

model FocusSession {
  id          String    @id @default(cuid())
  userId      String
  duration    Int       // minutes
  mode        String    @default("pomodoro")
  completed   Boolean   @default(false)
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@map("focus_sessions")
}

model ActivityEntry {
  id        String   @id @default(cuid())
  userId    String
  type      String
  room      String?
  metadata  Json?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
  @@map("activity_entries")
}

model AIUsageRecord {
  id         String   @id @default(cuid())
  userId     String
  model      String
  provider   String
  inputTokens  Int    @default(0)
  outputTokens Int    @default(0)
  cost       Float    @default(0)
  room       String?
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
  @@map("ai_usage_records")
}

model VerificationSubmission {
  id          String   @id @default(cuid())
  userId      String
  type        String
  status      String   @default("pending")
  data        Json
  reviewedAt  DateTime?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("verification_submissions")
}
```

### 1.2 Startup Health Check Design

**File:** `app/api/health/route.ts` (replace stub)

```typescript
export async function GET() {
  const features = {
    database: !!process.env.DATABASE_URL,
    redis: !!process.env.REDIS_URL,
    auth: !!process.env.NEXTAUTH_SECRET,
    email: !!process.env.RESEND_API_KEY,
    codeExecution: !!process.env.PISTON_API_URL,
    lsp: process.env.LSP_BACKEND_ENABLED === 'true',
    dap: process.env.DAP_BACKEND_ENABLED === 'true',
    figma: !!process.env.FIGMA_TOKEN,
    web3Bridge: !!process.env.WEB3_BRIDGE_URL,
    openai: !!process.env.OPENAI_API_KEY,
  }
  const allCritical = features.database && features.auth
  return NextResponse.json({ status: allCritical ? 'ok' : 'degraded', features }, 
    { status: allCritical ? 200 : 503 })
}
```

---

## 2. Authentication Design

### 2.1 Password Reset Flow

```
User → POST /api/auth/forgot-password
  → Generate token (crypto.randomBytes(32).toString('hex'))
  → Store in Token model (type: RESET_PASSWORD, expires: +1hr)
  → Send email via Resend with link: /auth/reset-password?token=xxx
  → Return 200 (always, to prevent email enumeration)

User → POST /api/auth/reset-password { token, newPassword }
  → Find Token where token=xxx AND type=RESET_PASSWORD AND expiresAt > now
  → Hash new password with bcrypt
  → Update User.password
  → Delete the token (single-use)
  → Return 200
```

### 2.2 Kernel Auth Scoping

**File:** `app/api/notebook/kernel/route.ts`

The kernel ID MUST be derived from the authenticated user:
```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.id) return NextResponse.json({ error: 'Auth required' }, { status: 401 })
const kernelId = `kernel-${session.user.id}` // scoped per user
```

---

## 3. Real-time Infrastructure Design

### 3.1 WebSocket Server Architecture

**Approach:** Use Next.js custom server with `ws` package. The Y.js `y-websocket` server handles collaborative editing. A separate presence channel handles cursor/presence updates.

**File structure:**
```
server.ts                    ← Custom Next.js server
lib/collaboration/
  server.ts                  ← Y.js WebSocket server (already exists, needs wiring)
  presence.ts                ← Presence pub/sub (already exists, needs wiring)
  monaco-binding.ts          ← Y.js ↔ Monaco binding (already exists)
```

**Connection flow:**
```
Client connects to ws://host/api/collab?room=<roomId>&token=<sessionToken>
  → Server validates token via NextAuth
  → Server joins Y.js document for roomId
  → Server subscribes to Redis presence channel for roomId
  → Client receives initial document state + presence list
  → Client sends updates → Server broadcasts to all room members
```

### 3.2 Presence & Cursor Design

**Replace HTTP polling with WebSocket push:**

```typescript
// Client sends cursor update via WebSocket message
ws.send(JSON.stringify({ type: 'cursor', line: 10, column: 5, file: 'src/index.ts' }))

// Server broadcasts to all room members
room.clients.forEach(client => {
  if (client !== ws && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({ type: 'cursor', userId, ...cursorData }))
  }
})
```

---

## 4. Test Runner Design

### 4.1 Real Test Discovery

**File:** `app/api/code-chamber/tests/route.ts` (replace stub)

```typescript
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Auth required' }, { status: 401 })

  const file = request.nextUrl.searchParams.get('file')
  if (!file) return NextResponse.json({ tests: [] })

  const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd()
  const filePath = path.resolve(workspaceRoot, file)
  
  // Security: ensure file is within workspace
  if (!filePath.startsWith(workspaceRoot)) {
    return NextResponse.json({ error: 'Path traversal denied' }, { status: 403 })
  }

  const content = await readFile(filePath, 'utf-8')
  const tests = parseTestFile(content, path.basename(file))
  return NextResponse.json({ tests })
}
```

### 4.2 Real Test Execution

**File:** `app/api/code-chamber/tests/run/route.ts` (replace stub)

```typescript
import { qaTesting } from '@/lib/services/qa-testing'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Auth required' }, { status: 401 })

  const { file, framework = 'jest' } = await request.json()
  
  const run = await qaTesting.runTests({
    framework,
    testDir: path.dirname(file),
    pattern: path.basename(file),
    coverage: false,
    watch: false,
    parallel: false,
    timeout: 30000,
    env: {},
  })

  return NextResponse.json({ results: run.suites.flatMap(s => s.tests), summary: { ... } })
}
```

---

## 5. LSP Broker Design

### 5.1 Architecture

```
Next.js API (/api/lsp) ←→ LSP Broker (Node.js service) ←→ Language Server Process
```

**File:** `scripts/lsp-broker.ts` → promote to `services/lsp-broker/index.ts`

The broker:
1. Accepts HTTP POST requests with JSON-RPC LSP messages
2. Maintains a pool of language server processes (one per language)
3. Forwards messages to the appropriate process via stdio
4. Returns responses as JSON

**Supported languages (Phase 1):**
- TypeScript/JavaScript: `typescript-language-server --stdio`
- Python: `pylsp`

**Environment:**
- `LSP_BACKEND_URL=http://localhost:3001` (broker URL)
- `LSP_BACKEND_ENABLED=true` (enable in Next.js)

---

## 6. Economy & Collectibles Design

### 6.1 Leaderboard (Remove Hardcoded Data)

**File:** `app/api/collectibles/leaderboard/route.ts`

```typescript
// Replace hardcoded array with DB query
const leaderboard = await prisma.collectible.groupBy({
  by: ['ownerId'],
  _sum: { power: true },
  _count: { id: true },
  where: { ownerId: { not: null } },
  orderBy: { _sum: { power: 'desc' } },
  take: 50,
})
```

### 6.2 Mint Receipt Persistence

**File:** `app/api/web3/mint/route.ts`

Replace `mintReceipts.set(receipt.id, receipt)` with:
```typescript
await prisma.collectible.update({
  where: { id: cardId },
  data: { minted: true, transaction: txHash, ownerId: userId }
})
```

---

## 7. Code Quality Design

### 7.1 Files to Delete

```bash
rm components/workspace/copilot-chat-panel.tsx.bak
rm components/rooms/ai-studio/AgentMetrics.tsx.backup
rm app/page.old.tsx
```

### 7.2 Duplicate Component Resolution

| Keep | Remove | Update imports in |
|---|---|---|
| `components/workspace/layout/activity-bar.tsx` | `components/workspace/activity-bar.tsx` | All files importing the removed one |
| `components/workspace/layout/status-bar.tsx` | `components/workspace/status-bar.tsx` | All files importing the removed one |
| `components/workspace/layout/workbench-layout.tsx` | `components/workspace/workbench-layout.tsx` | All files importing the removed one |
| `components/rooms/deep-focus/DeepFocus.tsx` | `components/rooms/deep-focus/deep-focus.tsx` | `components/rooms/deep-focus/index.ts` |

---

## 8. Deployment Design

### 8.1 Docker Compose Additions

```yaml
services:
  piston:
    image: ghcr.io/engineer-man/piston
    ports: ["2000:2000"]
    environment:
      - PISTON_LOG_LEVEL=info
    
  lsp-broker:
    build: ./services/lsp-broker
    ports: ["3001:3001"]
    environment:
      - NODE_ENV=production
    
  dap-broker:
    build: ./services/dap-broker
    ports: ["3002:3002"]
    environment:
      - NODE_ENV=production
```

### 8.2 Environment Variable Validation

Add to `next.config.mjs`:
```javascript
const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']
if (process.env.NODE_ENV === 'production') {
  for (const v of requiredEnvVars) {
    if (!process.env[v]) throw new Error(`Missing required env var: ${v}`)
  }
}
```

---

## Implementation Sequence

The implementation should follow this order to minimize breaking changes:

1. **Phase 1 — Critical Fixes** (unblock basic functionality)
   - Add auth to notebook, collaboration, and test routes
   - Replace fake test runner with real implementation
   - Add missing Prisma models and run migrations

2. **Phase 2 — Persistence** (replace in-memory stores)
   - Theater room persistence
   - Deep Focus persistence
   - Marketplace persistence
   - Collectibles/leaderboard
   - Activity feed

3. **Phase 3 — Real-time** (WebSocket infrastructure)
   - Y.js WebSocket server
   - Presence via WebSocket
   - Cursor sync via WebSocket

4. **Phase 4 — Backend Services** (LSP/DAP)
   - LSP broker service
   - DAP broker service
   - Wire to existing service layer

5. **Phase 5 — Auth Flows** (complete auth)
   - Password reset
   - Email verification
   - OAuth provider testing

6. **Phase 6 — Cleanup** (code quality)
   - Remove duplicate/backup files
   - Fix hardcoded values
   - Update Docker/K8s configs

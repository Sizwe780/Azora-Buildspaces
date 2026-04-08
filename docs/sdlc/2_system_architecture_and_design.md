# SDLC System Architecture & Design: Azora-Buildspaces (Standalone Edition)

## 1. Architectural Style
Azora-Buildspaces follows a **Monolithic Frontend-Driven (Next.js)** architecture with **Micro-service Extensions** via containerization.

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript.
- **Backend Services**: Next.js Server Components, API routes, Redis caching, Prisma ORM.
- **Orchestration**: Kubernetes, Docker, WebContainer (for in-browser execution).

## 2. High-Level Components
- **Room System (Interactive UI Layers)**: Located in `components/rooms/`. Each room is a module that manages its own logic while communicating with shared libraries.
- **AI Integration Layer**: Centered in `lib/agent-bridge.ts`, `lib/agents/`, and `app/api/agents/`. Uses Vercel AI SDK and OpenAI/Mistral providers.
- **File System Orchestrator**: `lib/workspace/`, `app/api/fs/`. Manages file CRUD and terminal interactions within the environment.
- **Audit & Analytics**: `lib/audit-logger.ts`, `lib/auth-audit.ts`.

## 3. Data Flow Diagram (Mental Model)
- **User Activity** -> **Next.js Frontend** -> **API Routes** -> **Redis (Cache/Rate Limit)** -> **Prisma (PostgreSQL)**.
- **IDE Operations** -> **Monaco/Xterm.js** -> **Next.js Server** -> **Workspace Runtime (Docker/K8s/WebContainer)**.
- **AI Requests** -> **Command Desk/Rooms** -> **AI API** -> **External LLM (OpenAI) / Local LLM (Mistral-7B)**.

## 4. Database Design (Prisma)
- **User Entity**: Core identity and profile.
- **Enrollment & Payments**: Project access and monetization logic.
- **BuildSpaceProject**: Core project metadata, settings, and room states.
- **Collectible & MarketItem**: Support for gamified elements or marketplace assets.

## 5. Security & Infrastructure
- **Authentication**: NextAuth.js (Session-based).
- **Network Security**: `lib/security-headers.ts` for CSP and XSS protection.
- **Deployment**:
    - **Vercel**: Primary frontend hosting.
    - **Kubernetes**: Backend persistence (Postgres, Redis) and workspace isolation.
    - **Docker Compose**: Local development environment.

## 6. Design Principles
- **Room Modularity**: New functional areas should be implemented as a new `Room` in `components/rooms/`.
- **AI-Native UI**: AI should be integrated into every room (e.g., Code assistance in Code Chamber, Spec generation in Spec Chamber).
- **Collaboration-First**: Shared states should be managed where possible (Yjs implementation in Collaboration Pod).
- **Auditability**: All sensitive operations (auth, project creation) must be logged.

# Azora Buildspaces

Azora Buildspaces is an integrated, multiplayer IDE, specialized AI Studio, and collaborative workspace platform built on Next.js. It features a rich, dynamic multi-room environment for software development, design, and knowledge management.

## Features & Rooms
- **Code Chamber:** A fully featured, in-browser Monaco IDE environment with advanced features.
- **Spec Chamber:** AI-driven requirement gathering and specification design room.
- **Collaboration Pod:** Real-time, multi-player editing and communication hub.
- **Knowledge Ocean:** Semantic search, embeddings, and Q&A over project knowledge using MiniSearch and Sankofa.
- **AI Studio:** Agent orchestration, chat sessions, and specialized AI tooling.
- **Design Studio:** Figma integration, color palette generation, and UI/UX sandbox.
- **Maker Lab & Task Board:** Kanban-styled task tracking and innovation boards.
- **Command Desk:** High-level observability, metrics, and administration.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma ORM)
- **Styling:** Tailwind CSS
- **Testing:** Jest (Unit/Integration), Playwright (E2E), k6 (Load Testing)
- **Deployment:** Docker & Kubernetes ready

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- `pnpm` (v9+)
- PostgreSQL (or compatible configured in `.env`)
- Redis (optional, for rate limiting and sessions)

### 2. Installation
Install the project dependencies using `pnpm`:
```bash
pnpm install
```

### 3. Environment Configuration
Copy the sample environment file to `.env` and fill in your correct credentials (database URL, NextAuth secret, API keys):
```bash
cp .env.example .env
```

### 4. Database Setup
Run Prisma migrations to sync your schema with the database:
```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:push
```

### 5. Running the Application
Start the development server:
```bash
pnpm dev
```
Navigate to `http://localhost:3000` to access the application. 

## Testing
We have a comprehensive test suite to ensure the stability of Azora Buildspaces:

- **Unit & Integration:** `pnpm test`
- **End-to-End (E2E):** `pnpm test:e2e` (Requires `pnpm playwright:install` first)
- **Performance / Load Testing:** `k6 run tests/performance/load-test.js`

## Documentation & Tutorials
- For API Reference, please refer to `/public/openapi.yaml` (or the `/docs/api` route if enabled).
- For Deployment & Operations guidelines, see [docs/deployment.md](docs/deployment.md).
- Interactive tutorials for each room can be found within the platform on the `/tutorials` page.
- Our Onboarding flow will automatically guide new users through the workspace rooms.

## License
Copyright © Azora. All rights reserved.

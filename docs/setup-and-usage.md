# Local Setup & Usage Guide

## Prerequisites
*   **Node.js**: v20 or LTS
*   **Package Manager**: `pnpm` (v9)
*   **Database**: PostgreSQL
*   **Cache**: Redis (optional locally, required in production)

## 1. Initial Setup
Clone the repository, then install dependencies:
```bash
pnpm install
```

## 2. Environment Configuration
Copy the sample environment file and populate the secrets:
```bash
cp .env.example .env
```
Key variables:
*   `DATABASE_URL`: Your local or remote Postgres instance.
*   `NEXTAUTH_SECRET`: Random 32-byte string for JWT encryption.
*   `ENCRYPTION_KEY`: Absolute 32-byte hex for AES data encryption.

## 3. Database Initialization
Ensure PostgreSQL is running and push the Prisma schema:
```bash
pnpm prisma:generate
pnpm prisma:migrate dev
```

## 4. Run the Development Server
```bash
pnpm dev
```
Navigate to `http://localhost:3000` to interact with the workspace shell.

## Usage Overview
*   **Workspace Shell**: The main portal (`/workspace`). Rooms (`command-desk`, `code-chamber`) dynamically load modules.
*   **Testing**: Execute `pnpm test` (Unit/Integration) and `pnpm test:e2e` for Playwright environments. Code coverage strictly requires 80%.

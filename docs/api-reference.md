# Azora Buildspaces API Reference

## Authentication (`/api/auth`)
Powered by NextAuth.js. Handles user session lifecycles, JWT generation, and OAuth/Credentials providers.
*   `POST /api/auth/session` - Retrieves the current active session.
*   `POST /api/auth/signin` - Authenticates user. Includes brute-force protection (lockout after 5 failed attempts).

## File System (`/api/fs`)
Provides workspace-scoped file operations. Requires active session.
*   `GET /api/fs` - Browse file tree within a workspace (query param `?path=`).
*   `POST /api/fs` - Write or create new files. Path traversal mitigations applied.

## Health & Observability (`/api/health`)
*   `GET /api/health` - Infrastructure health check. Validates Redis, Postgres, and core APIs.

## Multi-Agent Architecture (`/api/agents` & `/api/mcp`)
*   `POST /api/agents` - Dispatches prompts/tasks to the AI cluster.
*   `GET /api/mcp` - Internal Model Context Protocol server exposing tool capabilities to agents.

## Workspace Persistence (`/api/workspace-persistence`)
*   `POST /api/workspace-persistence/save` - Snapshots the LightFS system back to Postgres.
*   `GET /api/workspace-persistence/load` - Restores file snapshots into browser memory.

> **Note:** All protected endpoints require a valid session cookie or an active JWT. The system actively enforces a strict Content-Security-Policy globally via Next.js Middleware.

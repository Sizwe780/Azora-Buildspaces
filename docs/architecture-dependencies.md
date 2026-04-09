# Architecture & Dependencies

## Core Architecture
- **Framework**: Next.js App Router Monolith (pp/)
- **UI Base**: Tailwind CSS with generic components/ui primitives (shadcn-ui style)
- **Monaco Editor**: Integrated for code editing with custom LSP logic / fallbacks (components/workspace/code-editor.tsx)
- **Workspace Rooms**: Dynamically loaded via 
ext/dynamic (pp/workspace/page.tsx) to split chunks. Rooms available include Code Chamber, AI Studio, Design Studio, Knowledge Ocean.

## Dependencies and State
- **Database Modeler**: Prisma (prisma/schema.prisma) connected via Postgres with connection pooling (@prisma/adapter-pg).
- **Auth**: NextAuth logic mapping to Prisma User/Session tables.
- **Search Engine**: Search and indexing powered by lib/knowledge/indexer.ts (using MiniSearch).

## Runtime Services
- Real-time features sync through WebSocket handlers, specifically in LSP editor initialization.
- Local Agent runtime operates through pp/api/mcp/route.ts bridging filesystem operations for the agent.
- Figma APIs bridged natively for imports in Design Studio (lib/figma-bridge.ts).

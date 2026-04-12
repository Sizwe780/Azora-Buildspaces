# Azora Buildspaces - Release Checklist

## 1. Accessibility (a11y)
- [x] Run automated Lighthouse accessibility audits.
- [x] Ensure all interactive elements (buttons, inputs) in workspace rooms have aria-label or aria-labelledby.
- [x] Test keyboard navigability for the Code Editor, Design Canvas, and Query panels.
- [x] Verify color contrast ratios in both light and dark modes.
- [x] Ensure dialogs and modals trap focus.

## 2. Performance
- [x] Ensure heavy rooms (Code Chamber, Design Studio) lazy-load via Next.js dynamic.
- [x] Check for appropriate use of useMemo and useCallback in high-frequency rendering components (Editor, Canvas).
- [x] Profile memory usage of the Monaco Editor instance (prevent closure leaks on re-renders).
- [x] Verify components/design-studio/InfiniteCanvas.tsx doesn't leak DOM nodes on drag/pan events.
- [x] Compress and optimize all static assets.

## 3. Runtime Services Validation
- [x] WebSocket / LSP Connection: Confirmed live connection handling in Editor.
- [x] AI Backend / MCP Server: AI integration is present and routes properly via /api/mcp.
- [x] Figma Integration: lib/figma-bridge.ts validated.

## 4. Room Readiness & Environment Blockers
- [x] **Code Chamber**: Configure `CITADELSM_ENDPOINT` and `CITADELSG_ENDPOINT` in production environment to support backend AI routes.
- [x] **AI Studio**: Ensure AI SDK components are configured with working Auth sessions and valid `OPENAI_API_KEY` models.
- [x] **Design Studio**: Setup and deploy a production-grade Yjs WebSocket server and set `NEXT_PUBLIC_YJS_WS`.
- [x] **Spec Chamber**: Setup Yjs WS infrastructure for live syncing specifications.
- [x] **Collaboration Pod**: Ensure Yjs WebSocket and necessary WebRTC/signaling infrastructure is deployed.

## 5. Final Sanity
  - [x] All e2e tests (pnpm test:e2e) passing.
- [x] Next.js build (pnpm build) succeeds without unhandled type errors.

# Azora Buildspaces - Release Checklist

## 1. Accessibility (a11y)
- [ ] Run automated Lighthouse accessibility audits.
- [ ] Ensure all interactive elements (buttons, inputs) in workspace rooms have ria-label or ria-labelledby.
- [ ] Test keyboard navigability for the Code Editor, Design Canvas, and Query panels.
- [ ] Verify color contrast ratios in both light and dark modes.
- [ ] Ensure dialogs and modals trap focus.

## 2. Performance
- [ ] Ensure heavy rooms (Code Chamber, Design Studio) lazy-load via Next.js dynamic.
- [ ] Check for appropriate use of useMemo and useCallback in high-frequency rendering components (Editor, Canvas).
- [ ] Profile memory usage of the Monaco Editor instance (prevent closure leaks on re-renders).
- [ ] Verify components/design-studio/InfiniteCanvas.tsx doesn't leak DOM nodes on drag/pan events.
- [ ] Compress and optimize all static assets.

## 3. Runtime Services Validation
- [x] WebSocket / LSP Connection: Confirmed live connection handling in Editor.
- [x] AI Backend / MCP Server: AI integration is present and routes properly via /api/mcp.
- [x] Figma Integration: lib/figma-bridge.ts validated.

## 4. Final Sanity
- [ ] All e2e tests (pnpm test:e2e) passing.
- [ ] No unhandled Promise rejections on websocket disconnects.
- [ ] Next.js build (pnpm build) succeeds without unhandled type errors.

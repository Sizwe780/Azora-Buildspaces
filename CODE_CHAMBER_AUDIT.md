# Code Chamber Audit — Concrete Fixable Issues

**Auditor:** Senior Engineer Review  
**Date:** 2025-03-05  
**Scope:** `components/workspace/`, `lib/stores/`, `app/api/code-chamber/`, `app/api/projects/current/`, `app/api/metrics/`

---

## Summary

| Severity | Count |
|----------|-------|
| Medium   | 14    |
| Low      | 10    |
| Info     |  5    |
| **Total**| **29**|

---

## MEDIUM Severity

### 1. [M] Missing auth on `/api/code-chamber/ai` — unauthenticated AI endpoint
**File:** `app/api/code-chamber/ai/route.ts` ~L148  
**Problem:** The `POST` handler has zero auth checks. No `getServerSession()` call. Any unauthenticated request can invoke GPT-4o / Citadels at the operator's expense.  
**Fix:** Add session check at the top of `POST`:
```ts
const session = await getServerSession(authOptions)
if (!session?.user) {
  return Response.json({ error: 'Authentication required' }, { status: 401 })
}
```

### 2. [M] Missing auth on `/api/code-chamber/complete` — unauthenticated completions
**File:** `app/api/code-chamber/complete/route.ts` ~L13  
**Problem:** Same issue — no auth. Every keystroke-triggered completion is an open OpenAI API call.  
**Fix:** Add `getServerSession` guard identical to issue #1.

### 3. [M] Missing auth on `/api/projects/current/git/status` — unauthenticated git access
**File:** `app/api/projects/current/git/status/route.ts` ~L8  
**Problem:** No `getServerSession` call. Exposes git status of the server's `process.cwd()` to unauthenticated users. Note: the `[projectId]` git routes ARE auth-protected, but the `current/` routes are not.  
**Fix:** Add session guard.

### 4. [M] Missing auth on `/api/metrics/system` — unauthenticated server metrics
**File:** `app/api/metrics/system/route.ts` ~L1  
**Problem:** Exposes CPU, memory, network I/O to any anonymous request. Information disclosure risk.  
**Fix:** Add session guard.

### 5. [M] Simulated blame data in diff-editor — fake annotations shown to users
**File:** `components/workspace/diff-editor.tsx` ~L287-310  
**Problem:** When "Blame" is toggled, the diff editor generates entirely fake data:
```ts
const authors = ['You', 'Elara AI', 'Team Lead', 'Contributor', 'DevOps']
const decorations = lines.map((_: string, idx: number) => ({
  ...
  content: ` // ${authors[idx % authors.length]} • ${Math.floor(Math.random() * 30) + 1}d ago`,
```
This is misleading — users see fabricated commit authors and dates.  
**Fix:** Either (a) fetch real blame data from `/api/projects/current/git/blame` (as editor-panel already does), or (b) remove the blame toggle from diff-editor until real data is available, or (c) display an explicit "Demo data" badge.

### 6. [M] Mock AI suggestions in code-editor — `getAISuggestions` returns hardcoded completions
**File:** `components/workspace/code-editor.tsx` ~L220-237  
**Problem:** The `getAISuggestions()` function returns hardcoded prefix matches (`'con'→'st'`, `'im'→'port'`) instead of calling an AI service. These are registered as Monaco inline completions, misleading users into thinking they have AI ghost text.  
**Fix:** Either wire to `/api/code-chamber/complete` (as `editor-panel.tsx` already does at ~L1530), or remove the mock provider entirely since `editor-panel.tsx` already registers a real one.

### 7. [M] Hardcoded user ID `"current-user"` passed to CollaborationChatPanel
**File:** `components/workspace/code-chamber.tsx` L143, L198  
**Problem:** Both the primary sidebar and secondary sidebar pass:
```tsx
currentUserId="current-user"
currentUserName="You"
```
This means all users appear identical in collaboration chat. Messages can't be attributed.  
**Fix:** Get the real user from session/context:
```tsx
const session = useSession()
currentUserId={session?.data?.user?.id || "anonymous"}
currentUserName={session?.data?.user?.name || "Anonymous"}
```

### 8. [M] `ydocRef` used but never declared in editor-panel
**File:** `components/workspace/editor-panel.tsx` — used at L861-867, L901, L1853-1855  
**Problem:** `ydocRef` is referenced 7+ times (e.g. `ydocRef.current`) but there is no `const ydocRef = useRef(...)` declaration anywhere in the file. `providerRef` and `bindingRef` ARE declared at L177-178. This will cause a ReferenceError at runtime when the Yjs collaboration code path executes.  
**Fix:** Add declaration near line 178:
```ts
const ydocRef = useRef<any>(null)
```

### 9. [M] `setIsAiTyping` called but never declared
**File:** `components/workspace/editor-panel.tsx` L831  
**Problem:** `setIsAiTyping(false)` is called inside a `useEffect` but neither `isAiTyping` nor `setIsAiTyping` are declared as `useState` anywhere. This will throw a ReferenceError at runtime.  
**Fix:** Either add `const [isAiTyping, setIsAiTyping] = useState(false)` or remove the dead call if it's unused elsewhere.

### 10. [M] `terminal-workbench-panel.tsx` — parsed JSON result discarded (no-op code)
**File:** `components/workspace/panels/terminal-workbench-panel.tsx` L91  
**Problem:**
```ts
try { JSON.parse(saved) as TerminalHistory[] } catch { /* ignore */ }
```
The `JSON.parse()` result is never assigned. Terminal history loaded from localStorage is thrown away, so history is never actually restored.  
**Fix:** Assign the result to the appropriate state setter:
```ts
const history = JSON.parse(saved) as TerminalHistory[]
setCommandHistory(history) // or whatever the setter is
```

### 11. [M] `problems-view.tsx` — `taskProblems` missing from `useMemo` dependency array
**File:** `components/workspace/panels/problems-view.tsx` L117-125  
**Problem:**
```ts
const allProblems = useMemo(() => {
    const combined = [...items, ...monacoMarkers, ...taskProblems]
    ...
}, [items, monacoMarkers])  // ← taskProblems missing!
```
When task-generated problems arrive via the `problems:fromTask` event, the merged list won't update because `taskProblems` isn't in the dependency array. This is a stale closure bug.  
**Fix:** Add `taskProblems` to the dependency array:
```ts
}, [items, monacoMarkers, taskProblems])
```

### 12. [M] No Error Boundary around Monaco editor
**File:** `components/workspace/editor-panel.tsx` ~L1120 (MonacoEditor mount)  
**Problem:** The MonacoEditor dynamic import is rendered without an error boundary. If Monaco fails to load (WASM error, memory issue, network timeout on CDN), the entire Code Chamber crashes with an unrecoverable white screen.  
**Fix:** Wrap the editor area in a React error boundary:
```tsx
<MonacoErrorBoundary fallback={<div>Editor failed to load. Click to retry.</div>}>
  <MonacoEditor ... />
</MonacoErrorBoundary>
```

### 13. [M] Editor settings polled via `setInterval` every 2 seconds
**File:** `components/workspace/editor-panel.tsx` L133-136  
**Problem:**
```ts
const interval = setInterval(() => {
    setEditorSettings(loadEditorSettings('default'))
}, 2000)
```
This reads from localStorage and triggers a re-render every 2 seconds for every open editor tab, even when settings haven't changed. This is wasteful and can cause micro-stutters.  
**Fix:** Use a `storage` event listener or a Zustand store for settings instead of polling:
```ts
useEffect(() => {
  const handler = (e: StorageEvent) => {
    if (e.key?.includes('editor-settings')) setEditorSettings(loadEditorSettings('default'))
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}, [])
```

### 14. [M] `workbench-store.ts` — `Set<string>` for `dirtyFiles` breaks Zustand persistence
**File:** `lib/stores/workbench-store.ts` L285-296  
**Problem:** `dirtyFiles` is typed as `Set<string>()` which is not JSON-serializable. While `dirtyFiles` isn't currently persisted (it's excluded from `partialize`), doing `new Set(state.dirtyFiles)` in `markDirty`/`markClean` creates a new object reference on every call. If a consumer subscribes to `dirtyFiles`, every `markDirty` call triggers a re-render even if the set contents didn't change.  
**Fix:** Consider using an `Array` or a `Record<string, boolean>` for dirty tracking, or memoize the equality check.

---

## LOW Severity

### 15. [L] Duplicate `useEffect` import alias in editor-panel
**File:** `components/workspace/editor-panel.tsx` L4  
**Problem:**
```ts
import { useEffect as useMonacoEffect } from "react"
```
This renames a second `useEffect` import as `useMonacoEffect`, which is confusing and unnecessary — it's the same function. The alias at L209 is used only once.  
**Fix:** Remove the aliased import and use the standard `useEffect` from the existing import at L1.

### 16. [L] Massive `any` usage in editor-panel — 30+ instances
**File:** `components/workspace/editor-panel.tsx` throughout  
**Problem:** At least 30 instances of `: any` — `editorRef<any>`, `blameDecorations<any>`, `conflictDecorations<any>`, `(e: any)`, `(node: any)`, `(model: any, position: any)` etc. Most of these could use Monaco's exported types (`editor.IStandaloneCodeEditor`, `editor.ITextModel`, `languages.InlayHint[]`).  
**Fix:** Replace `any` with proper Monaco types. At minimum:
- `editorRef` → `useRef<editor.IStandaloneCodeEditor | null>(null)`
- `blameDecorations` → `useRef<editor.IEditorDecorationsCollection | null>(null)`

### 17. [L] No loading indicator for file content fetch
**File:** `components/workspace/editor-panel.tsx` L195-207  
**Problem:** When switching files, `fetchContent` is called but there's no loading state; the editor shows `"// Loading..."` as plain text which looks like actual file content.  
**Fix:** Add a loading state that shows a spinner overlay instead of the static text comment.

### 18. [L] `code-editor.tsx` — `registerAIInlineSuggestions` always registered globally
**File:** `components/workspace/code-editor.tsx` L58-59  
**Problem:** `registerInlineCompletionsProvider({ pattern: '**' }, ...)` registers globally with a wildcard pattern. If multiple `CodeEditor` instances mount, this registers duplicate providers. The provider is also never disposed when the component unmounts (the disposable is returned from the function but not stored/cleaned up).  
**Fix:** Store the disposable and clean up on unmount in the component's `useEffect` or `onMount` callback.

### 19. [L] `copilot-chat-panel.tsx` — `handleRunTerminal` fakes success after 3 seconds
**File:** `components/workspace/copilot-chat-panel.tsx` L433-440  
**Problem:**
```ts
setTimeout(() => {
    setMessages(prev => prev.map(msg => ({
        ...msg,
        terminalCommands: msg.terminalCommands?.map(cmd =>
            cmd.command === command ? { ...cmd, status: "success" as const } : cmd),
    })))
}, 3000)
```
After dispatching a terminal command, it unconditionally marks it as "success" after 3 seconds regardless of actual execution outcome.  
**Fix:** Listen for a `terminal:commandComplete` event from the actual terminal and update status based on real exit code.

### 20. [L] No ARIA labels on copilot chat input/buttons
**File:** `components/workspace/copilot-chat-panel.tsx` ~L758-780  
**Problem:** The chat `<textarea>` has a `placeholder` but no `aria-label`. The send button has no accessible name. The feedback thumbs-up/down buttons (~L700) have no `aria-label`.  
**Fix:** Add:
```tsx
<textarea aria-label="Message to AI assistant" ... />
<Button aria-label="Send message" ...>
<Button aria-label="Helpful response" ...><ThumbsUp/></Button>
<Button aria-label="Unhelpful response" ...><ThumbsDown/></Button>
```

### 21. [L] No ARIA labels on diff-editor navigation buttons
**File:** `components/workspace/diff-editor.tsx` ~L440-450  
**Problem:** The "Previous Change" and "Next Change" buttons in the summary bar are plain `<button>` elements without `aria-label` or `role`.  
**Fix:** Add `aria-label="Previous change"` and `aria-label="Next change"`.

### 22. [L] `handleCodeChange` auto-save has no error feedback to user
**File:** `components/workspace/editor-panel.tsx` ~L228-240  
**Problem:** When auto-save fails, the error is only logged to console:
```ts
} catch (error) {
    console.error("Failed to save file:", error)
}
```
The file stays marked dirty but the user gets no notification. They may lose work thinking it was saved.  
**Fix:** Dispatch a notification event on save failure:
```ts
window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'error', message: `Failed to save ${activeFile}` } }))
```

### 23. [L] `code-chamber.tsx` — missing `openFile` and `setActiveFile` in loadProject useEffect deps
**File:** `components/workspace/code-chamber.tsx` L76-92  
**Problem:** The `useEffect` that restores session state calls `openFile` and `setActiveFile` inside its body, but the dependency array only includes `[projectId, loadProject]`. If `openFile` or `setActiveFile` references change, the effect won't re-run, potentially using stale closures.  
**Fix:** Add `openFile` and `setActiveFile` to the dependency array, or use refs for them.

### 24. [L] `workbench-store.ts` — `navigateBack`/`navigateForward` use `window.dispatchEvent` inside Zustand `set`
**File:** `lib/stores/workbench-store.ts` ~L393-413  
**Problem:** Side effects (`window.dispatchEvent`) are performed inside Zustand's `set()` callback. This is an anti-pattern — `set` should be pure state transitions. It also means the event fires synchronously during the state update which can cause unexpected ordering.  
**Fix:** Split into two steps: `set()` for state, then dispatch event in a subscriber or outside the setter.

---

## INFO Severity

### 25. [I] `code-editor.tsx` — entire component is likely dead code
**File:** `components/workspace/code-editor.tsx`  
**Problem:** `code-chamber.tsx` imports `EditorPanel` (from `editor-panel.tsx`) as its editor, not `CodeEditor`. A search shows `CodeEditor` is not imported by any Code Chamber views. It appears to be an older standalone editor component superseded by `editor-panel.tsx`. It also registers duplicate Monaco providers globally.  
**Suggestion:** Verify no external consumers use it; if confirmed dead, remove the file.

### 26. [I] `computeDiffStats` in diff-editor uses naive set comparison
**File:** `components/workspace/diff-editor.tsx` L96-109  
**Problem:** Uses `Set<string>` comparison of trimmed lines, which doesn't correspond to actual diff hunks. Duplicate lines falsely reduce the diff count. This is cosmetic but misleading for the stats badges.  
**Suggestion:** Use Monaco's `getLineChanges()` API after mount to compute accurate hunk-based stats.

### 27. [I] `editor-panel.tsx` — Emmet expansions are simplistic
**File:** `components/workspace/editor-panel.tsx` ~L1250-1290  
**Problem:** The hand-rolled Emmet provider only covers ~12 abbreviations and doesn't support multiplicators (`ul>li*5`), grouping, or sibling operators. VS Code uses the full `emmet` npm module.  
**Suggestion:** Consider integrating `emmet` or `@vscode/emmet-helper` for full Emmet support (lower priority).

### 28. [I] `status-bar.tsx` — hardcoded "Prettier" formatter display
**File:** `components/workspace/layout/status-bar.tsx` ~L258-261  
**Problem:** Always shows "Prettier" as the active formatter regardless of whether Prettier is actually configured. This is cosmetic but misleading.  
**Suggestion:** Read from workspace config or display "No formatter" when none is detected.

### 29. [I] Inlay hints provider returns `: void` for all arrow functions
**File:** `components/workspace/editor-panel.tsx` ~L1740-1760  
**Problem:** The custom inlay hints provider always infers `: void` as the return type for arrow functions, regardless of actual return type. While not harmful, it's inaccurate.  
**Suggestion:** Remove the arrow function return-type hint (keep the simple literal type hints) or wire to actual TypeScript type inference via the language service.

---

## Priority Fix Order

1. **Issues #1–4** (Missing auth) — Security. Can be fixed in parallel, ~30 min total.
2. **Issues #8–9** (Undeclared refs/state) — Build/runtime crash. ~10 min.
3. **Issue #11** (Stale closure in problems-view) — Data correctness. ~2 min.
4. **Issue #10** (Discarded JSON parse) — Broken feature. ~5 min.
5. **Issues #5–6** (Fake data) — User trust. ~30 min each.
6. **Issue #7** (Hardcoded user ID) — Collaboration broken. ~15 min.
7. **Issue #12** (Error boundary) — Resilience. ~20 min.
8. **Issue #13** (Polling settings) — Performance. ~15 min.
9. **Remaining Low/Info** — Incremental improvement.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type SidebarView =
  | "explorer"
  | "outline"
  | "search"
  | "git"
  | "extensions"
  | "chat"
  | "ai-assistant"
  | "code-analysis"
  | "refactoring"
  | "snippets"
  | "themes"
  | "cloud"
  | "cicd"
  | "web3"
  | "packages"
  | "security"
  | "figma"
  | "qa-testing"
  | "telemetry"
  | "observability"
  | "deployment"
  | "settings"
  | "task-runner";
export type SecondarySidebarView =
  | "chat"
  | "ai-assistant"
  | "outline"
  | "timeline"
  | "copilot";
export type PanelView =
  | "terminal"
  | "output"
  | "problems"
  | "debug"
  | "ports"
  | "testing"
  | "performance"
  | "code-review"
  | "live-preview"
  | "qa-testing"
  | "telemetry"
  | "observability";

export interface EditorGroup {
  id: string;
  activeFile: string | null;
  openFiles: string[];
}

export type SplitDirection = "horizontal" | "vertical";

export interface DiffEditorState {
  isOpen: boolean;
  originalFile: string | null;
  modifiedFile: string | null;
  originalContent: string | null;
  modifiedContent: string | null;
}

interface WorkbenchState {
  // Sidebar State (Primary â€“ left)
  activeSidebarView: SidebarView;
  isSidebarVisible: boolean;
  setSidebarView: (view: SidebarView) => void;
  toggleSidebar: () => void;

  // Secondary Sidebar State (right)
  activeSecondarySidebarView: SecondarySidebarView;
  isSecondarySidebarVisible: boolean;
  setSecondarySidebarView: (view: SecondarySidebarView) => void;
  toggleSecondarySidebar: () => void;
  showSecondarySidebar: (view?: SecondarySidebarView) => void;

  // Panel State (bottom)
  activePanelView: PanelView;
  isPanelVisible: boolean;
  panelPosition: "bottom" | "right";
  isPanelMaximized: boolean;
  setPanelView: (view: PanelView) => void;
  togglePanel: () => void;
  setPanelPosition: (pos: "bottom" | "right") => void;
  togglePanelMaximized: () => void;

  // Activity Bar / Status Bar visibility
  isActivityBarVisible: boolean;
  isStatusBarVisible: boolean;
  toggleActivityBar: () => void;
  toggleStatusBar: () => void;

  // Editor Groups (Split Editor)
  editorGroups: EditorGroup[];
  activeGroupId: string;
  splitDirection: SplitDirection;
  splitEditor: (direction?: SplitDirection) => void;
  closeEditorGroup: (groupId: string) => void;
  setActiveGroup: (groupId: string) => void;

  // Diff Editor
  diffEditor: DiffEditorState;
  openDiffEditor: (
    original: string,
    modified: string,
    origContent?: string,
    modContent?: string,
  ) => void;
  closeDiffEditor: () => void;

  // Zen Mode
  isZenMode: boolean;
  toggleZenMode: () => void;

  // Layout State
  sidebarWidth: number;
  panelHeight: number;
  setSidebarWidth: (width: number) => void;
  setPanelHeight: (height: number) => void;

  // Active Extensions
  activeExtensions: string[];
  addActiveExtension: (extensionId: string) => void;
  removeActiveExtension: (extensionId: string) => void;

  // Tab Management
  pinnedTabs: string[]
  dirtyFiles: Set<string>
  pinTab: (fileId: string) => void
  unpinTab: (fileId: string) => void
  closeAllTabs: (groupId: string) => void
  closeOtherTabs: (groupId: string, keepFileId: string) => void
  closeTabsToRight: (groupId: string, fileId: string) => void
  reorderTab: (groupId: string, fromIdx: number, toIdx: number) => void
  markDirty: (fileId: string) => void
  markClean: (fileId: string) => void

  // Editor Cursor / Language State (for status bar)
  cursorLine: number;
  cursorColumn: number;
  editorLanguage: string;
  editorIndentation: string;
  editorEOL: string;
  editorEncoding: string;
  setCursorPosition: (line: number, col: number) => void;
  setEditorLanguage: (lang: string) => void;
  setEditorIndentation: (indent: string) => void;
  setEditorEOL: (eol: string) => void;

  // Editor Navigation History
  navigationHistory: Array<{
    fileId: string;
    line: number;
    column: number;
    timestamp: number;
  }>;
  navigationIndex: number;
  navigateBack: () => void;
  navigateForward: () => void;
  addNavigationEntry: (fileId: string, line: number, column: number) => void;

  // Diagnostics & Git for status bar
  diagnosticErrors: number;
  diagnosticWarnings: number;
  currentGitBranch: string;
  gitAhead: number;
  gitBehind: number;
  setDiagnostics: (errors: number, warnings: number) => void;
  setGitBranchInfo: (branch: string, ahead: number, behind: number) => void;

  // Recent Files
  recentFiles: Array<{ fileId: string; name: string; timestamp: number }>;
  addRecentFile: (fileId: string, name: string) => void;
  clearRecentFiles: () => void;

  // Custom Keybindings
  keybindings: Record<string, string>;
  setKeybinding: (action: string, shortcut: string) => void;
  resetKeybinding: (action: string) => void;
  resetAllKeybindings: () => void;

  // File management
  closeFile: (fileId: string, groupId?: string) => void;
  setActiveFile: (fileId: string, groupId?: string) => void;
  restoreEditorState: (
    editorGroups: EditorGroup[],
    activeGroupId?: string,
    splitDirection?: SplitDirection,
  ) => void;

  // Quick Open / Go to Line dialogs
  isQuickOpenVisible: boolean;
  isGoToLineVisible: boolean;
  toggleQuickOpen: () => void;
  toggleGoToLine: () => void;
  setQuickOpenVisible: (v: boolean) => void;
  setGoToLineVisible: (v: boolean) => void;

  // Overlay Terminal
  isTerminalOverlay: boolean;
  toggleTerminalOverlay: () => void;

  // Monaco View State persistence (cursor, scroll, folds per file)
  editorViewStates: Record<
    string,
    {
      cursorLine: number;
      cursorColumn: number;
      scrollTop: number;
      scrollLeft: number;
      folds?: number[];
    }
  >;
  saveEditorViewState: (
    fileId: string,
    state: {
      cursorLine: number;
      cursorColumn: number;
      scrollTop: number;
      scrollLeft: number;
      folds?: number[];
    },
  ) => void;
  getEditorViewState: (
    fileId: string,
  ) => {
    cursorLine: number;
    cursorColumn: number;
    scrollTop: number;
    scrollLeft: number;
    folds?: number[];
  } | null;
}

let groupCounter = 1;

export const useWorkbench = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      // Sidebar Defaults
      activeSidebarView: "explorer",
      isSidebarVisible: true,
      setSidebarView: (view) =>
        set({ activeSidebarView: view, isSidebarVisible: true }),
      toggleSidebar: () =>
        set((state) => ({ isSidebarVisible: !state.isSidebarVisible })),

      // Secondary Sidebar Defaults
      activeSecondarySidebarView: "chat",
      isSecondarySidebarVisible: false,
      setSecondarySidebarView: (view) =>
        set({ activeSecondarySidebarView: view }),
      toggleSecondarySidebar: () =>
        set((state) => ({
          isSecondarySidebarVisible: !state.isSecondarySidebarVisible,
        })),
      showSecondarySidebar: (view) =>
        set((state) => ({
          isSecondarySidebarVisible: true,
          activeSecondarySidebarView: view || state.activeSecondarySidebarView,
        })),

      // Panel Defaults
      activePanelView: "terminal",
      isPanelVisible: true,
      panelPosition: "bottom" as "bottom" | "right",
      isPanelMaximized: false,
      setPanelView: (view) =>
        set({ activePanelView: view, isPanelVisible: true }),
      togglePanel: () =>
        set((state) => ({
          isPanelVisible: !state.isPanelVisible,
          isPanelMaximized: false,
        })),
      setPanelPosition: (pos) => set({ panelPosition: pos }),
      togglePanelMaximized: () =>
        set((state) => ({ isPanelMaximized: !state.isPanelMaximized })),

      // Activity Bar / Status Bar
      isActivityBarVisible: true,
      isStatusBarVisible: true,
      toggleActivityBar: () =>
        set((state) => ({ isActivityBarVisible: !state.isActivityBarVisible })),
      toggleStatusBar: () =>
        set((state) => ({ isStatusBarVisible: !state.isStatusBarVisible })),

      // Editor Groups
      editorGroups: [{ id: "group-1", activeFile: null, openFiles: [] }],
      activeGroupId: "group-1",
      splitDirection: "horizontal" as SplitDirection,
      splitEditor: (direction?: SplitDirection) => {
        const state = get();
        const dir = direction || "horizontal";
        const newId = `group-${++groupCounter}`;
        const activeGroup = state.editorGroups.find(
          (g) => g.id === state.activeGroupId,
        );
        set({
          editorGroups: [
            ...state.editorGroups,
            {
              id: newId,
              activeFile: activeGroup?.activeFile || null,
              openFiles: activeGroup?.activeFile
                ? [activeGroup.activeFile]
                : [],
            },
          ],
          activeGroupId: newId,
          splitDirection: dir,
        });
      },
      closeEditorGroup: (groupId) => {
        const state = get();
        if (state.editorGroups.length <= 1) return;
        const remaining = state.editorGroups.filter((g) => g.id !== groupId);
        set({
          editorGroups: remaining,
          activeGroupId:
            state.activeGroupId === groupId
              ? remaining[0].id
              : state.activeGroupId,
        });
      },
      setActiveGroup: (groupId) => set({ activeGroupId: groupId }),

      // Diff Editor
      diffEditor: {
        isOpen: false,
        originalFile: null,
        modifiedFile: null,
        originalContent: null,
        modifiedContent: null,
      },
      openDiffEditor: (original, modified, origContent, modContent) =>
        set({
          diffEditor: {
            isOpen: true,
            originalFile: original,
            modifiedFile: modified,
            originalContent: origContent || null,
            modifiedContent: modContent || null,
          },
        }),
      closeDiffEditor: () =>
        set({
          diffEditor: {
            isOpen: false,
            originalFile: null,
            modifiedFile: null,
            originalContent: null,
            modifiedContent: null,
          },
        }),

      // Zen Mode
      isZenMode: false,
      toggleZenMode: () =>
        set((state) => ({
          isZenMode: !state.isZenMode,
          isSidebarVisible: state.isZenMode ? true : false,
          isPanelVisible: state.isZenMode ? true : false,
          isSecondarySidebarVisible: state.isZenMode ? false : false,
        })),

      // Layout Defaults
      sidebarWidth: 20, // Percentage
      panelHeight: 30, // Percentage
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setPanelHeight: (height) => set({ panelHeight: height }),

      // Active Extensions
      activeExtensions: [],
      addActiveExtension: (extensionId) =>
        set((state) => ({
          activeExtensions: state.activeExtensions.includes(extensionId)
            ? state.activeExtensions
            : [...state.activeExtensions, extensionId],
        })),
      removeActiveExtension: (extensionId) =>
        set((state) => ({
          activeExtensions: state.activeExtensions.filter(
            (id) => id !== extensionId,
          ),
        })),

      // Tab Management
      pinnedTabs: [],
      dirtyFiles: new Set<string>(),
      pinTab: (fileId) => set((state) => ({
        pinnedTabs: state.pinnedTabs.includes(fileId) ? state.pinnedTabs : [...state.pinnedTabs, fileId],
      })),
      unpinTab: (fileId) => set((state) => ({
        pinnedTabs: state.pinnedTabs.filter(id => id !== fileId),
      })),
      closeAllTabs: (groupId) => set((state) => ({
        editorGroups: state.editorGroups.map(g =>
          g.id === groupId ? { ...g, openFiles: g.openFiles.filter(f => state.pinnedTabs.includes(f)), activeFile: null } : g
        ),
      })),
      closeOtherTabs: (groupId, keepFileId) => set((state) => ({
        editorGroups: state.editorGroups.map(g =>
          g.id === groupId
            ? { ...g, openFiles: g.openFiles.filter(f => f === keepFileId || state.pinnedTabs.includes(f)), activeFile: keepFileId }
            : g
        ),
      })),
      closeTabsToRight: (groupId, fileId) => set((state) => {
        const group = state.editorGroups.find(g => g.id === groupId)
        if (!group) return state
        const idx = group.openFiles.indexOf(fileId)
        if (idx === -1) return state
        return {
          editorGroups: state.editorGroups.map(g =>
            g.id === groupId
              ? { ...g, openFiles: g.openFiles.filter((f, i) => i <= idx || state.pinnedTabs.includes(f)) }
              : g
          ),
        }
      }),
      reorderTab: (groupId, fromIdx, toIdx) => set((state) => ({
        editorGroups: state.editorGroups.map(g => {
          if (g.id !== groupId) return g
          const files = [...g.openFiles]
          const [moved] = files.splice(fromIdx, 1)
          files.splice(toIdx, 0, moved)
          return { ...g, openFiles: files }
        }),
      })),
      markDirty: (fileId) => set((state) => {
        const next = new Set(state.dirtyFiles)
        next.add(fileId)
        return { dirtyFiles: next }
      }),
      markClean: (fileId) => set((state) => {
        const next = new Set(state.dirtyFiles)
        next.delete(fileId)
        return { dirtyFiles: next }
      }),

      // Editor Cursor / Language State
      cursorLine: 1,
      cursorColumn: 1,
      editorLanguage: "TypeScript React",
      editorIndentation: "Spaces: 2",
      editorEOL: "LF",
      editorEncoding: "UTF-8",
      setCursorPosition: (line, col) =>
        set({ cursorLine: line, cursorColumn: col }),
      setEditorLanguage: (lang) => set({ editorLanguage: lang }),
      setEditorIndentation: (indent) => set({ editorIndentation: indent }),
      setEditorEOL: (eol) => set({ editorEOL: eol }),

      // Diagnostics & Git for status bar
      diagnosticErrors: 0,
      diagnosticWarnings: 0,
      currentGitBranch: "main",
      gitAhead: 0,
      gitBehind: 0,
      setDiagnostics: (errors, warnings) =>
        set({ diagnosticErrors: errors, diagnosticWarnings: warnings }),
      setGitBranchInfo: (branch, ahead, behind) =>
        set({ currentGitBranch: branch, gitAhead: ahead, gitBehind: behind }),

      // Recent Files
      recentFiles: [],
      addRecentFile: (fileId, name) =>
        set((state) => {
          const filtered = state.recentFiles.filter((f) => f.fileId !== fileId);
          const newRecent = [
            { fileId, name, timestamp: Date.now() },
            ...filtered,
          ].slice(0, 20);
          return { recentFiles: newRecent };
        }),
      clearRecentFiles: () => set({ recentFiles: [] }),

      // Custom Keybindings
      keybindings: {},
      setKeybinding: (action, shortcut) =>
        set((state) => ({
          keybindings: { ...state.keybindings, [action]: shortcut },
        })),
      resetKeybinding: (action) =>
        set((state) => {
          const next = { ...state.keybindings };
          delete next[action];
          return { keybindings: next };
        }),
      resetAllKeybindings: () => set({ keybindings: {} }),

      // File management
      closeFile: (fileId, groupId) =>
        set((state) => {
          const targetGroupId = groupId || state.activeGroupId;
          const groups = state.editorGroups.map((g) => {
            if (g.id !== targetGroupId || !g.openFiles.includes(fileId))
              return g;
            const openFiles = g.openFiles.filter((f) => f !== fileId);
            const activeFile =
              g.activeFile === fileId
                ? openFiles.length > 0
                  ? openFiles[Math.max(0, g.openFiles.indexOf(fileId) - 1)]
                  : null
                : g.activeFile;
            return { ...g, openFiles, activeFile };
          });
          return { editorGroups: groups };
        }),
      setActiveFile: (fileId, groupId) =>
        set((state) => ({
          editorGroups: state.editorGroups.map((g) =>
            g.id === (groupId || state.activeGroupId)
              ? {
                ...g,
                activeFile: fileId,
                openFiles: g.openFiles.includes(fileId)
                  ? g.openFiles
                  : [...g.openFiles, fileId],
              }
              : g,
          ),
        })),
      restoreEditorState: (
        editorGroups,
        nextActiveGroupId,
        nextSplitDirection,
      ) =>
        set((state) => {
          const normalizedGroups =
            editorGroups.length > 0
              ? editorGroups.map((group) => ({
                id: group.id,
                activeFile: group.activeFile ?? null,
                openFiles: Array.isArray(group.openFiles)
                  ? group.openFiles
                  : [],
              }))
              : [{ id: "group-1", activeFile: null, openFiles: [] }];

          const validActiveGroupId = normalizedGroups.some(
            (group) => group.id === nextActiveGroupId,
          )
            ? nextActiveGroupId
            : normalizedGroups[0]?.id || "group-1";

          const maxGroupNumber = normalizedGroups.reduce((max, group) => {
            const match = /^group-(\d+)$/.exec(group.id);
            return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
          }, 1);
          groupCounter = Math.max(groupCounter, maxGroupNumber);

          return {
            editorGroups: normalizedGroups,
            activeGroupId: validActiveGroupId,
            splitDirection: nextSplitDirection || state.splitDirection,
          };
        }),

      // Quick Open / Go to Line
      isQuickOpenVisible: false,
      isGoToLineVisible: false,
      toggleQuickOpen: () =>
        set((state) => ({ isQuickOpenVisible: !state.isQuickOpenVisible })),
      toggleGoToLine: () =>
        set((state) => ({ isGoToLineVisible: !state.isGoToLineVisible })),
      setQuickOpenVisible: (v) => set({ isQuickOpenVisible: v }),
      setGoToLineVisible: (v) => set({ isGoToLineVisible: v }),

      // Overlay Terminal
      isTerminalOverlay: false,
      toggleTerminalOverlay: () =>
        set((state) => ({ isTerminalOverlay: !state.isTerminalOverlay })),

      // Editor Navigation History
      navigationHistory: [],
      navigationIndex: -1,
      navigateBack: () => set((state) => {
        if (state.navigationIndex > 0) {
          const newIndex = state.navigationIndex - 1
          const entry = state.navigationHistory[newIndex]
          // Dispatch event to navigate to the position
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('workbench:navigate-to', {
              detail: { fileId: entry.fileId, line: entry.line, column: entry.column }
            }))
          }
          return { navigationIndex: newIndex }
        }
        return state
      }),
      navigateForward: () => set((state) => {
        if (state.navigationIndex < state.navigationHistory.length - 1) {
          const newIndex = state.navigationIndex + 1
          const entry = state.navigationHistory[newIndex]
          // Dispatch event to navigate to the position
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('workbench:navigate-to', {
              detail: { fileId: entry.fileId, line: entry.line, column: entry.column }
            }))
          }
          return { navigationIndex: newIndex }
        }
        return state
      }),
      addNavigationEntry: (fileId, line, column) => set((state) => {
        const newEntry = { fileId, line, column, timestamp: Date.now() }
        // Remove any entries after current index (when navigating back then making new navigation)
        const newHistory = state.navigationHistory.slice(0, state.navigationIndex + 1)
        newHistory.push(newEntry)

        // Limit history to 50 entries
        if (newHistory.length > 50) {
          newHistory.shift();
        }

        return {
          navigationHistory: newHistory,
          navigationIndex: newHistory.length - 1,
        };
      }),

      // Monaco View State persistence
      editorViewStates: {},
      saveEditorViewState: (fileId, viewState) =>
        set((state) => ({
          editorViewStates: { ...state.editorViewStates, [fileId]: viewState },
        })),
      getEditorViewState: (fileId) => {
        return get().editorViewStates[fileId] || null;
      },
    }),
    {
      name: "workbench-layout",
      storage: createJSONStorage(() => localStorage),
      // Only persist layout-related state, not runtime state
      partialize: (state) => ({
        activeSidebarView: state.activeSidebarView,
        isSidebarVisible: state.isSidebarVisible,
        activeSecondarySidebarView: state.activeSecondarySidebarView,
        isSecondarySidebarVisible: state.isSecondarySidebarVisible,
        activePanelView: state.activePanelView,
        isPanelVisible: state.isPanelVisible,
        panelPosition: state.panelPosition,
        isPanelMaximized: state.isPanelMaximized,
        isActivityBarVisible: state.isActivityBarVisible,
        isStatusBarVisible: state.isStatusBarVisible,
        isZenMode: state.isZenMode,
        pinnedTabs: state.pinnedTabs,
        activeExtensions: state.activeExtensions,
        recentFiles: state.recentFiles,
        keybindings: state.keybindings,
        editorViewStates: state.editorViewStates,
      }),
    },
  ),
);

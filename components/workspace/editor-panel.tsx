"use client";
import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import {
  X,
  FileCode,
  ChevronRight,
  Bot,
  Users,
  Wifi,
  WifiOff,
  FolderOpen,
  Pin,
  PinOff,
  GitCommitVertical,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect as useMonacoEffect } from "react";
// @ts-ignore
import {
  MonacoLanguageClient,
} from "monaco-languageclient";
// monaco-editor is NOT imported at module scope — doing so causes web-worker
// initialisation errors in Turbopack. All monaco.* calls inside this file use
// the `monaco` parameter passed by @monaco-editor/react's onMount callback.
import { motion, AnimatePresence } from "framer-motion";
import { getLanguageByExtension, type LanguageSupport } from "@/lib/languages";
import { LanguageSelector } from "./language-selector";
import { cn } from "@/lib/utils";
import { useFileSystem } from "@/lib/stores/file-system";
import type { FileNode } from "@/lib/workspace/file-system";
import { useWorkbench } from "@/lib/stores/workbench-store";
import { loadEditorSettings } from "@/components/workspace/panels/settings-panel";
import { PeekDefinition } from "@/components/workspace/peek-definition";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
// Yjs imports moved to dynamic import to prevent build hangs
// import * as Y from "yjs"
// import { WebsocketProvider } from "y-websocket"
// import { MonacoBinding } from "y-monaco"

import { ErrorBoundary } from "@/components/shared/error-boundary";
import { MonacoErrorBoundary } from "@/components/workspace/layout/monaco-error-boundary";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

// LSP setup helper - currently uses Monaco built-in workers
function setupLsp(_monacoInstance: any, language: string) {
  // For TypeScript/JavaScript, Monaco's built-in worker provides excellent IntelliSense
  // For other languages, we could add LSP WebSocket connections here in the future
  if (
    ["typescript", "typescriptreact", "javascript", "javascriptreact"].includes(
      language,
    )
  ) {
    // TypeScript worker is already configured in onMount
    console.log(`TypeScript IntelliSense configured for ${language}`);
  } else {
    // Placeholder for future LSP server connections
    console.log(
      `LSP setup placeholder for ${language} - Monaco built-in support used`,
    );
  }
}
interface EditorPanelProps {
  groupId?: string;
  activeFile: string;
  openFiles: string[];
  onFileSelect: (file: string, groupId?: string) => void;
  onCloseFile: (file: string, groupId?: string) => void;
  yDoc?: any;
  provider?: any;
}

// ─── Module-level file icon helper ──────────────────
function getFileIconColor(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    tsx: "text-blue-400",
    ts: "text-blue-500",
    jsx: "text-yellow-400",
    js: "text-yellow-500",
    css: "text-pink-400",
    scss: "text-pink-500",
    less: "text-pink-300",
    html: "text-orange-400",
    htm: "text-orange-400",
    json: "text-yellow-500",
    yaml: "text-red-400",
    yml: "text-red-400",
    md: "text-muted-foreground",
    mdx: "text-muted-foreground",
    py: "text-green-400",
    go: "text-cyan-400",
    rs: "text-orange-500",
    java: "text-red-500",
    kt: "text-purple-400",
    rb: "text-red-400",
    php: "text-indigo-400",
    svg: "text-emerald-400",
    png: "text-emerald-300",
    jpg: "text-emerald-300",
    sql: "text-blue-300",
    prisma: "text-teal-400",
    toml: "text-gray-300",
    env: "text-yellow-300",
    sh: "text-green-300",
    bash: "text-green-300",
    dockerfile: "text-blue-300",
  };
  return iconMap[ext || ""] || "text-muted-foreground";
}

// ─── Memoized Editor Tab ────────────────────────────
interface EditorTabProps {
  tab: string;
  tabIdx: number;
  isActive: boolean;
  isPinned: boolean;
  isDirty: boolean;
  isDragOver: boolean;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onClose: () => void;
  onCloseOthers: () => void;
  onCloseToRight: () => void;
  onCloseAll: () => void;
  onPin: () => void;
  onUnpin: () => void;
}

const MemoizedEditorTab = memo(function EditorTab({
  tab,
  tabIdx,
  isActive,
  isPinned,
  isDirty,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onClick,
  onClose,
  onCloseOthers,
  onCloseToRight,
  onCloseAll,
  onPin,
  onUnpin,
}: EditorTabProps) {
  const fileName = tab.split("/").pop() || tab;
  return (
    <motion.div
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: "auto" }}
      exit={{ opacity: 0, width: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            draggable
            role="tab"
            aria-selected={isActive}
            aria-label={`${fileName}${isDirty ? " (unsaved)" : ""}${isPinned ? " (pinned)" : ""}`}
            onDragStart={() => onDragStart(tabIdx)}
            onDragOver={(e) => onDragOver(e, tabIdx)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, tabIdx)}
            onDragEnd={onDragEnd}
            onClick={onClick}
            className={cn(
              "group flex items-center gap-1.5 px-3 h-[35px] text-[12px] border-r border-[var(--ide-border)]/30 transition-all relative whitespace-nowrap shrink-0",
              isActive
                ? "bg-[var(--ide-editor-bg)] text-foreground"
                : "bg-[var(--ide-tab-inactive-bg)] text-muted-foreground hover:text-foreground hover:bg-[var(--ide-hover-bg)]",
              isDragOver && "ring-1 ring-primary/50",
            )}
          >
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-[var(--ide-tab-active-indicator)]" />
            )}
            {!isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--ide-border)]/30" />
            )}
            {isPinned && <Pin className="w-3 h-3 text-primary/70 shrink-0" />}
            <FileCode
              className={cn("w-3.5 h-3.5 shrink-0", getFileIconColor(tab))}
            />
            <span
              className={cn(
                "truncate max-w-[140px]",
                isActive && "font-medium",
                isPinned && "italic",
              )}
            >
              {fileName}
            </span>
            {isDirty && (
              <span
                className="w-2 h-2 rounded-full bg-foreground/60 shrink-0"
                title="Unsaved changes"
              />
            )}
            {!isPinned && !isDirty && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onClose();
                  }
                }}
                className="ml-1 p-0.5 rounded-sm hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onClose}>Close</ContextMenuItem>
          <ContextMenuItem onClick={onCloseOthers}>
            Close Others
          </ContextMenuItem>
          <ContextMenuItem onClick={onCloseToRight}>
            Close to the Right
          </ContextMenuItem>
          <ContextMenuItem onClick={onCloseAll}>Close All</ContextMenuItem>
          <ContextMenuSeparator />
          {isPinned ? (
            <ContextMenuItem onClick={onUnpin}>
              <PinOff className="w-3.5 h-3.5 mr-2" />
              Unpin Tab
            </ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={onPin}>
              <Pin className="w-3.5 h-3.5 mr-2" />
              Pin Tab
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </motion.div>
  );
});

export function EditorPanel({
  groupId,
  activeFile,
  openFiles,
  onFileSelect,
  onCloseFile,
  yDoc,
  provider,
}: EditorPanelProps) {
  const [code, setCode] = useState("");
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [overrideLanguage, setOverrideLanguage] =
    useState<LanguageSupport | null>(null);
  const [showBlame, setShowBlame] = useState(false);
  const [blameDecorations, setBlameDecorations] = useState<any>(null);

  const { fileMap, workspaceId } = useFileSystem();
  const {
    startFileWatching,
    watchFile,
    unwatchFile,
    externalChanges,
    acknowledgeExternalChange,
  } = useFileSystem();
  const {
    pinnedTabs,
    pinTab,
    unpinTab,
    closeAllTabs,
    closeOtherTabs,
    closeTabsToRight,
    reorderTab,
    activeGroupId,
    dirtyFiles,
    markDirty,
    markClean,
    setCursorPosition,
    setEditorLanguage,
    setEditorIndentation,
    setEditorEOL,
    navigateBack,
    navigateForward,
    addNavigationEntry,
    saveEditorViewState,
    getEditorViewState,
  } = useWorkbench();
  const currentGroupId = groupId || activeGroupId;

  // Drag-and-drop state for tabs
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Breadcrumb sibling navigation
  const [breadcrumbDropdown, setBreadcrumbDropdown] = useState<{
    segmentIdx: number;
    items: string[];
  } | null>(null);
  const breadcrumbRef = useRef<HTMLDivElement>(null);

  const getBreadcrumbSiblings = useCallback(
    (segmentIdx: number) => {
      const segments = activeFile.split("/");
      // Build the parent path for this segment
      const parentPath = segments.slice(0, segmentIdx).join("/");
      const siblings: string[] = [];

      // Find siblings in the file map by looking for entries whose parent matches
      for (const [path] of Object.entries(fileMap)) {
        const pathSegments = path.split("/");
        if (pathSegments.length >= segmentIdx + 1) {
          const pathParent = pathSegments.slice(0, segmentIdx).join("/");
          if (pathParent === parentPath && pathSegments[segmentIdx]) {
            const sibling = pathSegments[segmentIdx];
            if (!siblings.includes(sibling)) {
              siblings.push(sibling);
            }
          }
        }
      }

      return siblings.sort();
    },
    [activeFile, fileMap],
  );

  const handleBreadcrumbClick = (segmentIdx: number) => {
    const siblings = getBreadcrumbSiblings(segmentIdx);
    if (siblings.length > 1) {
      setBreadcrumbDropdown((prev) =>
        prev?.segmentIdx === segmentIdx
          ? null
          : { segmentIdx, items: siblings },
      );
    }
  };

  const handleBreadcrumbSelect = (segmentIdx: number, selected: string) => {
    const segments = activeFile.split("/");
    segments[segmentIdx] = selected;
    // For file segment (last), navigate to the file
    const newPath = segments.join("/");
    setBreadcrumbDropdown(null);
    onFileSelect(newPath);
  };

  // Close breadcrumb dropdown on outside click
  useEffect(() => {
    if (!breadcrumbDropdown) return;
    const handler = (e: MouseEvent) => {
      if (
        breadcrumbRef.current &&
        !breadcrumbRef.current.contains(e.target as Node)
      ) {
        setBreadcrumbDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [breadcrumbDropdown]);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  // Conditional breakpoints: lineNumber -> condition expression
  const [conditionalBreakpoints, setConditionalBreakpoints] = useState<
    Map<number, string>
  >(new Map());
  const [showBreakpointInput, setShowBreakpointInput] = useState<{
    line: number;
    x: number;
    y: number;
  } | null>(null);

  // Load editor settings from localStorage (event-driven via custom event + initial load)
  const [editorSettings, setEditorSettings] = useState(() =>
    loadEditorSettings("default"),
  );
  useEffect(() => {
    const handler = () => setEditorSettings(loadEditorSettings("default"));
    window.addEventListener("azora:settingsChanged", handler);
    // Also listen for storage events (cross-tab sync)
    window.addEventListener("storage", (e) => {
      if (e.key?.startsWith("buildspaces.settings")) handler();
    });
    return () => {
      window.removeEventListener("azora:settingsChanged", handler);
    };
  }, []);

  // Peek definition state
  const [peekVisible, setPeekVisible] = useState(false);
  const [peekSymbol, setPeekSymbol] = useState("");
  const [peekLocations, setPeekLocations] = useState<
    Array<{
      filePath: string;
      lineNumber: number;
      column: number;
      preview: string;
    }>
  >([]);

  // Find definitions across workspace files
  const findDefinitions = useCallback(
    (word: string) => {
      const locations: Array<{
        filePath: string;
        lineNumber: number;
        column: number;
        preview: string;
      }> = [];
      const patterns = [
        new RegExp(
          `(?:function|const|let|var|class|interface|type|enum)\\s+${word}\\b`,
        ),
        new RegExp(
          `export\\s+(?:default\\s+)?(?:function|const|let|var|class|interface|type|enum)\\s+${word}\\b`,
        ),
        new RegExp(`${word}\\s*[=:]\\s*(?:function|\\(|\\{)`),
      ];

      for (const [, node] of Object.entries(fileMap)) {
        if (node.type !== "file" || !node.content) continue;
        const filePath = node.path || node.name;
        const lines = node.content.split("\n");

        lines.forEach((lineText, idx) => {
          for (const pattern of patterns) {
            if (pattern.test(lineText)) {
              const start = Math.max(0, idx - 3);
              const end = Math.min(lines.length, idx + 7);
              locations.push({
                filePath,
                lineNumber: idx + 1,
                column: lineText.indexOf(word) + 1,
                preview: lines.slice(start, end).join("\n"),
              });
              return; // Only one match per line
            }
          }
        });
      }
      return locations;
    },
    [fileMap],
  );
  const providerRef = useRef<any | null>(null);
  const bindingRef = useRef<any | null>(null);
  const ydocRef = useRef<any | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadedFileRef = useRef<string>(activeFile);
  const pendingNavigationRef = useRef<{
    filePath: string;
    line: number;
    column: number;
  } | null>(null);

  // AI inline ghost-text typing state
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Detect language from file extension or override
  const detectedLanguage = useMemo(() => {
    if (overrideLanguage) return overrideLanguage;
    if (!activeFile) return null;
    const ext = "." + activeFile.split(".").pop();
    return getLanguageByExtension(ext) || null;
  }, [activeFile, overrideLanguage]);

  const monacoLanguage = detectedLanguage?.monaco || "plaintext";

  const navigateToLocation = useCallback((line: number, column = 1) => {
    const editor = editorRef.current;
    const model = editor?.getModel?.();
    if (!editor || !model) return false;

    const safeLine = Math.min(Math.max(1, line), model.getLineCount());
    const safeColumn = Math.min(
      Math.max(1, column),
      model.getLineMaxColumn(safeLine),
    );

    editor.revealLineInCenter(safeLine);
    editor.setPosition({ lineNumber: safeLine, column: safeColumn });
    editor.focus();
    return true;
  }, []);

  // Save editor view state before switching files
  const prevFileRef = useRef<string>(activeFile);
  useEffect(() => {
    const prevFile = prevFileRef.current;
    if (prevFile && prevFile !== activeFile && editorRef.current) {
      const editor = editorRef.current;
      const pos = editor.getPosition?.();
      saveEditorViewState(prevFile, {
        cursorLine: pos?.lineNumber ?? 1,
        cursorColumn: pos?.column ?? 1,
        scrollTop: editor.getScrollTop?.() ?? 0,
        scrollLeft: editor.getScrollLeft?.() ?? 0,
      });
    }
    prevFileRef.current = activeFile;
  }, [activeFile, saveEditorViewState]);

  // Restore editor view state after file content loads
  useEffect(() => {
    if (!editorRef.current || !activeFile) return;
    const saved = getEditorViewState(activeFile);
    if (saved) {
      const editor = editorRef.current;
      // Defer restoration to next frame so Monaco has applied the new model
      requestAnimationFrame(() => {
        editor.setScrollTop?.(saved.scrollTop);
        editor.setScrollLeft?.(saved.scrollLeft);
        editor.setPosition?.({
          lineNumber: saved.cursorLine,
          column: saved.cursorColumn,
        });
      });
    }
  }, [activeFile, code, getEditorViewState]);

  // Fetch file content
  useEffect(() => {
    if (!activeFile) return;

    let cancelled = false;

    const fetchContent = async () => {
      setIsLoadingFile(true);
      try {
        const params = new URLSearchParams({ path: activeFile });
        if (workspaceId) {
          params.set("workspaceId", workspaceId);
        }

        const response = await fetch(`/api/fs/content?${params.toString()}`);
        const data = await response.json();

        if (cancelled) return;

        if (response.ok && data.content !== undefined) {
          setCode(data.content);
        } else {
          const reason = data?.error || `HTTP ${response.status}`;
          setCode(`// Unable to load ${activeFile}\n// ${reason}`);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to fetch file content:", error);
        setCode("// Error loading file");
      } finally {
        if (cancelled) return;
        loadedFileRef.current = activeFile;
        setIsLoadingFile(false);
      }
    };

    fetchContent();

    return () => {
      cancelled = true;
    };
  }, [activeFile, workspaceId]);

  // Setup Monaco LSP client when editor mounts and language changes
  useMonacoEffect(() => {
    if (!editorRef.current || !monacoLanguage) return;
    try {
      setupLsp(editorRef.current.editor, monacoLanguage);
    } catch (err) {
      // Ignore if LSP setup fails
    }
  }, [monacoLanguage]);

  // Auto-save logic
  const handleCodeChange = (newCode: string | undefined) => {
    const value = newCode || "";
    setCode(value);

    // Mark file as dirty
    markDirty(activeFile);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Format on save if enabled
        if (editorSettings.formatOnSave && editorRef.current) {
          const formatAction = editorRef.current.getAction(
            "editor.action.formatDocument",
          );
          if (formatAction) {
            await formatAction.run();
          }
        }

        const finalValue = editorRef.current
          ? editorRef.current.getValue()
          : value;
        await fetch("/api/fs/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: activeFile, content: finalValue }),
        });
        markClean(activeFile);
        console.log(`Saved ${activeFile}`);
      } catch (error) {
        console.error("Failed to save file:", error);
      }
    }, 1000);
  };

  // Manual save handler (Ctrl+S)
  const handleManualSave = useCallback(async () => {
    if (!editorRef.current) return;
    try {
      // Code actions on save
      if (editorSettings.codeActionsOnSave?.organizeImports) {
        const organizeImports = editorRef.current.getAction(
          "editor.action.organizeImports",
        );
        if (organizeImports) {
          try {
            await organizeImports.run();
          } catch {
            /* may not be available */
          }
        }
      }
      if (editorSettings.codeActionsOnSave?.fixAll) {
        const fixAll = editorRef.current.getAction("editor.action.fixAll");
        if (fixAll) {
          try {
            await fixAll.run();
          } catch {
            /* may not be available */
          }
        }
      }
      if (editorSettings.formatOnSave) {
        const formatAction = editorRef.current.getAction(
          "editor.action.formatDocument",
        );
        if (formatAction) await formatAction.run();
      }
      const value = editorRef.current.getValue();
      await fetch("/api/fs/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: activeFile, content: value }),
      });
      markClean(activeFile);
      setCode(value);

      // Cross-room bridge: notify Design Studio and other rooms of saved file
      window.dispatchEvent(
        new CustomEvent("azora:file-saved", {
          detail: { path: activeFile, content: value },
        }),
      );
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  }, [activeFile, editorSettings.formatOnSave, markClean]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "s" &&
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        handleManualSave();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleManualSave]);

  // Git Blame toggle handler
  const toggleBlame = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    if (showBlame && blameDecorations) {
      blameDecorations.clear();
      setBlameDecorations(null);
      setShowBlame(false);
      return;
    }

    // Fetch blame data from API
    try {
      const resp = await fetch(
        `/api/projects/current/git/blame?file=${encodeURIComponent(activeFile)}`,
      );
      if (!resp.ok) {
        throw new Error(`Git blame request failed with status ${resp.status}`);
      }
      const data = await resp.json();
      if (Array.isArray(data.blame)) {
        const decorations = data.blame.map((entry: any, idx: number) => ({
          range: {
            startLineNumber: idx + 1,
            startColumn: 1,
            endLineNumber: idx + 1,
            endColumn: 1,
          },
          options: {
            after: {
              content: ` // ${entry.author} • ${entry.date}`,
              inlineClassName: "blame-annotation",
            },
          },
        }));
        const collection = editor.createDecorationsCollection(decorations);
        setBlameDecorations(collection);
        setShowBlame(true);
      }
    } catch (error) {
      console.error("Failed to load git blame:", error);
      setShowBlame(false);
    }
  }, [activeFile, showBlame, blameDecorations]);

  // Inline debug values listener
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.variables || !editorRef.current) return;
      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) return;

      // Show inline variable values as decorations
      const decorations = detail.variables
        .filter((v: any) => v.line && v.name && v.value)
        .map((v: any) => ({
          range: {
            startLineNumber: v.line,
            startColumn: 1,
            endLineNumber: v.line,
            endColumn: 1,
          },
          options: {
            after: {
              content: `  ${v.name} = ${v.value}`,
              inlineClassName: "inline-debug-value",
            },
          },
        }));
      editor.createDecorationsCollection(decorations);
    };
    window.addEventListener("debug:inlineValues", handler);
    return () => window.removeEventListener("debug:inlineValues", handler);
  }, []);

  // Go to Line event listener (from GoToLineDialog)
  useEffect(() => {
    const handler = (e: Event) => {
      if (groupId && activeGroupId !== groupId) return;
      const detail = (e as CustomEvent).detail;
      if (detail?.line) {
        navigateToLocation(detail.line, detail.column || 1);
      }
    };
    window.addEventListener("azora:gotoLine", handler);
    return () => window.removeEventListener("azora:gotoLine", handler);
  }, [activeGroupId, groupId, navigateToLocation]);

  // Quick Open file open listener
  useEffect(() => {
    const handler = (e: Event) => {
      if (groupId && activeGroupId !== groupId) return;
      const detail = (e as CustomEvent).detail;
      if (detail?.path) {
        if (typeof detail.line === "number" && detail.line > 0) {
          if (
            detail.path === activeFile &&
            loadedFileRef.current === activeFile
          ) {
            requestAnimationFrame(() => {
              navigateToLocation(detail.line, detail.column || 1);
            });
          } else {
            pendingNavigationRef.current = {
              filePath: detail.path,
              line: detail.line,
              column: detail.column || 1,
            };
          }
        } else if (pendingNavigationRef.current?.filePath === detail.path) {
          pendingNavigationRef.current = null;
        }

        onFileSelect(detail.path);
      }
    };
    window.addEventListener("azora:openFile", handler);
    return () => window.removeEventListener("azora:openFile", handler);
  }, [activeFile, activeGroupId, groupId, navigateToLocation, onFileSelect]);

  useEffect(() => {
    const pendingNavigation = pendingNavigationRef.current;
    if (
      !pendingNavigation ||
      pendingNavigation.filePath !== activeFile ||
      loadedFileRef.current !== activeFile
    ) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (
        navigateToLocation(pendingNavigation.line, pendingNavigation.column)
      ) {
        pendingNavigationRef.current = null;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [activeFile, code, navigateToLocation]);

  // Editor zoom handler (Ctrl+= / Ctrl+- / Ctrl+0)
  useEffect(() => {
    const DEFAULT_FONT_SIZE = 14;
    const handler = (e: Event) => {
      const editor = editorRef.current;
      if (!editor) return;
      const { direction } = (e as CustomEvent).detail || {};
      const current = editor.getOption(50 /* FontSize */) || DEFAULT_FONT_SIZE;
      if (direction === "in") {
        editor.updateOptions({ fontSize: Math.min(current + 2, 40) });
      } else if (direction === "out") {
        editor.updateOptions({ fontSize: Math.max(current - 2, 8) });
      } else if (direction === "reset") {
        editor.updateOptions({ fontSize: DEFAULT_FONT_SIZE });
      }
    };
    const kbHandler = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("editor:zoom", { detail: { direction: "in" } }),
        );
      } else if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("editor:zoom", { detail: { direction: "out" } }),
        );
      } else if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("editor:zoom", { detail: { direction: "reset" } }),
        );
      }
    };
    window.addEventListener("editor:zoom", handler);
    window.addEventListener("keydown", kbHandler);
    return () => {
      window.removeEventListener("editor:zoom", handler);
      window.removeEventListener("keydown", kbHandler);
    };
  }, []);

  // Elara AI: Insert code at cursor position
  useEffect(() => {
    const handler = (e: Event) => {
      const editor = editorRef.current;
      if (!editor) return;
      const { code } = (e as CustomEvent).detail || {};
      if (!code) return;
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits("elara-insert", [
          {
            range: selection,
            text: code,
            forceMoveMarkers: true,
          },
        ]);
      }
    };
    window.addEventListener("elara:insert-at-cursor", handler);
    return () => window.removeEventListener("elara:insert-at-cursor", handler);
  }, []);

  // Cross-room file injection (AI Studio → Code Chamber, Spec Chamber → Code Chamber, etc.)
  useEffect(() => {
    const handler = async (e: Event) => {
      const { path, content } = (e as CustomEvent).detail || {};
      if (!path || typeof content !== "string") return;
      try {
        // Write file via the API endpoint, which mirrors the save flow
        await fetch("/api/fs/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, content }),
        });
        // Automatically open the injected file
        if (typeof onFileSelect === "function") {
          onFileSelect(path);
        }
      } catch (err) {
        console.error("Failed to inject file from cross-room event:", err);
      }
    };
    window.addEventListener("azora:inject-file", handler);
    return () => window.removeEventListener("azora:inject-file", handler);
  }, [onFileSelect]);

  // Merge conflict marker detection & inline resolution
  const conflictDecorationsRef = useRef<any>(null);
  const conflictLensRef = useRef<any>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !code) return;
    const model = editor.getModel();
    if (!model) return;

    // Detect conflict markers
    const lines = code.split("\n");
    const conflicts: Array<{
      startLine: number;
      separatorLine: number;
      endLine: number;
    }> = [];
    let currentStart: number | null = null;
    let currentSeparator: number | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("<<<<<<<")) {
        currentStart = i + 1; // 1-indexed
      } else if (line.startsWith("=======") && currentStart !== null) {
        currentSeparator = i + 1;
      } else if (
        line.startsWith(">>>>>>>") &&
        currentStart !== null &&
        currentSeparator !== null
      ) {
        conflicts.push({
          startLine: currentStart,
          separatorLine: currentSeparator,
          endLine: i + 1,
        });
        currentStart = null;
        currentSeparator = null;
      }
    }

    // Clear old decorations
    if (conflictDecorationsRef.current) {
      conflictDecorationsRef.current.clear();
      conflictDecorationsRef.current = null;
    }
    if (conflictLensRef.current) {
      conflictLensRef.current.dispose();
      conflictLensRef.current = null;
    }

    if (conflicts.length === 0) return;

    // Add colored decorations for conflict regions
    const decorations = conflicts.flatMap((c) => [
      // Current change (green tint)
      {
        range: {
          startLineNumber: c.startLine,
          startColumn: 1,
          endLineNumber: c.separatorLine - 1,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: "merge-conflict-current",
          overviewRuler: {
            color: "var(--ide-merge-current-ruler)",
            position: 1,
          },
        },
      },
      // Incoming change (blue tint)
      {
        range: {
          startLineNumber: c.separatorLine + 1,
          startColumn: 1,
          endLineNumber: c.endLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: "merge-conflict-incoming",
          overviewRuler: {
            color: "var(--ide-merge-incoming-ruler)",
            position: 1,
          },
        },
      },
      // Marker lines (dim)
      {
        range: {
          startLineNumber: c.startLine,
          startColumn: 1,
          endLineNumber: c.startLine,
          endColumn: 1,
        },
        options: { isWholeLine: true, className: "merge-conflict-marker" },
      },
      {
        range: {
          startLineNumber: c.separatorLine,
          startColumn: 1,
          endLineNumber: c.separatorLine,
          endColumn: 1,
        },
        options: { isWholeLine: true, className: "merge-conflict-marker" },
      },
      {
        range: {
          startLineNumber: c.endLine,
          startColumn: 1,
          endLineNumber: c.endLine,
          endColumn: 1,
        },
        options: { isWholeLine: true, className: "merge-conflict-marker" },
      },
    ]);
    conflictDecorationsRef.current =
      editor.createDecorationsCollection(decorations);

    // Register CodeLens provider for conflict actions
    try {
      const monaco = (window as any).monaco;
      if (monaco) {
        conflictLensRef.current = monaco.languages.registerCodeLensProvider(
          monacoLanguage,
          {
            provideCodeLenses: () => {
              const lenses = conflicts.flatMap((c, idx) => [
                {
                  range: {
                    startLineNumber: c.startLine,
                    startColumn: 1,
                    endLineNumber: c.startLine,
                    endColumn: 1,
                  },
                  command: {
                    id: `merge.acceptCurrent.${idx}`,
                    title: "Accept Current Change",
                    arguments: [c],
                  },
                },
                {
                  range: {
                    startLineNumber: c.startLine,
                    startColumn: 1,
                    endLineNumber: c.startLine,
                    endColumn: 1,
                  },
                  command: {
                    id: `merge.acceptIncoming.${idx}`,
                    title: "Accept Incoming Change",
                    arguments: [c],
                  },
                },
                {
                  range: {
                    startLineNumber: c.startLine,
                    startColumn: 1,
                    endLineNumber: c.startLine,
                    endColumn: 1,
                  },
                  command: {
                    id: `merge.acceptBoth.${idx}`,
                    title: "Accept Both Changes",
                    arguments: [c],
                  },
                },
              ]);
              return { lenses, dispose: () => { } };
            },
          },
        );

        // Register commands for each conflict
        conflicts.forEach((c, idx) => {
          const resolveConflict = (
            keepCurrent: boolean,
            keepIncoming: boolean,
          ) => {
            const lines = model.getLinesContent();
            const currentLines = lines.slice(c.startLine, c.separatorLine - 1); // between <<<<<<< and =======
            const incomingLines = lines.slice(c.separatorLine, c.endLine - 1); // between ======= and >>>>>>>
            let replacement: string[] = [];
            if (keepCurrent && keepIncoming)
              replacement = [...currentLines, ...incomingLines];
            else if (keepCurrent) replacement = currentLines;
            else if (keepIncoming) replacement = incomingLines;

            const range = {
              startLineNumber: c.startLine,
              startColumn: 1,
              endLineNumber: c.endLine,
              endColumn: lines[c.endLine - 1].length + 1,
            };
            editor.executeEdits("merge-resolve", [
              { range, text: replacement.join("\n") },
            ]);
          };

          try {
            editor.addCommand(
              0,
              () => resolveConflict(true, false),
              `merge.acceptCurrent.${idx}`,
            );
            editor.addCommand(
              0,
              () => resolveConflict(false, true),
              `merge.acceptIncoming.${idx}`,
            );
            editor.addCommand(
              0,
              () => resolveConflict(true, true),
              `merge.acceptBoth.${idx}`,
            );
          } catch {
            // Commands may already be registered
          }
        });
      }
    } catch {
      // Monaco global not available
    }

    return () => {
      if (conflictDecorationsRef.current) {
        conflictDecorationsRef.current.clear();
        conflictDecorationsRef.current = null;
      }
      if (conflictLensRef.current) {
        conflictLensRef.current.dispose();
        conflictLensRef.current = null;
      }
    };
  }, [code, monacoLanguage]);

  // Initialize file watching
  useEffect(() => {
    startFileWatching();
    return () => {
      // Note: We don't stop watching here as other components might be using it
    };
  }, [startFileWatching]);

  // Watch/unwatch files when they open/close
  useEffect(() => {
    if (activeFile) {
      watchFile(activeFile);
    }
    return () => {
      if (activeFile) {
        unwatchFile(activeFile);
      }
    };
  }, [activeFile, watchFile, unwatchFile]);

  // Navigation history keyboard shortcuts (Alt+Left/Right)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          navigateBack();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          navigateForward();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigateBack, navigateForward]);

  // Track navigation entries when cursor position changes significantly
  useEffect(() => {
    const handler = (e: Event) => {
      if (groupId && activeGroupId !== groupId) return;
      const { fileId, line, column } = (e as CustomEvent).detail;
      if (fileId === activeFile) {
        // Navigate to the position in the editor
        const editor = editorRef.current;
        if (editor) {
          editor.setPosition({ lineNumber: line, column: column });
          editor.revealLineInCenter(line);
          editor.focus();
        }
      }
    };
    window.addEventListener("workbench:navigate-to", handler);
    return () => window.removeEventListener("workbench:navigate-to", handler);
  }, [activeFile, activeGroupId, groupId]);

  // Track cursor position changes for navigation history
  const lastNavigationRef = useRef<{
    line: number;
    column: number;
    timestamp: number;
  } | null>(null);
  useEffect(() => {
    const updateNavigationHistory = () => {
      const editor = editorRef.current;
      if (!editor || !activeFile) return;

      const pos = editor.getPosition();
      if (!pos) return;

      // Only add navigation entry if moved significantly (different line or >10 columns)
      const last = lastNavigationRef.current;
      if (
        !last ||
        Math.abs(pos.lineNumber - last.line) > 0 ||
        Math.abs(pos.column - last.column) > 10 ||
        Date.now() - last.timestamp > 5000
      ) {
        // Or after 5 seconds
        addNavigationEntry(activeFile, pos.lineNumber, pos.column);
        lastNavigationRef.current = {
          line: pos.lineNumber,
          column: pos.column,
          timestamp: Date.now(),
        };
      }
    };

    // Track on cursor position changes
    const editor = editorRef.current;
    if (editor) {
      const disposable = editor.onDidChangeCursorPosition(
        updateNavigationHistory,
      );
      return () => disposable.dispose();
    }
  }, [activeFile, addNavigationEntry]);

  // Merge conflict detection and resolution
  const [conflictDecorations, setConflictDecorations] = useState<any>(null);
  const conflictRangesRef = useRef<
    { startLine: number; midLine: number; endLine: number }[]
  >([]);

  const resolveConflict = useCallback(
    (index: number, action: "current" | "incoming" | "both") => {
      const editor = editorRef.current;
      if (!editor) return;
      const model = editor.getModel();
      if (!model) return;
      const conflict = conflictRangesRef.current[index];
      if (!conflict) return;

      const { startLine, midLine, endLine } = conflict;
      const lines = model.getValue().split("\n");
      const currentLines = lines.slice(startLine, midLine - 2); // between <<<<<<< and =======
      const incomingLines = lines.slice(midLine, endLine - 2); // between ======= and >>>>>>>

      let replacement: string[];
      if (action === "current") replacement = currentLines;
      else if (action === "incoming") replacement = incomingLines;
      else replacement = [...currentLines, ...incomingLines];

      const fullRange = {
        startLineNumber: startLine,
        startColumn: 1,
        endLineNumber: endLine,
        endColumn: lines[endLine - 1].length + 1,
      };
      editor.executeEdits("merge-conflict-resolve", [
        {
          range: fullRange,
          text: replacement.join("\n"),
        },
      ]);
    },
    [],
  );

  useEffect(() => {
    if (!editorRef.current || !code) return;
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Detect <<<<<<< ... ======= ... >>>>>>> markers
    const lines = code.split("\n");
    const decorations: any[] = [];
    const ranges: { startLine: number; midLine: number; endLine: number }[] =
      [];
    let i = 0;
    while (i < lines.length) {
      if (lines[i].startsWith("<<<<<<<")) {
        const startLine = i + 1;
        let midLine = -1;
        let endLine = -1;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].startsWith("=======")) midLine = j + 1;
          if (lines[j].startsWith(">>>>>>>")) {
            endLine = j + 1;
            break;
          }
        }
        if (midLine > 0 && endLine > 0) {
          ranges.push({ startLine, midLine, endLine });
          const idx = ranges.length - 1;
          // Current change (green)
          decorations.push({
            range: {
              startLineNumber: startLine,
              startColumn: 1,
              endLineNumber: midLine - 1,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              className: "merge-conflict-current",
              overviewRuler: {
                color: "var(--ide-merge-current-gutter)",
                position: 1,
              },
              linesDecorationsClassName: "merge-conflict-current-gutter",
            },
          });
          // Incoming change (blue)
          decorations.push({
            range: {
              startLineNumber: midLine + 1,
              startColumn: 1,
              endLineNumber: endLine,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              className: "merge-conflict-incoming",
              overviewRuler: {
                color: "var(--ide-merge-incoming-gutter)",
                position: 1,
              },
              linesDecorationsClassName: "merge-conflict-incoming-gutter",
            },
          });
          // Marker line for action buttons (above the conflict start)
          decorations.push({
            range: {
              startLineNumber: startLine,
              startColumn: 1,
              endLineNumber: startLine,
              endColumn: 1,
            },
            options: {
              before: {
                content: ` Accept Current (${idx}) | Accept Incoming (${idx}) | Accept Both (${idx}) `,
                inlineClassName: "merge-conflict-actions",
              },
            },
          });
          i = endLine;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }

    conflictRangesRef.current = ranges;

    if (decorations.length > 0) {
      if (conflictDecorations) conflictDecorations.clear();
      const coll = editor.createDecorationsCollection(decorations);
      setConflictDecorations(coll);
    } else if (conflictDecorations) {
      conflictDecorations.clear();
      setConflictDecorations(null);
    }
  }, [code]);

  // Merge conflict action mouse handler
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const disposable = editor.onMouseDown((e: any) => {
      const target = e.target;
      if (target?.element?.classList?.contains("merge-conflict-actions")) {
        const text = target.element.textContent || "";
        const currentMatch = text.match(/Accept Current \((\d+)\)/);
        const incomingMatch = text.match(/Accept Incoming \((\d+)\)/);
        const bothMatch = text.match(/Accept Both \((\d+)\)/);
        // Determine which action was clicked based on cursor position in the text
        const clickX = e.event?.posx || 0;
        const rect = target.element.getBoundingClientRect();
        const relX = clickX - rect.left;
        const textWidth = rect.width;
        const thirdWidth = textWidth / 3;

        if (currentMatch && relX < thirdWidth) {
          resolveConflict(parseInt(currentMatch[1]), "current");
        } else if (
          incomingMatch &&
          relX >= thirdWidth &&
          relX < thirdWidth * 2
        ) {
          resolveConflict(parseInt(incomingMatch[1]), "incoming");
        } else if (bothMatch && relX >= thirdWidth * 2) {
          resolveConflict(parseInt(bothMatch[1]), "both");
        }
      }
    });
    return () => disposable.dispose();
  }, [resolveConflict]);

  // Go to Symbol (Ctrl+Shift+O) - open quick outline
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "o" && e.ctrlKey && e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (editorRef.current) {
          editorRef.current.trigger(
            "keyboard",
            "editor.action.quickOutline",
            null,
          );
        }
      }
      // Go to Symbol in Workspace (Ctrl+T) - searches across all files
      if (e.key === "t" && e.ctrlKey && !e.shiftKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const inInput =
          target.tagName === "INPUT" || target.tagName === "TEXTAREA";
        if (!inInput) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("azora:workspaceSymbolSearch"));
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    setIsAiTyping(false);
  }, [activeFile]);

  // Initialize Yjs for real-time collaboration
  useEffect(() => {
    if (!activeFile) return;
    if (typeof window === "undefined") return;

    let cancelled = false;

    // Skip local Yjs initialization if global workspace provider was passed implicitly
    if (yDoc && provider) {
      ydocRef.current = yDoc;
      providerRef.current = provider;
      setIsConnected(true);
      return;
    }

    let wsProvider: any = null;
    let localBinding: any = null;
    let ydoc: any = null;

    const initCollaboration = async () => {
      try {
        // Dynamic imports to avoid SSR/Build issues
        const Y = await import("yjs");
        const { WebsocketProvider } = await import("y-websocket");

        if (cancelled) return;

        // Clean up previous
        if (bindingRef.current) {
          bindingRef.current.destroy();
          bindingRef.current = null;
        }
        if (providerRef.current) {
          providerRef.current.destroy();
          providerRef.current = null;
        }
        if (ydocRef.current) {
          ydocRef.current.destroy();
          ydocRef.current = null;
        }

        ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        // Setup WebSocket for collaboration using relative protocols/host depending on environment
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = window.location.host;
        // We assume your Yjs websocket server runs at the same endpoint path below, or you may need to specify its dedicated port if remote.
        // But assuming a single monolith:
        wsProvider = new WebsocketProvider(
          `${protocol}//${wsHost}/api/yjs`,
          `buildspaces-${activeFile}`,
          ydoc,
        );
        providerRef.current = wsProvider;

        wsProvider.on("status", (event: any) => {
          if (cancelled) return;
          setIsConnected(event.status === "connected");
        });

        wsProvider.on("peers", (peers: any) => {
          if (cancelled) return;
          setCollaborators(Object.keys(peers));
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to initialize collaboration:", error);
          setIsConnected(false);
          setCollaborators([]);
        }
      }
    };

    initCollaboration();

    return () => {
      cancelled = true;
      if (bindingRef.current) bindingRef.current.destroy();

      // Only destroy if we created them locally
      if (!yDoc && providerRef.current) providerRef.current.destroy();
      if (!yDoc && ydocRef.current) ydocRef.current.destroy();
    };
  }, [activeFile, yDoc, provider]);

  // Bind Monaco editor to YJS whenever activeFile, provider, or editorInstance changes
  useEffect(() => {
    if (
      !editorInstance ||
      !activeFile ||
      !ydocRef.current ||
      !providerRef.current
    )
      return;

    let localBinding: any = null;
    let presenceDecorations: any = null;

    const setupBinding = async () => {
      const { MonacoBinding } = await import("y-monaco");

      const docKey = yDoc ? activeFile : "monaco";
      const ytext = ydocRef.current.getText(docKey);

      localBinding = new MonacoBinding(
        ytext,
        editorInstance.getModel()!,
        new Set([editorInstance]),
        providerRef.current.awareness,
      );
      bindingRef.current = localBinding;

      const awareness = providerRef.current.awareness;
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      const COLORS = [
        cs.getPropertyValue("--ide-collab-0").trim() || "#f97316",
        cs.getPropertyValue("--ide-collab-1").trim() || "#22c55e",
        cs.getPropertyValue("--ide-collab-2").trim() || "#3b82f6",
        cs.getPropertyValue("--ide-collab-3").trim() || "#a855f7",
        cs.getPropertyValue("--ide-collab-4").trim() || "#ec4899",
        cs.getPropertyValue("--ide-collab-5").trim() || "#14b8a6",
      ];

      const updateAwareness = () => {
        const states = awareness.getStates();
        const myId = awareness.clientID;
        const decorations: any[] = [];

        states.forEach((state: any, clientId: number) => {
          if (clientId === myId) return;
          const cursor = state?.cursor;
          const user = state?.user || { name: `User ${clientId % 100}` };

          if (cursor?.anchor != null && cursor?.head != null) {
            const line = Math.max(1, (cursor.head?.line ?? cursor.head) + 1);
            const col = Math.max(
              1,
              (cursor.head?.ch ?? cursor.head?.column ?? 1) + 1,
            );

            decorations.push({
              range: new monacoRef.current.Range(line, col, line, col + 1),
              options: {
                className: `presence-cursor-${clientId % COLORS.length}`,
                before: {
                  content: ` ${user.name} `,
                  inlineClassName: `presence-label-${clientId % COLORS.length}`,
                },
                stickiness: 1,
              },
            });
          }
        });

        if (presenceDecorations) presenceDecorations.clear();
        if (decorations.length > 0) {
          presenceDecorations =
            editorInstance.createDecorationsCollection(decorations);
        }
      };

      awareness.on("change", updateAwareness);

      awareness.setLocalStateField("user", {
        name: `User ${awareness.clientID % 100}`,
        color: COLORS[awareness.clientID % COLORS.length],
      });
    };

    setupBinding();

    return () => {
      if (localBinding) localBinding.destroy();
      if (presenceDecorations) presenceDecorations.clear();
      if (bindingRef.current === localBinding) bindingRef.current = null;
    };
  }, [editorInstance, activeFile, yDoc, provider, isConnected]);

  const isInactivePane = groupId && activeGroupId && groupId !== activeGroupId;

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 bg-[var(--ide-editor-bg)] transition-all duration-300 ${isInactivePane ? "opacity-60 saturate-[0.7] focus-within:opacity-100 focus-within:saturate-100" : ""}`}
    >
      {/* Interactive Breadcrumb */}
      <div
        ref={breadcrumbRef}
        className="flex items-center justify-between px-2 py-0.5 text-[11px] text-muted-foreground border-b border-[var(--ide-border)]/20 bg-[var(--ide-breadcrumb-bg)] relative"
      >
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          {activeFile.split("/").map((segment, i, arr) => (
            <span key={i} className="flex items-center gap-1 shrink-0 relative">
              {i > 0 && <ChevronRight className="w-3 h-3 opacity-40" />}
              <button
                className={cn(
                  "hover:text-foreground hover:bg-accent/40 px-1 py-0.5 rounded-sm cursor-pointer transition-colors truncate",
                  i === arr.length - 1 && "text-foreground font-medium",
                  breadcrumbDropdown?.segmentIdx === i &&
                  "bg-accent/60 text-foreground",
                )}
                onClick={() => handleBreadcrumbClick(i)}
                title={`Navigate to siblings of ${segment}`}
              >
                {i < arr.length - 1 ? (
                  <span className="flex items-center gap-1">
                    <FolderOpen className="w-3 h-3 opacity-60" />
                    {segment}
                  </span>
                ) : (
                  segment
                )}
              </button>

              {/* Sibling dropdown */}
              {breadcrumbDropdown?.segmentIdx === i && (
                <div className="absolute top-full left-0 z-50 mt-1 min-w-[160px] max-h-[200px] overflow-auto bg-popover border border-border/60 rounded-md shadow-xl py-1">
                  {breadcrumbDropdown.items.map((item) => {
                    const isCurrent = activeFile.split("/")[i] === item;
                    return (
                      <button
                        key={item}
                        className={cn(
                          "w-full text-left px-3 py-1 text-[11px] hover:bg-accent/50 transition-colors flex items-center gap-2",
                          isCurrent &&
                          "bg-accent/30 font-medium text-foreground",
                        )}
                        onClick={() => handleBreadcrumbSelect(i, item)}
                      >
                        {i < arr.length - 1 ? (
                          <FolderOpen className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <FileCode className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="truncate">{item}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </span>
          ))}
        </div>

        {/* Collaboration Status */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {collaborators.length > 0 && (
            <div className="flex items-center gap-1 text-emerald-500 text-[10px]">
              <Users className="w-3 h-3" />
              <span>{collaborators.length + 1} online</span>
            </div>
          )}
          <div
            className={cn(
              "flex items-center gap-1 text-[10px]",
              isConnected ? "text-emerald-500" : "text-amber-500",
            )}
          >
            {isConnected ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
          </div>
          <div className="h-3 w-px bg-border/40" />
          <button
            onClick={toggleBlame}
            className={cn(
              "flex items-center gap-1 text-[10px] px-1 py-0.5 rounded hover:bg-muted/40 transition-colors",
              showBlame ? "text-primary" : "text-muted-foreground",
            )}
            title={showBlame ? "Hide Blame" : "Show Git Blame"}
          >
            <GitCommitVertical className="w-3 h-3" />
            {showBlame ? "Blame" : "Blame"}
          </button>
          <div className="h-3 w-px bg-border/40" />
          <LanguageSelector
            currentFileName={activeFile}
            currentLanguageId={overrideLanguage?.id}
            onLanguageChange={(lang) => setOverrideLanguage(lang)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center border-b border-[var(--ide-border)]/30 bg-[var(--ide-tab-inactive-bg)] overflow-x-auto scrollbar-hide"
        role="tablist"
        aria-label="Open editor tabs"
      >
        <AnimatePresence initial={false}>
          {openFiles.map((tab, tabIdx) => (
            <MemoizedEditorTab
              key={tab}
              tab={tab}
              tabIdx={tabIdx}
              isActive={activeFile === tab}
              isPinned={pinnedTabs.includes(tab)}
              isDirty={dirtyFiles.has(tab)}
              isDragOver={dragOverIdx === tabIdx}
              onDragStart={(idx) => {
                setDragIdx(idx);
              }}
              onDragOver={(e, idx) => {
                e.preventDefault();
                setDragOverIdx(idx);
              }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={(e, idx) => {
                e.preventDefault();
                if (dragIdx !== null && dragIdx !== idx) {
                  reorderTab(currentGroupId, dragIdx, idx);
                }
                setDragIdx(null);
                setDragOverIdx(null);
              }}
              onDragEnd={() => {
                setDragIdx(null);
                setDragOverIdx(null);
              }}
              onClick={() => onFileSelect(tab, groupId)}
              onClose={() => onCloseFile(tab, groupId)}
              onCloseOthers={() => closeOtherTabs(currentGroupId, tab)}
              onCloseToRight={() => closeTabsToRight(currentGroupId, tab)}
              onCloseAll={() => closeAllTabs(currentGroupId)}
              onPin={() => pinTab(tab)}
              onUnpin={() => unpinTab(tab)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 relative">
        {/* Loading overlay */}
        <AnimatePresence>
          {isLoadingFile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--ide-editor-bg)]"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-[var(--ide-tab-active-indicator)] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">
                  Loading {activeFile.split("/").pop()}...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <MonacoErrorBoundary>
          <MonacoEditor
            height="100%"
            language={monacoLanguage}
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              monacoRef.current = monaco;
              setEditorInstance(editor);
              const languages = [
                "typescript",
                "typescriptreact",
                "javascript",
                "javascriptreact",
              ];

              // Configure TypeScript worker for workspace-aware IntelliSense
              if (languages.includes(monacoLanguage)) {
                // Set up TypeScript compiler options for better IntelliSense
                monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
                  {
                    target: monaco.languages.typescript.ScriptTarget.ES2020,
                    allowNonTsExtensions: true,
                    moduleResolution:
                      monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                    module: monaco.languages.typescript.ModuleKind.CommonJS,
                    noEmit: true,
                    esModuleInterop: true,
                    jsx: monacoLanguage.includes("react")
                      ? monaco.languages.typescript.JsxEmit.React
                      : monaco.languages.typescript.JsxEmit.None,
                    reactNamespace: "React",
                    allowJs: true,
                    typeRoots: ["node_modules/@types"],
                    strict: true,
                    noImplicitAny: false,
                    strictNullChecks: false,
                    strictFunctionTypes: false,
                    noImplicitReturns: false,
                    noFallthroughCasesInSwitch: false,
                    noImplicitThis: false,
                    alwaysStrict: false,
                  },
                );

                // Add extra libraries for better IntelliSense (React, Node.js types)
                const extraLibs = [
                  {
                    content: `declare module 'react' { export = React; export as namespace React; }`,
                    filePath: "file:///node_modules/@types/react/index.d.ts",
                  },
                  {
                    content: `declare module 'react-dom' { export = ReactDOM; export as namespace ReactDOM; }`,
                    filePath:
                      "file:///node_modules/@types/react-dom/index.d.ts",
                  },
                ];
                extraLibs.forEach((lib) => {
                  monaco.languages.typescript.typescriptDefaults.addExtraLib(
                    lib.content,
                    lib.filePath,
                  );
                });

                // Set diagnostics options for better error checking
                monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
                  {
                    noSemanticValidation: false,
                    noSyntaxValidation: false,
                    noSuggestionDiagnostics: false,
                  },
                );
              }

              // Register Go-to-Definition provider for TS/JS
              languages.forEach((lang) => {
                monaco.languages.registerDefinitionProvider(lang, {
                  provideDefinition: (model: any, position: any) => {
                    const word = model.getWordAtPosition(position);
                    if (!word) return null;
                    const defs = findDefinitions(word.word);
                    if (defs.length > 0) {
                      // Show peek definition UI
                      setPeekSymbol(word.word);
                      setPeekLocations(defs);
                      setPeekVisible(true);
                    }
                    return null;
                  },
                });
              });

              // Breakpoint glyph margin click handler (left click = toggle, right click = conditional)
              editor.onMouseDown((e: any) => {
                if (
                  e.target?.type ===
                  monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
                ) {
                  const lineNumber = e.target.position?.lineNumber;
                  if (lineNumber) {
                    // Right-click for conditional breakpoint
                    if (e.event?.rightButton) {
                      e.event?.preventDefault?.();
                      const rect = editor.getDomNode()?.getBoundingClientRect();
                      setShowBreakpointInput({
                        line: lineNumber,
                        x: (rect?.left || 0) + 60,
                        y:
                          (rect?.top || 0) +
                          (lineNumber - editor.getScrollTop() / 20) * 20,
                      });
                      return;
                    }

                    setBreakpoints((prev) => {
                      const next = new Set(prev);
                      if (next.has(lineNumber)) {
                        next.delete(lineNumber);
                        // Also remove any conditional
                        setConditionalBreakpoints((cm) => {
                          const m = new Map(cm);
                          m.delete(lineNumber);
                          return m;
                        });
                      } else {
                        next.add(lineNumber);
                      }
                      // Update decorations with conditional indicators
                      const decorations = Array.from(next).map((ln) => {
                        const cond = conditionalBreakpoints.get(ln);
                        return {
                          range: new monaco.Range(ln, 1, ln, 1),
                          options: {
                            isWholeLine: true,
                            glyphMarginClassName: cond
                              ? "breakpoint-conditional-glyph"
                              : "breakpoint-glyph",
                            className: "breakpoint-line-highlight",
                            glyphMarginHoverMessage: {
                              value: cond
                                ? `Conditional breakpoint: ${cond}`
                                : `Breakpoint on line ${ln}`,
                            },
                          },
                        };
                      });
                      editor.createDecorationsCollection(decorations);
                      return next;
                    });
                  }
                }
              });

              // --- Emmet abbreviation support for HTML/JSX ---
              const emmetLanguages = [
                "html",
                "typescriptreact",
                "javascriptreact",
              ];
              emmetLanguages.forEach((lang) => {
                monaco.languages.registerCompletionItemProvider(lang, {
                  triggerCharacters: [">", ".", "#", "+", "^", "*", "!"],
                  provideCompletionItems: (model: any, position: any) => {
                    const lineContent = model.getLineContent(
                      position.lineNumber,
                    );
                    const textUntilPos = lineContent
                      .substring(0, position.column - 1)
                      .trim();
                    if (!textUntilPos) return { suggestions: [] };

                    // Simple Emmet abbreviations
                    const emmetExpansions: Record<string, string> = {
                      "!": '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  $0\n</body>\n</html>',
                      div: "<div>$0</div>",
                      span: "<span>$0</span>",
                      "ul>li": "<ul>\n  <li>$0</li>\n</ul>",
                      "ol>li": "<ol>\n  <li>$0</li>\n</ol>",
                      a: '<a href="$1">$0</a>',
                      img: '<img src="$1" alt="$0" />',
                      input: '<input type="$1" name="$0" />',
                      btn: '<button type="button">$0</button>',
                      form: '<form action="$1" method="$2">\n  $0\n</form>',
                      table:
                        "<table>\n  <thead>\n    <tr>\n      <th>$0</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td></td>\n    </tr>\n  </tbody>\n</table>",
                      "link:css": '<link rel="stylesheet" href="$0" />',
                      "script:src": '<script src="$0"></script>',
                    };

                    // Check for tag.class#id patterns
                    const tagMatch = textUntilPos.match(
                      /^(\w+)((?:\.\w+)*)(#\w+)?$/,
                    );
                    const suggestions: any[] = [];

                    if (tagMatch) {
                      const tag = tagMatch[1];
                      const classes = tagMatch[2]
                        ? tagMatch[2].split(".").filter(Boolean).join(" ")
                        : "";
                      const id = tagMatch[3] ? tagMatch[3].slice(1) : "";
                      let expanded = `<${tag}`;
                      if (id) expanded += ` id="${id}"`;
                      if (classes) expanded += ` className="${classes}"`;
                      expanded += `>$0</${tag}>`;
                      suggestions.push({
                        label: `Emmet: ${textUntilPos}`,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: expanded,
                        insertTextRules:
                          monaco.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                        range: new monaco.Range(
                          position.lineNumber,
                          position.column - textUntilPos.length,
                          position.lineNumber,
                          position.column,
                        ),
                        detail: "Emmet abbreviation",
                      });
                    }

                    // Direct expansions
                    if (emmetExpansions[textUntilPos]) {
                      suggestions.push({
                        label: `Emmet: ${textUntilPos}`,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: emmetExpansions[textUntilPos],
                        insertTextRules:
                          monaco.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                        range: new monaco.Range(
                          position.lineNumber,
                          position.column - textUntilPos.length,
                          position.lineNumber,
                          position.column,
                        ),
                        detail: "Emmet abbreviation",
                      });
                    }

                    return { suggestions };
                  },
                });
              });

              // --- Enhanced Word-based Completions ---
              languages.forEach((lang) => {
                monaco.languages.registerCompletionItemProvider(lang, {
                  triggerCharacters: [".", " "],
                  provideCompletionItems: (model: any, position: any) => {
                    const word = model.getWordUntilPosition(position);
                    const range = {
                      startLineNumber: position.lineNumber,
                      endLineNumber: position.lineNumber,
                      startColumn: word.startColumn,
                      endColumn: position.column,
                    };

                    const suggestions: any[] = [];

                    // Get words from current file
                    const currentFileWords = new Set<string>();
                    const lines = model.getValue().split("\n");
                    lines.forEach((line: string) => {
                      const words = line.match(/\b\w{3,}\b/g) || [];
                      words.forEach((w: string) => currentFileWords.add(w));
                    });

                    // Get words from workspace files
                    const fsState = useFileSystem.getState();
                    Object.values(fsState.fileMap).forEach((node: any) => {
                      if (node.type === "file" && node.content) {
                        const words = node.content.match(/\b\w{3,}\b/g) || [];
                        words.forEach((w: string) => currentFileWords.add(w));
                      }
                    });

                    // Filter and sort suggestions
                    const filteredWords = Array.from(currentFileWords)
                      .filter(
                        (w) =>
                          w.toLowerCase().startsWith(word.word.toLowerCase()) &&
                          w !== word.word,
                      )
                      .sort((a, b) => {
                        // Prioritize exact case matches
                        if (a.startsWith(word.word)) return -1;
                        if (b.startsWith(word.word)) return 1;
                        return a.localeCompare(b);
                      })
                      .slice(0, 20); // Limit to 20 suggestions

                    filteredWords.forEach((word) => {
                      suggestions.push({
                        label: word,
                        kind: monaco.languages.CompletionItemKind.Text,
                        insertText: word,
                        range: range,
                        detail: "Word from workspace",
                      });
                    });

                    return { suggestions };
                  },
                });
              });

              // --- Import Suggestions for TypeScript/JavaScript ---
              const importLanguages = [
                "typescript",
                "typescriptreact",
                "javascript",
                "javascriptreact",
              ];
              importLanguages.forEach((lang) => {
                monaco.languages.registerCompletionItemProvider(lang, {
                  triggerCharacters: ['"', "'"],
                  provideCompletionItems: (model: any, position: any) => {
                    const lineContent = model.getLineContent(
                      position.lineNumber,
                    );
                    const beforeCursor = lineContent.substring(
                      0,
                      position.column - 1,
                    );

                    // Check if we're in an import statement
                    if (!/\b(import|from|require)\b/.test(beforeCursor)) {
                      return { suggestions: [] };
                    }

                    const suggestions: any[] = [];
                    const fsState = useFileSystem.getState();

                    // Get all TypeScript/JavaScript files in workspace
                    Object.values(fsState.fileMap).forEach((node: any) => {
                      if (node.type === "file" && node.path) {
                        const ext = node.path.split(".").pop()?.toLowerCase();
                        if (["ts", "tsx", "js", "jsx"].includes(ext || "")) {
                          const relativePath = node.path.startsWith("/")
                            ? node.path.slice(1)
                            : node.path;
                          const importPath = relativePath.replace(
                            /\.(ts|tsx|js|jsx)$/,
                            "",
                          );

                          // Check if file has default export or named exports
                          if (node.content) {
                            const hasDefaultExport =
                              /\bexport\s+default\b/.test(node.content);
                            const namedExports = [
                              ...node.content.matchAll(
                                /\bexport\s+(?:const|let|var|function|class)\s+(\w+)/g,
                              ),
                            ].map((match) => match[1]);

                            if (hasDefaultExport) {
                              suggestions.push({
                                label: importPath,
                                kind: monaco.languages.CompletionItemKind
                                  .Module,
                                insertText: importPath,
                                detail: `Import from ${relativePath}`,
                              });
                            }

                            namedExports.forEach((exportName) => {
                              suggestions.push({
                                label: `{ ${exportName} }`,
                                kind: monaco.languages.CompletionItemKind
                                  .Module,
                                insertText: `{ ${exportName} }`,
                                detail: `Import ${exportName} from ${relativePath}`,
                              });
                            });
                          }
                        }
                      }
                    });

                    return { suggestions };
                  },
                });
              });

              // --- Method/Property Completions for Common Patterns ---
              const methodLanguages = [
                "typescript",
                "typescriptreact",
                "javascript",
                "javascriptreact",
              ];
              methodLanguages.forEach((lang) => {
                monaco.languages.registerCompletionItemProvider(lang, {
                  triggerCharacters: ["."],
                  provideCompletionItems: (model: any, position: any) => {
                    const lineContent = model.getLineContent(
                      position.lineNumber,
                    );
                    const beforeCursor = lineContent.substring(
                      0,
                      position.column - 1,
                    );

                    // Common method completions based on context
                    const suggestions: any[] = [];

                    // Array methods
                    if (/\w+\.\w*$/.test(beforeCursor)) {
                      const arrayMethods = [
                        {
                          name: "map",
                          snippet: "map(${1:item} => ${2:item})",
                          detail: "(item) => any",
                        },
                        {
                          name: "filter",
                          snippet: "filter(${1:item} => ${2:true})",
                          detail: "(item) => boolean",
                        },
                        {
                          name: "forEach",
                          snippet: "forEach(${1:item} => ${2:void})",
                          detail: "(item) => void",
                        },
                        {
                          name: "find",
                          snippet: "find(${1:item} => ${2:item})",
                          detail: "(item) => boolean",
                        },
                        {
                          name: "reduce",
                          snippet:
                            "reduce((${1:acc}, ${2:item}) => ${3:acc}, ${4:initial})",
                          detail: "(acc, item) => acc",
                        },
                        {
                          name: "some",
                          snippet: "some(${1:item} => ${2:true})",
                          detail: "(item) => boolean",
                        },
                        {
                          name: "every",
                          snippet: "every(${1:item} => ${2:true})",
                          detail: "(item) => boolean",
                        },
                        {
                          name: "includes",
                          snippet: "includes(${1:value})",
                          detail: "(value) => boolean",
                        },
                        {
                          name: "indexOf",
                          snippet: "indexOf(${1:value})",
                          detail: "(value) => number",
                        },
                        { name: "length", snippet: "length", detail: "number" },
                      ];

                      arrayMethods.forEach((method) => {
                        suggestions.push({
                          label: method.name,
                          kind: monaco.languages.CompletionItemKind.Method,
                          insertText: method.snippet,
                          insertTextRules:
                            monaco.languages.CompletionItemInsertTextRule
                              .InsertAsSnippet,
                          detail: method.detail,
                        });
                      });
                    }

                    // String methods
                    if (/\w+\.\w*$/.test(beforeCursor)) {
                      const stringMethods = [
                        {
                          name: "toLowerCase",
                          snippet: "toLowerCase()",
                          detail: "() => string",
                        },
                        {
                          name: "toUpperCase",
                          snippet: "toUpperCase()",
                          detail: "() => string",
                        },
                        {
                          name: "trim",
                          snippet: "trim()",
                          detail: "() => string",
                        },
                        {
                          name: "split",
                          snippet: "split(${1:separator})",
                          detail: "(separator) => string[]",
                        },
                        {
                          name: "replace",
                          snippet: "replace(${1:search}, ${2:replace})",
                          detail: "(search, replace) => string",
                        },
                        {
                          name: "includes",
                          snippet: "includes(${1:search})",
                          detail: "(search) => boolean",
                        },
                        {
                          name: "startsWith",
                          snippet: "startsWith(${1:search})",
                          detail: "(search) => boolean",
                        },
                        {
                          name: "endsWith",
                          snippet: "endsWith(${1:search})",
                          detail: "(search) => boolean",
                        },
                        { name: "length", snippet: "length", detail: "number" },
                      ];

                      stringMethods.forEach((method) => {
                        suggestions.push({
                          label: method.name,
                          kind: monaco.languages.CompletionItemKind.Method,
                          insertText: method.snippet,
                          insertTextRules:
                            monaco.languages.CompletionItemInsertTextRule
                              .InsertAsSnippet,
                          detail: method.detail,
                        });
                      });
                    }

                    return { suggestions };
                  },
                });
              });

              // --- AI Inline Completions Provider (Ghost Text) ---
              const aiLanguages = [
                "typescript",
                "typescriptreact",
                "javascript",
                "javascriptreact",
                "python",
                "html",
                "css",
              ];
              if (aiLanguages.includes(monacoLanguage)) {
                const disposable =
                  monaco.languages.registerInlineCompletionsProvider(
                    monacoLanguage,
                    {
                      provideInlineCompletions: async (
                        model: any,
                        position: any,
                        context: any,
                        token: any,
                      ) => {
                        // Only trigger after typing pauses (debounce in the provider itself)
                        const lineContent = model.getLineContent(
                          position.lineNumber,
                        );
                        const textBeforeCursor = model.getValueInRange({
                          startLineNumber: Math.max(
                            1,
                            position.lineNumber - 10,
                          ),
                          startColumn: 1,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column,
                        });

                        // Don't trigger on empty lines or very short context
                        if (textBeforeCursor.trim().length < 10)
                          return { items: [] };

                        try {
                          const resp = await fetch(
                            "/api/code-chamber/complete",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                prefix: textBeforeCursor,
                                language: monacoLanguage,
                                filename: activeFile,
                              }),
                              signal: token.onCancellationRequested
                                ? AbortSignal.timeout(3000)
                                : undefined,
                            },
                          );
                          if (!resp.ok) return { items: [] };
                          const data = await resp.json();
                          if (
                            !data.completion ||
                            data.completion.trim().length === 0
                          )
                            return { items: [] };

                          return {
                            items: [
                              {
                                insertText: data.completion,
                                range: {
                                  startLineNumber: position.lineNumber,
                                  startColumn: position.column,
                                  endLineNumber: position.lineNumber,
                                  endColumn: position.column,
                                },
                                command: {
                                  id: "editor.action.inlineSuggest.commit",
                                  title: "Accept AI Suggestion",
                                },
                              },
                            ],
                          };
                        } catch {
                          return { items: [] };
                        }
                      },
                      disposeInlineCompletions: () => {
                        // Cleanup if needed
                      },
                    },
                  );

                // Store disposable for cleanup
                editor.onDidDispose(() => disposable.dispose());
              }

              // --- Cursor position tracking for status bar ---
              const updateCursorPos = () => {
                const pos = editor.getPosition();
                if (pos) setCursorPosition(pos.lineNumber, pos.column);
              };
              editor.onDidChangeCursorPosition(updateCursorPos);
              updateCursorPos();

              // --- Update language in status bar ---
              const model = editor.getModel();
              if (model) {
                const langId = model.getLanguageId();
                const langMap: Record<string, string> = {
                  typescript: "TypeScript",
                  typescriptreact: "TypeScript React",
                  javascript: "JavaScript",
                  javascriptreact: "JavaScript React",
                  json: "JSON",
                  html: "HTML",
                  css: "CSS",
                  scss: "SCSS",
                  markdown: "Markdown",
                  python: "Python",
                  go: "Go",
                  rust: "Rust",
                  yaml: "YAML",
                  plaintext: "Plain Text",
                };
                setEditorLanguage(langMap[langId] || langId);

                // Detect indentation
                const opts = model.getOptions();
                const indent = opts.insertSpaces
                  ? `Spaces: ${opts.tabSize}`
                  : `Tab Size: ${opts.tabSize}`;
                setEditorIndentation(indent);

                // Detect EOL
                const eolSeq = model.getEOL();
                setEditorEOL(eolSeq === "\r\n" ? "CRLF" : "LF");
              }

              // --- Hover provider (type info / docs preview) ---
              languages.forEach((lang) => {
                monaco.languages.registerHoverProvider(lang, {
                  provideHover: (model: any, position: any) => {
                    const word = model.getWordAtPosition(position);
                    if (!word) return null;
                    // Search workspace for JSDoc / type annotations
                    const defs = findDefinitions(word.word);
                    if (defs.length > 0) {
                      const preview = defs[0].preview
                        .split("\n")
                        .slice(0, 5)
                        .join("\n");
                      return {
                        range: new monaco.Range(
                          position.lineNumber,
                          word.startColumn,
                          position.lineNumber,
                          word.endColumn,
                        ),
                        contents: [
                          { value: `**${word.word}**` },
                          { value: "```typescript\n" + preview + "\n```" },
                          {
                            value: `*Defined in ${defs[0].filePath}:${defs[0].lineNumber}*`,
                          },
                        ],
                      };
                    }
                    return null;
                  },
                });

                // --- Find All References provider ---
                monaco.languages.registerReferenceProvider(lang, {
                  provideReferences: (model: any, position: any) => {
                    const word = model.getWordAtPosition(position);
                    if (!word) return [];
                    const refs: any[] = [];
                    for (const [, node] of Object.entries(fileMap)) {
                      const fileNode = node as any;
                      if (fileNode.type !== "file" || !fileNode.content)
                        continue;
                      const filePath = fileNode.path || fileNode.name;
                      const lines = fileNode.content.split("\n");
                      lines.forEach((lineText: string, idx: number) => {
                        const regex = new RegExp(`\\b${word.word}\\b`, "g");
                        let match;
                        while ((match = regex.exec(lineText)) !== null) {
                          refs.push({
                            uri: monaco.Uri.parse(`file:///${filePath}`),
                            range: new monaco.Range(
                              idx + 1,
                              match.index + 1,
                              idx + 1,
                              match.index + 1 + word.word.length,
                            ),
                          });
                        }
                      });
                    }
                    return refs;
                  },
                });

                // --- Rename provider (F2) - workspace-wide ---
                monaco.languages.registerRenameProvider(lang, {
                  provideRenameEdits: (
                    model: any,
                    position: any,
                    newName: string,
                  ) => {
                    const word = model.getWordAtPosition(position);
                    if (!word) return { edits: [] };
                    const edits: any[] = [];
                    // Rename in current model
                    const text = model.getValue();
                    const lines = text.split("\n");
                    lines.forEach((lineText: string, idx: number) => {
                      const regex = new RegExp(`\\b${word.word}\\b`, "g");
                      let match;
                      while ((match = regex.exec(lineText)) !== null) {
                        edits.push({
                          resource: model.uri,
                          textEdit: {
                            range: new monaco.Range(
                              idx + 1,
                              match.index + 1,
                              idx + 1,
                              match.index + 1 + word.word.length,
                            ),
                            text: newName,
                          },
                        });
                      }
                    });
                    // Also rename across all other workspace files
                    const fsState = useFileSystem.getState();
                    const allNodes = Object.values(fsState.fileMap);
                    allNodes.forEach((node: any) => {
                      if (node.type !== "file" || !node.content) return;
                      const nodeUri = monaco.Uri.parse(`file:///${node.path}`);
                      if (nodeUri.toString() === model.uri.toString()) return; // skip current
                      const fLines = node.content.split("\n");
                      fLines.forEach((fLine: string, fIdx: number) => {
                        const regex = new RegExp(`\\b${word.word}\\b`, "g");
                        let match;
                        while ((match = regex.exec(fLine)) !== null) {
                          edits.push({
                            resource: nodeUri,
                            textEdit: {
                              range: new monaco.Range(
                                fIdx + 1,
                                match.index + 1,
                                fIdx + 1,
                                match.index + 1 + word.word.length,
                              ),
                              text: newName,
                            },
                          });
                        }
                      });
                      // Apply edits to file system store immediately for non-open files
                      if (
                        edits.some(
                          (e: any) =>
                            e.resource.toString() === nodeUri.toString(),
                        )
                      ) {
                        const newContent = node.content.replace(
                          new RegExp(`\\b${word.word}\\b`, "g"),
                          newName,
                        );
                        fsState.writeFile(node.id, newContent);
                      }
                    });
                    return { edits };
                  },
                  resolveRenameLocation: (model: any, position: any) => {
                    const word = model.getWordAtPosition(position);
                    if (!word)
                      return {
                        text: "",
                        range: new monaco.Range(1, 1, 1, 1),
                        rejectReason: "Cannot rename this element",
                      };
                    return {
                      text: word.word,
                      range: new monaco.Range(
                        position.lineNumber,
                        word.startColumn,
                        position.lineNumber,
                        word.endColumn,
                      ),
                    };
                  },
                });

                // --- Code Actions / Quick Fix provider ---
                monaco.languages.registerCodeActionProvider(lang, {
                  provideCodeActions: (
                    model: any,
                    range: any,
                    context: any,
                  ) => {
                    const actions: any[] = [];
                    const lineText = model.getLineContent(
                      range.startLineNumber,
                    );

                    // Quick fix: convert var to const/let
                    if (/\bvar\s/.test(lineText)) {
                      actions.push({
                        title: "Convert var to const",
                        kind: "quickfix",
                        edit: {
                          edits: [
                            {
                              resource: model.uri,
                              textEdit: {
                                range: new monaco.Range(
                                  range.startLineNumber,
                                  lineText.indexOf("var") + 1,
                                  range.startLineNumber,
                                  lineText.indexOf("var") + 4,
                                ),
                                text: "const",
                              },
                            },
                          ],
                        },
                      });
                      actions.push({
                        title: "Convert var to let",
                        kind: "quickfix",
                        edit: {
                          edits: [
                            {
                              resource: model.uri,
                              textEdit: {
                                range: new monaco.Range(
                                  range.startLineNumber,
                                  lineText.indexOf("var") + 1,
                                  range.startLineNumber,
                                  lineText.indexOf("var") + 4,
                                ),
                                text: "let",
                              },
                            },
                          ],
                        },
                      });
                    }

                    // Extract to function
                    const selectedText = model.getValueInRange(range);
                    if (selectedText && selectedText.length > 10) {
                      actions.push({
                        title: "Extract to function",
                        kind: "refactor.extract",
                        command: {
                          id: "editor.action.codeAction",
                          title: "Extract to function",
                        },
                      });
                    }

                    // Add missing import suggestion
                    if (context.markers && context.markers.length > 0) {
                      context.markers.forEach((marker: any) => {
                        if (marker.message?.includes("Cannot find name")) {
                          const match = marker.message.match(/'(\w+)'/);
                          if (match) {
                            actions.push({
                              title: `Add import for '${match[1]}'`,
                              kind: "quickfix",
                              edit: {
                                edits: [
                                  {
                                    resource: model.uri,
                                    textEdit: {
                                      range: new monaco.Range(1, 1, 1, 1),
                                      text: `import { ${match[1]} } from './${match[1]}'\n`,
                                    },
                                  },
                                ],
                              },
                            });
                          }
                        }
                      });
                    }

                    return { actions, dispose: () => { } };
                  },
                });

                // --- Document Highlight provider (highlight all occurrences of word under cursor) ---
                monaco.languages.registerDocumentHighlightProvider(lang, {
                  provideDocumentHighlights: (model: any, position: any) => {
                    const word = model.getWordAtPosition(position);
                    if (!word) return [];
                    const highlights: any[] = [];
                    const text = model.getValue();
                    const lines = text.split("\n");
                    const regex = new RegExp(`\\b${word.word}\\b`, "g");
                    lines.forEach((lineText: string, idx: number) => {
                      let match;
                      while ((match = regex.exec(lineText)) !== null) {
                        highlights.push({
                          range: new monaco.Range(
                            idx + 1,
                            match.index + 1,
                            idx + 1,
                            match.index + 1 + word.word.length,
                          ),
                          kind: monaco.languages.DocumentHighlightKind.Read,
                        });
                      }
                    });
                    return highlights;
                  },
                });

                // --- Signature Help provider (function parameter hints) ---
                monaco.languages.registerSignatureHelpProvider(lang, {
                  signatureHelpTriggerCharacters: ["(", ","],
                  provideSignatureHelp: (model: any, position: any) => {
                    const textUntilPosition = model.getValueInRange({
                      startLineNumber: position.lineNumber,
                      startColumn: 1,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column,
                    });
                    // Match function call pattern: funcName(args...
                    const funcMatch =
                      textUntilPosition.match(/(\w+)\(([^)]*)$/);
                    if (!funcMatch) return null;
                    const funcName = funcMatch[1];
                    const argsText = funcMatch[2];
                    const activeParam = (argsText.match(/,/g) || []).length;

                    // Search for function definition to extract signature
                    const defs = findDefinitions(funcName);
                    if (defs.length === 0) return null;
                    const defLine = defs[0].preview.split("\n")[0];
                    const paramMatch = defLine.match(/\(([^)]*)\)/);
                    if (!paramMatch) return null;
                    const params = paramMatch[1]
                      .split(",")
                      .map((p: string) => p.trim())
                      .filter(Boolean);

                    return {
                      value: {
                        signatures: [
                          {
                            label: `${funcName}(${paramMatch[1]})`,
                            parameters: params.map((p: string) => ({
                              label: p,
                            })),
                          },
                        ],
                        activeSignature: 0,
                        activeParameter: Math.min(
                          activeParam,
                          params.length - 1,
                        ),
                      },
                      dispose: () => { },
                    };
                  },
                });

                // --- Inlay Hints provider (type annotations inline) ---
                monaco.languages.registerInlayHintsProvider(lang, {
                  provideInlayHints: (model: any) => {
                    const hints: any[] = [];
                    const lineCount = model.getLineCount();
                    for (let i = 1; i <= Math.min(lineCount, 500); i++) {
                      const lineText = model.getLineContent(i);
                      // Show return type hints for arrow functions without explicit type
                      const arrowMatch = lineText.match(
                        /^(\s*)(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
                      );
                      if (
                        (arrowMatch && !lineText.includes(":")) ||
                        (arrowMatch &&
                          lineText.indexOf(":") > lineText.indexOf("=>"))
                      ) {
                        if (arrowMatch) {
                          hints.push({
                            kind: monaco.languages.InlayHintKind.Type,
                            position: {
                              lineNumber: i,
                              column: lineText.indexOf("=>") + 1,
                            },
                            label: ": void",
                            paddingLeft: true,
                          });
                        }
                      }
                      // Show inferred type for simple const declarations
                      const constMatch = lineText.match(
                        /^(\s*)(?:const|let)\s+(\w+)\s*=\s*(["'`]\w+["'`]|true|false|\d+(?:\.\d+)?)\s*;?\s*$/,
                      );
                      if (constMatch) {
                        const value = constMatch[3];
                        let inferredType = "unknown";
                        if (/^["'`]/.test(value)) inferredType = "string";
                        else if (value === "true" || value === "false")
                          inferredType = "boolean";
                        else if (/^\d/.test(value))
                          inferredType = value.includes(".")
                            ? "number"
                            : "number";
                        hints.push({
                          kind: monaco.languages.InlayHintKind.Type,
                          position: {
                            lineNumber: i,
                            column:
                              lineText.indexOf(constMatch[2]) +
                              constMatch[2].length +
                              1,
                          },
                          label: `: ${inferredType}`,
                          paddingLeft: false,
                        });
                      }
                    }
                    return { hints, dispose: () => { } };
                  },
                });
              });
            }}
            options={{
              glyphMargin: true,
              minimap: {
                enabled: editorSettings.minimap,
                scale: 1,
                showSlider: "mouseover",
                renderCharacters: false,
              },
              fontSize: editorSettings.fontSize,
              lineHeight: 20,
              lineNumbers: editorSettings.lineNumbers,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: editorSettings.tabSize,
              wordWrap: editorSettings.wordWrap,
              formatOnPaste: editorSettings.formatOnPaste ?? true,
              formatOnType: true,
              padding: { top: 12, bottom: 12 },
              fontFamily: editorSettings.fontFamily,
              fontLigatures: editorSettings.fontLigatures,
              cursorBlinking: editorSettings.cursorBlinking,
              cursorSmoothCaretAnimation: "on",
              smoothScrolling: true,
              renderLineHighlight: "all",
              renderLineHighlightOnlyWhenFocus: false,
              renderWhitespace: editorSettings.renderWhitespace,
              bracketPairColorization: {
                enabled: editorSettings.bracketPairColorization,
              },
              guides: {
                bracketPairs: true,
                indentation: true,
                highlightActiveIndentation: true,
              },
              stickyScroll: { enabled: editorSettings.stickyScroll },
              suggest: {
                preview: true,
                showMethods: true,
                showFunctions: true,
                showStatusBar: true,
              },
              inlineSuggest: { enabled: true },
              parameterHints: { enabled: true },
              folding: true,
              foldingStrategy: "indentation",
              showFoldingControls: "mouseover",
              overviewRulerLanes: 3,
              colorDecorators: true,
              contextmenu: true,
              mouseWheelZoom: true,
              linkedEditing: true,
              occurrencesHighlight: "singleFile",
              selectionHighlight: true,
              codeLens: true,
            }}
          />
        </MonacoErrorBoundary>
      </div>

      {/* Peek Definition Overlay */}
      <PeekDefinition
        visible={peekVisible}
        onClose={() => setPeekVisible(false)}
        onGoToDefinition={(filePath, line) => {
          onFileSelect(filePath);
          setPeekVisible(false);
          // Navigate to line after file opens
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.revealLineInCenter(line);
              editorRef.current.setPosition({ lineNumber: line, column: 1 });
            }
          }, 300);
        }}
        symbol={peekSymbol}
        locations={peekLocations}
      />

      {/* Conditional Breakpoint Input */}
      {showBreakpointInput && (
        <div
          className="fixed z-50"
          style={{ left: showBreakpointInput.x, top: showBreakpointInput.y }}
        >
          <div className="bg-popover border border-border rounded-md shadow-xl p-2 w-[280px]">
            <div className="text-xs text-muted-foreground mb-1">
              Conditional Breakpoint (Line {showBreakpointInput.line})
            </div>
            <input
              autoFocus
              placeholder="e.g. count > 10"
              className="w-full bg-muted/50 border border-border rounded px-2 py-1 text-sm outline-none focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const condition = (e.target as HTMLInputElement).value;
                  if (condition.trim()) {
                    setConditionalBreakpoints((prev) => {
                      const m = new Map(prev);
                      m.set(showBreakpointInput.line, condition);
                      return m;
                    });
                    setBreakpoints((prev) => {
                      const next = new Set(prev);
                      next.add(showBreakpointInput.line);
                      return next;
                    });
                  }
                  setShowBreakpointInput(null);
                }
                if (e.key === "Escape") setShowBreakpointInput(null);
              }}
              onBlur={() => setShowBreakpointInput(null)}
            />
            <div className="text-[10px] text-muted-foreground mt-1">
              Enter expression; breakpoint pauses when truthy
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

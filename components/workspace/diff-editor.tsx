"use client"

import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Copy,
  RotateCcw,
  Check,
  GitBranch,
  FileCode,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { useWorkbench } from "@/lib/stores/workbench-store"
import { getLanguageByExtension } from "@/lib/languages"

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => {
    // MonacoEditor exports DiffEditor as a named export
    return { default: mod.DiffEditor }
  }),
  { ssr: false }
)

interface DiffEditorViewProps {
  projectId?: string
  originalFile?: string
  modifiedFile?: string
  originalContent?: string
  modifiedContent?: string
  language?: string
}

interface DiffStats {
  additions: number
  deletions: number
  changes: number
}

function computeDiffStats(original: string, modified: string): DiffStats {
  const origLines = original.split("\n")
  const modLines = modified.split("\n")
  const origSet = new Set(origLines.map((l) => l.trim()))
  const modSet = new Set(modLines.map((l) => l.trim()))

  let additions = 0
  let deletions = 0
  for (const line of modLines) {
    if (!origSet.has(line.trim()) && line.trim()) additions++
  }
  for (const line of origLines) {
    if (!modSet.has(line.trim()) && line.trim()) deletions++
  }

  return { additions, deletions, changes: additions + deletions }
}

export function DiffEditorView({
  projectId = "default",
  originalFile = "counter.tsx (HEAD)",
  modifiedFile = "counter.tsx (Working)",
  originalContent,
  modifiedContent,
  language,
}: DiffEditorViewProps) {
  const { closeDiffEditor } = useWorkbench()
  const [viewMode, setViewMode] = useState<"inline" | "side-by-side">("side-by-side")
  const [wordWrap, setWordWrap] = useState(false)
  const [showUnchanged, setShowUnchanged] = useState(true)
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [showBlame, setShowBlame] = useState(false)
  const [activeChangeIndex, setActiveChangeIndex] = useState(0)
  const [changeCount, setChangeCount] = useState(0)
  const diffEditorRef = useRef<any>(null)

  const original = originalContent ?? `// No original diff content available for ${originalFile}.`
  const modified = modifiedContent ?? `// No modified diff content available for ${modifiedFile}.`

  const canPersistModifiedFile = useMemo(
    () => Boolean(modifiedFile && !modifiedFile.startsWith('HEAD:') && !/\s\((?:HEAD|Working)\)$/.test(modifiedFile)),
    [modifiedFile]
  )

  const resolvedLanguage = useMemo(() => {
    if (language) return language
    const candidateFile = modifiedFile || originalFile
    const extension = candidateFile?.split('/').pop()?.split('.').pop()
    if (extension) {
      return getLanguageByExtension(`.${extension}`)?.monaco || "typescript"
    }
    return "typescript"
  }, [language, modifiedFile, originalFile])

  const stats = useMemo(() => computeDiffStats(original, modified), [original, modified])

  const getLineChanges = useCallback(() => diffEditorRef.current?.getLineChanges?.() || [], [])

  const focusChange = useCallback((change: any) => {
    const modifiedEditor = diffEditorRef.current?.getModifiedEditor?.()
    if (!modifiedEditor || !change) return
    const targetLine = change.modifiedStartLineNumber || change.modifiedEndLineNumber || 1
    modifiedEditor.revealLineInCenter(targetLine)
    modifiedEditor.setPosition({ lineNumber: targetLine, column: 1 })
    modifiedEditor.focus()
  }, [])

  const refreshLineChanges = useCallback(() => {
    const changes = getLineChanges()
    setChangeCount(changes.length)
    setActiveChangeIndex((prev) => {
      if (changes.length === 0) return 0
      return Math.min(prev, changes.length - 1)
    })
    return changes
  }, [getLineChanges])

  const persistModifiedEditor = useCallback(async () => {
    if (!canPersistModifiedFile || !modifiedFile) return

    const modifiedEditor = diffEditorRef.current?.getModifiedEditor?.()
    const content = modifiedEditor?.getValue?.()
    if (typeof content !== 'string') return

    try {
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: modifiedFile, content }),
      })

      window.dispatchEvent(new CustomEvent('azora:file-saved', {
        detail: { path: modifiedFile, content },
      }))
    } catch {
      // Ignore persistence failures and keep the editor interactive.
    }
  }, [canPersistModifiedFile, modifiedFile])

  // Accept all changes: copy modified into original
  const handleAccept = useCallback(async () => {
    if (diffEditorRef.current) {
      const modifiedEditor = diffEditorRef.current.getModifiedEditor()
      const originalEditor = diffEditorRef.current.getOriginalEditor()
      if (modifiedEditor && originalEditor) {
        originalEditor.setValue(modifiedEditor.getValue())
      }
    }
    refreshLineChanges()
    await persistModifiedEditor()
  }, [persistModifiedEditor, refreshLineChanges])

  // Revert all changes: copy original into modified
  const handleRevert = useCallback(async () => {
    if (diffEditorRef.current) {
      const modifiedEditor = diffEditorRef.current.getModifiedEditor()
      const originalEditor = diffEditorRef.current.getOriginalEditor()
      if (modifiedEditor && originalEditor) {
        modifiedEditor.setValue(originalEditor.getValue())
      }
    }
    refreshLineChanges()
    await persistModifiedEditor()
  }, [persistModifiedEditor, refreshLineChanges])

  // Accept individual hunk
  const handleAcceptHunk = useCallback(async (hunkIndex: number) => {
    if (diffEditorRef.current) {
      const lineChanges = diffEditorRef.current.getLineChanges()
      if (lineChanges && lineChanges[hunkIndex]) {
        const change = lineChanges[hunkIndex]
        const modifiedEditor = diffEditorRef.current.getModifiedEditor()
        const originalEditor = diffEditorRef.current.getOriginalEditor()

        if (modifiedEditor && originalEditor) {
          const modifiedLines = modifiedEditor.getValue().split('\n')
          const originalLines = originalEditor.getValue().split('\n')

          // Replace the original lines with modified lines for this hunk
          const startLine = change.originalStartLineNumber - 1
          const endLine = change.originalEndLineNumber
          const modifiedStartLine = change.modifiedStartLineNumber - 1
          const modifiedEndLine = change.modifiedEndLineNumber

          const newOriginalLines = [
            ...originalLines.slice(0, startLine),
            ...modifiedLines.slice(modifiedStartLine, modifiedEndLine),
            ...originalLines.slice(endLine)
          ]

          originalEditor.setValue(newOriginalLines.join('\n'))
        }
      }
    }
    refreshLineChanges()
    await persistModifiedEditor()
  }, [persistModifiedEditor, refreshLineChanges])

  // Revert individual hunk
  const handleRevertHunk = useCallback(async (hunkIndex: number) => {
    if (diffEditorRef.current) {
      const lineChanges = diffEditorRef.current.getLineChanges()
      if (lineChanges && lineChanges[hunkIndex]) {
        const change = lineChanges[hunkIndex]
        const modifiedEditor = diffEditorRef.current.getModifiedEditor()
        const originalEditor = diffEditorRef.current.getOriginalEditor()

        if (modifiedEditor && originalEditor) {
          const modifiedLines = modifiedEditor.getValue().split('\n')
          const originalLines = originalEditor.getValue().split('\n')

          // Replace the modified lines with original lines for this hunk
          const startLine = change.modifiedStartLineNumber - 1
          const endLine = change.modifiedEndLineNumber
          const originalStartLine = change.originalStartLineNumber - 1
          const originalEndLine = change.originalEndLineNumber

          const newModifiedLines = [
            ...modifiedLines.slice(0, startLine),
            ...originalLines.slice(originalStartLine, originalEndLine),
            ...modifiedLines.slice(endLine)
          ]

          modifiedEditor.setValue(newModifiedLines.join('\n'))
        }
      }
    }
    refreshLineChanges()
    await persistModifiedEditor()
  }, [persistModifiedEditor, refreshLineChanges])

  // Navigate to previous/next change
  const navigateChange = useCallback((direction: 'prev' | 'next') => {
    const changes = refreshLineChanges()
    if (!changes.length) return

    setActiveChangeIndex((prev) => {
      const nextIndex = direction === 'next'
        ? Math.min(prev + 1, changes.length - 1)
        : Math.max(prev - 1, 0)
      focusChange(changes[nextIndex])
      return nextIndex
    })
  }, [focusChange, refreshLineChanges])

  // Keyboard shortcuts (F7 = next diff, Shift+F7 = prev diff)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F7') {
        e.preventDefault()
        if (e.shiftKey) {
          navigateChange('prev')
        } else {
          navigateChange('next')
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigateChange])

  useEffect(() => {
    setActiveChangeIndex(0)
    setChangeCount(0)
  }, [original, modified])

  // Blame annotations effect
  useEffect(() => {
    if (!diffEditorRef.current || !showBlame) return

    const modifiedEditor = diffEditorRef.current.getModifiedEditor()
    const originalEditor = diffEditorRef.current.getOriginalEditor()

    if (!modifiedEditor || !originalEditor) return

    // Fetch real blame data from API, fall back to "not available" if endpoint missing
    const applyBlameDecorations = async (editor: any, file: string | undefined) => {
      const lines = editor.getValue().split('\n')
      let blameData: string[] | null = null

      if (file) {
        try {
          const resp = await fetch(`/api/projects/${projectId}/git/blame?file=${encodeURIComponent(file)}`)
          if (resp.ok) {
            const data = await resp.json()
            blameData = data.blame || null
          }
        } catch { /* API unavailable */ }
      }

      const decorations = lines.map((_: string, idx: number) => {
        const annotation = blameData?.[idx] || 'blame unavailable'
        return {
          range: { startLineNumber: idx + 1, startColumn: 1, endLineNumber: idx + 1, endColumn: 1 },
          options: {
            after: {
              content: ` // ${annotation}`,
              inlineClassName: 'blame-annotation',
            },
          },
        }
      })

      return editor.createDecorationsCollection(decorations)
    }

    let cancelled = false
    const setup = async () => {
      if (cancelled) return
      const origDec = await applyBlameDecorations(originalEditor, originalFile)
      if (cancelled) { origDec.clear(); return }
      const modDec = await applyBlameDecorations(modifiedEditor, modifiedFile)
      if (cancelled) { modDec.clear(); origDec.clear(); return }
      // Store cleanup refs
      ;(cleanup as any).origDec = origDec
      ;(cleanup as any).modDec = modDec
    }
    const cleanup: any = () => {
      cancelled = true
      if (cleanup.origDec) cleanup.origDec.clear()
      if (cleanup.modDec) cleanup.modDec.clear()
    }
    setup()

    return cleanup
  }, [modified, modifiedFile, original, originalFile, projectId, showBlame])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-muted/10">
        <div className="flex items-center gap-3">
          {/* File labels */}
          <div className="flex items-center gap-1.5 text-[12px]">
            <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{originalFile}</span>
            <ArrowLeftRight className="w-3 h-3 text-muted-foreground/50 mx-1" />
            <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground font-medium">{modifiedFile}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] gap-1 border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
            >
              +{stats.additions}
            </Badge>
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] gap-1 border-red-500/30 text-red-400 bg-red-500/10"
            >
              -{stats.deletions}
            </Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-[11px]",
              viewMode === "inline" && "bg-primary/15 text-primary"
            )}
            onClick={() => setViewMode("inline")}
          >
            Inline
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-[11px]",
              viewMode === "side-by-side" && "bg-primary/15 text-primary"
            )}
            onClick={() => setViewMode("side-by-side")}
          >
            Side by Side
          </Button>

          <div className="w-px h-4 bg-border/40 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 px-2 text-[11px]", ignoreWhitespace && "bg-primary/15 text-primary")}
            onClick={() => setIgnoreWhitespace(!ignoreWhitespace)}
            title="Toggle whitespace changes"
          >
            Whitespace
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 px-2 text-[11px]", showBlame && "bg-primary/15 text-primary")}
            onClick={() => setShowBlame(!showBlame)}
            title="Toggle blame annotations"
          >
            Blame
          </Button>

          <div className="w-px h-4 bg-border/40 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 px-2 text-[11px]", wordWrap && "bg-primary/15 text-primary")}
            onClick={() => setWordWrap(!wordWrap)}
          >
            Wrap
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 px-2 text-[11px]", !showUnchanged && "bg-primary/15 text-primary")}
            onClick={() => setShowUnchanged(!showUnchanged)}
            title="Toggle unchanged region folding"
          >
            {showUnchanged ? 'Show All' : 'Focus Changes'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            title="Accept all changes"
            onClick={handleAccept}
          >
            <Check className="w-3 h-3 mr-1" />
            Accept
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            title="Revert all changes"
            onClick={handleRevert}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Revert
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Close diff editor"
            onClick={closeDiffEditor}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Diff Editor */}
      <div className="flex-1 min-h-0">
        <ErrorBoundary componentName="Diff Editor (Monaco)">
        <MonacoDiffEditor
          height="100%"
          language={resolvedLanguage}
          original={original}
          modified={modified}
          theme="vs-dark"
          onMount={(editor) => {
            diffEditorRef.current = editor
            setTimeout(() => {
              const changes = refreshLineChanges()
              if (changes.length > 0) {
                focusChange(changes[0])
              }
            }, 0)
          }}
          options={{
            readOnly: false,
            renderSideBySide: viewMode === "side-by-side",
            enableSplitViewResizing: true,
            ignoreTrimWhitespace: ignoreWhitespace,
            hideUnchangedRegions: showUnchanged
              ? { enabled: false }
              : { enabled: true, contextLineCount: 3, minimumLineCount: 3, revealLineCount: 20 },
            renderIndicators: true,
            renderOverviewRuler: true,
            originalEditable: false,
            diffWordWrap: wordWrap ? "on" : "off",
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineHeight: 20,
            fontFamily:
              "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            padding: { top: 8 },
            smoothScrolling: true,
            renderLineHighlight: "all",
            bracketPairColorization: { enabled: true },
            automaticLayout: true,
          }}
        />
        </ErrorBoundary>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border/30 bg-muted/10 text-[11px] text-muted-foreground">
        <span>
          {stats.changes} changes ({stats.additions} insertions, {stats.deletions} deletions)
        </span>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {changeCount > 0 ? `Change ${activeChangeIndex + 1}/${changeCount}` : 'No hunks'}
          </Badge>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" disabled={changeCount === 0} onClick={() => handleAcceptHunk(activeChangeIndex)}>
            Accept Change
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" disabled={changeCount === 0} onClick={() => handleRevertHunk(activeChangeIndex)}>
            Revert Change
          </Button>
          <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => navigateChange('prev')}>
            <ChevronUp className="w-3 h-3" />
            Previous Change
          </button>
          <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => navigateChange('next')}>
            Next Change
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

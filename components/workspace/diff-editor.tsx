"use client"

import { useState, useMemo } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => {
    // MonacoEditor exports DiffEditor as a named export
    return { default: mod.DiffEditor }
  }),
  { ssr: false }
)

interface DiffEditorViewProps {
  originalFile?: string
  modifiedFile?: string
  originalContent?: string
  modifiedContent?: string
  language?: string
}

// Demo content for when no files are provided
const DEMO_ORIGINAL = `import { useState } from "react"

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div className="counter">
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  )
}`

const DEMO_MODIFIED = `import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"

export function Counter({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = useState(initial)

  const increment = useCallback(() => {
    setCount(prev => prev + 1)
  }, [])

  const decrement = useCallback(() => {
    setCount(prev => Math.max(0, prev - 1))
  }, [])

  const reset = useCallback(() => {
    setCount(initial)
  }, [initial])

  return (
    <div className={cn("counter", "flex flex-col gap-2 p-4")}>
      <h2 className="text-lg font-bold">Count: {count}</h2>
      <div className="flex gap-2">
        <button onClick={decrement}>-</button>
        <button onClick={increment}>+</button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  )
}`

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
  originalFile = "counter.tsx (HEAD)",
  modifiedFile = "counter.tsx (Working)",
  originalContent,
  modifiedContent,
  language = "typescript",
}: DiffEditorViewProps) {
  const [viewMode, setViewMode] = useState<"inline" | "side-by-side">("side-by-side")
  const [wordWrap, setWordWrap] = useState(false)
  const [showUnchanged, setShowUnchanged] = useState(true)

  const original = originalContent ?? DEMO_ORIGINAL
  const modified = modifiedContent ?? DEMO_MODIFIED

  const stats = useMemo(() => computeDiffStats(original, modified), [original, modified])

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
            className={cn("h-6 px-2 text-[11px]", wordWrap && "bg-primary/15 text-primary")}
            onClick={() => setWordWrap(!wordWrap)}
          >
            Wrap
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            title="Accept all changes"
          >
            <Check className="w-3 h-3 mr-1" />
            Accept
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            title="Revert all changes"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Revert
          </Button>
        </div>
      </div>

      {/* Diff Editor */}
      <div className="flex-1 min-h-0">
        <MonacoDiffEditor
          height="100%"
          language={language}
          original={original}
          modified={modified}
          theme="vs-dark"
          options={{
            readOnly: false,
            renderSideBySide: viewMode === "side-by-side",
            enableSplitViewResizing: true,
            ignoreTrimWhitespace: false,
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
      </div>

      {/* Summary Bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border/30 bg-muted/10 text-[11px] text-muted-foreground">
        <span>
          {stats.changes} changes ({stats.additions} insertions, {stats.deletions} deletions)
        </span>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ChevronUp className="w-3 h-3" />
            Previous Change
          </button>
          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
            Next Change
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

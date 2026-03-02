"use client"

import { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  X,
  ChevronRight,
  ChevronLeft,
  FileCode,
  ArrowRight,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

interface PeekLocation {
  filePath: string
  lineNumber: number
  column: number
  preview: string // code snippet around the location
}

interface PeekDefinitionProps {
  visible: boolean
  onClose: () => void
  onGoToDefinition?: (filePath: string, line: number) => void
  symbol: string
  locations: PeekLocation[]
  language?: string
}

export function PeekDefinition({
  visible,
  onClose,
  onGoToDefinition,
  symbol,
  locations,
  language = "typescript",
}: PeekDefinitionProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeLocation = locations[activeIndex]

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [visible, onClose])

  if (!visible || !activeLocation) return null

  return (
    <div
      ref={containerRef}
      className="border border-primary/30 rounded-md bg-background shadow-xl overflow-hidden my-1 mx-4 max-h-[280px]"
      style={{ zIndex: 50 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-primary/5 border-b border-primary/20">
        <div className="flex items-center gap-2 min-w-0">
          {/* Navigation */}
          {locations.length > 1 && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="w-5 h-5"
                onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {activeIndex + 1} / {locations.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="w-5 h-5"
                onClick={() => setActiveIndex(Math.min(locations.length - 1, activeIndex + 1))}
                disabled={activeIndex === locations.length - 1}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* File path */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0 overflow-hidden">
            <FileCode className="w-3 h-3 shrink-0 text-blue-400" />
            <span className="truncate">{activeLocation.filePath}</span>
            <span className="text-primary/70 shrink-0">
              :{activeLocation.lineNumber}:{activeLocation.column}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 text-muted-foreground hover:text-foreground"
            title="Open Definition (F12)"
            onClick={() => onGoToDefinition?.(activeLocation.filePath, activeLocation.lineNumber)}
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Side-by-side: file list + preview */}
      <div className="flex h-[220px]">
        {/* File list (only if multiple) */}
        {locations.length > 1 && (
          <div className="w-[200px] border-r border-border/30 overflow-y-auto">
            {locations.map((loc, i) => (
              <button
                key={i}
                className={cn(
                  "w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-[11px] transition-colors",
                  i === activeIndex
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                )}
                onClick={() => setActiveIndex(i)}
              >
                <FileCode className="w-3 h-3 shrink-0 text-blue-400" />
                <span className="truncate">{loc.filePath.split("/").pop()}</span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-auto">
                  :{loc.lineNumber}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Code Preview */}
        <div className="flex-1 min-w-0">
          <MonacoEditor
            height="100%"
            language={language}
            theme="vs-dark"
            value={activeLocation.preview}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              folding: false,
              fontSize: 12,
              lineHeight: 18,
              glyphMargin: false,
              lineDecorationsWidth: 0,
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              automaticLayout: true,
              scrollbar: {
                vertical: "auto",
                horizontal: "auto",
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
              padding: { top: 4 },
              renderLineHighlight: "line",
              fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
              fontLigatures: true,
              contextmenu: false,
              domReadOnly: true,
            }}
          />
        </div>
      </div>
    </div>
  )
}

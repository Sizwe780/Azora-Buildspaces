"use client"

import { useCallback, useState } from "react"
import dynamic from "next/dynamic"
import { X, ArrowLeftRight, Columns2, AlignJustify } from "lucide-react"
import { useWorkbench } from "@/lib/stores/workbench-store"

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => {
    // MonacoDiffEditor is exported as DiffEditor
    return { default: mod.DiffEditor }
  }),
  { ssr: false }
)

export function DiffEditorView() {
  const { diffEditor, closeDiffEditor } = useWorkbench()
  const [sideBySide, setSideBySide] = useState(true)
  const diffEditorRef = useCallback((editor: any) => {
    // Store ref for mode toggling
    if (editor) {
      (window as any).__diffEditor = editor
    }
  }, [])

  const handleMount = useCallback((editor: any) => {
    diffEditorRef(editor)
    setTimeout(() => {
      try { editor.layout() } catch { /* ignore */ }
    }, 100)
  }, [diffEditorRef])

  const toggleDiffMode = useCallback(() => {
    setSideBySide(prev => {
      const next = !prev
      const editor = (window as any).__diffEditor
      if (editor) {
        try { editor.updateOptions({ renderSideBySide: next }) } catch {}
      }
      return next
    })
  }, [])

  if (!diffEditor.isOpen) return null

  const originalName = diffEditor.originalFile?.split('/').pop() || 'Original'
  const modifiedName = diffEditor.modifiedFile?.split('/').pop() || 'Modified'

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between h-9 px-3 border-b border-border/30 bg-muted/20 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">{originalName}</span>
          <span className="opacity-50">↔</span>
          <span className="font-medium text-foreground">{modifiedName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDiffMode}
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            title={sideBySide ? "Switch to Inline Diff" : "Switch to Side-by-Side Diff"}
          >
            {sideBySide ? <AlignJustify className="w-3.5 h-3.5" /> : <Columns2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={closeDiffEditor}
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            title="Close Diff Editor (Escape)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Diff Editor */}
      <div className="flex-1 min-h-0">
        <MonacoDiffEditor
          height="100%"
          theme="vs-dark"
          original={diffEditor.originalContent || `// Loading ${originalName}...`}
          modified={diffEditor.modifiedContent || `// Loading ${modifiedName}...`}
          language="typescript"
          onMount={handleMount}
          options={{
            readOnly: false,
            renderSideBySide: sideBySide,
            enableSplitViewResizing: true,
            originalEditable: false,
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineHeight: 20,
            padding: { top: 8 },
            glyphMargin: false,
            folding: true,
            renderOverviewRuler: true,
            ignoreTrimWhitespace: false,
          }}
        />
      </div>
    </div>
  )
}

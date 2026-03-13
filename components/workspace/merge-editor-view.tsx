"use client"

import { useCallback, useState } from "react"
import dynamic from "next/dynamic"
import { X, Check, XCircle, RotateCcw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

interface MergeEditorViewProps {
  isOpen: boolean
  onClose: () => void
  baseContent: string
  leftContent: string
  rightContent: string
  baseName?: string
  leftName?: string
  rightName?: string
  onAccept: (result: string) => void
}

export function MergeEditorView({
  isOpen,
  onClose,
  baseContent,
  leftContent,
  rightContent,
  baseName = "Base",
  leftName = "Yours",
  rightName = "Theirs",
  onAccept
}: MergeEditorViewProps) {
  const [result, setResult] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const handleMount = useCallback((editor: any) => {
    setTimeout(() => {
      try { editor.layout() } catch { /* ignore */ }
    }, 100)
  }, [])

  const handleResultChange = useCallback((value: string | undefined) => {
    setResult(value || "")
    setHasUnsavedChanges(true)
  }, [])

  const handleAcceptAllLeft = useCallback(() => {
    setResult(leftContent)
    setHasUnsavedChanges(true)
  }, [leftContent])

  const handleAcceptAllRight = useCallback(() => {
    setResult(rightContent)
    setHasUnsavedChanges(true)
  }, [rightContent])

  const handleReset = useCallback(() => {
    setResult("")
    setHasUnsavedChanges(false)
  }, [])

  const handleSave = useCallback(() => {
    onAccept(result)
    setHasUnsavedChanges(false)
  }, [result, onAccept])

  if (!isOpen) return null

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between h-9 px-3 border-b border-border/30 bg-muted/20 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium text-foreground">3-Way Merge</span>
          <span className="opacity-50">|</span>
          <span>{baseName}</span>
          <span className="opacity-50">←</span>
          <span className="text-blue-400">{leftName}</span>
          <span className="opacity-50">→</span>
          <span className="text-green-400">{rightName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAcceptAllLeft}
            className="h-6 px-2 text-xs"
          >
            <Check className="w-3 h-3 mr-1" />
            Accept All (Yours)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAcceptAllRight}
            className="h-6 px-2 text-xs"
          >
            <Check className="w-3 h-3 mr-1" />
            Accept All (Theirs)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasUnsavedChanges}
            className="h-6 px-2 text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="h-6 px-2 text-xs"
          >
            <Save className="w-3 h-3 mr-1" />
            Save Result
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Merge Editor */}
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-1 p-1">
        {/* Base */}
        <div className="flex flex-col">
          <div className="text-xs font-medium text-muted-foreground mb-1 px-2">
            {baseName}
          </div>
          <div className="flex-1 border rounded">
            <MonacoEditor
              height="100%"
              theme="vs-dark"
              value={baseContent}
              language="typescript"
              options={{
                readOnly: true,
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12,
                lineHeight: 18,
                glyphMargin: false,
                folding: false,
              }}
            />
          </div>
        </div>

        {/* Left (Yours) */}
        <div className="flex flex-col">
          <div className="text-xs font-medium text-blue-400 mb-1 px-2">
            {leftName}
          </div>
          <div className="flex-1 border rounded">
            <MonacoEditor
              height="100%"
              theme="vs-dark"
              value={leftContent}
              language="typescript"
              options={{
                readOnly: true,
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12,
                lineHeight: 18,
                glyphMargin: false,
                folding: false,
              }}
            />
          </div>
        </div>

        {/* Right (Theirs) */}
        <div className="flex flex-col">
          <div className="text-xs font-medium text-green-400 mb-1 px-2">
            {rightName}
          </div>
          <div className="flex-1 border rounded">
            <MonacoEditor
              height="100%"
              theme="vs-dark"
              value={rightContent}
              language="typescript"
              options={{
                readOnly: true,
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12,
                lineHeight: 18,
                glyphMargin: false,
                folding: false,
              }}
            />
          </div>
        </div>
      </div>

      {/* Result Editor */}
      <div className="flex-1 min-h-0 border-t">
        <div className="text-xs font-medium text-foreground mb-1 px-3 py-1">
          Result
        </div>
        <div className="px-1 pb-1">
          <MonacoEditor
            height="100%"
            theme="vs-dark"
            value={result}
            onChange={handleResultChange}
            language="typescript"
            onMount={handleMount}
            options={{
              readOnly: false,
              automaticLayout: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineHeight: 20,
              glyphMargin: false,
              folding: true,
            }}
          />
        </div>
      </div>
    </div>
  )
}
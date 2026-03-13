"use client"

import { useState, useEffect, useRef } from "react"
import { Hash } from "lucide-react"
import { useWorkbench } from "@/lib/stores/workbench-store"

interface GoToLineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoToLineDialog({ open, onOpenChange }: GoToLineDialogProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValue("")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleSubmit = () => {
    const parts = value.split(/[,:]/).map(s => s.trim())
    const line = parseInt(parts[0], 10)
    const col = parts[1] ? parseInt(parts[1], 10) : 1

    if (!isNaN(line) && line > 0) {
      // Dispatch a custom event that editor-panel listens for
      window.dispatchEvent(new CustomEvent('azora:gotoLine', { detail: { line, column: col } }))
      onOpenChange(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => onOpenChange(false)}>
      <div
        className="w-[400px] bg-popover border border-border rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border">
          <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Go to Line:Column (e.g., 42 or 42:10)"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
          Type a line number and press Enter. Use <kbd className="font-mono bg-accent/40 px-1 py-0.5 rounded">:</kbd> to specify column.
        </div>
      </div>
    </div>
  )
}

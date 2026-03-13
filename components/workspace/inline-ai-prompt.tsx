"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Sparkles, SendHorizonal, X, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkbench } from "@/lib/stores/workbench-store"

interface InlineAIPromptProps {
  activeFile?: string | null
  cursorLine?: number
  onClose?: () => void
}

/**
 * Inline AI Prompt — "Inline-First" Elara interaction.
 * 
 * Appears as a compact floating input near the cursor.
 * For quick tasks: explain, fix, refactor, generate.
 * Complex discussions escalate to the full sidebar.
 */
export function InlineAIPrompt({ activeFile, cursorLine, onClose }: InlineAIPromptProps) {
  const [input, setInput] = useState("")
  const [response, setResponse] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { showSecondarySidebar } = useWorkbench()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return
    setIsLoading(true)
    setResponse(null)

    try {
      const res = await fetch("/api/agents/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          context: {
            message: input,
            file: activeFile,
            line: cursorLine,
          },
          sessionId: "inline-" + Date.now(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResponse(data.message || data.result || "Done.")
      } else {
        setResponse("Elara is unavailable. Try the full sidebar (Ctrl+Shift+I).")
      }
    } catch {
      setResponse("Connection error. Use sidebar for full AI access.")
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, activeFile, cursorLine])

  const escalateToSidebar = () => {
    showSecondarySidebar("copilot")
    onClose?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === "Escape") {
      onClose?.()
    }
  }

  return (
    <div className="absolute z-30 left-16 right-16 top-8 max-w-xl mx-auto">
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-emerald-500/20 rounded-lg shadow-2xl overflow-hidden">
        {/* Input row */}
        <div className="flex items-center gap-2 px-3 py-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Elara... (explain, fix, refactor)"
            className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className={cn(
              "p-1 rounded transition-colors",
              input.trim() ? "text-emerald-400 hover:bg-emerald-500/10" : "text-zinc-600"
            )}
            title="Send"
          >
            <SendHorizonal className="w-4 h-4" />
          </button>
          <button
            onClick={escalateToSidebar}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Open full AI sidebar"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Response area */}
        {(response || isLoading) && (
          <div className="border-t border-zinc-800/60 px-3 py-2 max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Elara is thinking...
              </div>
            ) : (
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {response}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

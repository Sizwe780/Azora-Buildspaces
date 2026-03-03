"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Check, X, Loader2 } from "lucide-react"

interface InlineEditWidgetProps {
    open: boolean
    onClose: () => void
    onApply: (newCode: string) => void
    selectedCode: string
    language: string
    filename: string
    cursorPosition: { top: number; left: number }
}

export function InlineEditWidget({
    open,
    onClose,
    onApply,
    selectedCode,
    language,
    filename,
    cursorPosition,
}: InlineEditWidgetProps) {
    const [instruction, setInstruction] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            setInstruction("")
            setResult(null)
            setError(null)
            setIsLoading(false)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [open])

    const handleSubmit = async () => {
        if (!instruction.trim() || isLoading) return
        setIsLoading(true)
        setError(null)

        try {
            const res = await fetch("/api/code-chamber/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "refactor",
                    code: selectedCode,
                    language,
                    filename,
                    prompt: instruction,
                }),
            })

            if (!res.ok) {
                setError("AI request failed")
                setIsLoading(false)
                return
            }

            // Read streaming response
            const reader = res.body?.getReader()
            if (!reader) {
                setError("No response stream")
                setIsLoading(false)
                return
            }

            const decoder = new TextDecoder()
            let fullText = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                fullText += chunk
                setResult(fullText)
            }

            setIsLoading(false)
        } catch (e) {
            setError("Failed to connect to AI service")
            setIsLoading(false)
        }
    }

    const handleApply = () => {
        if (result) {
            // Extract code from markdown code blocks if present
            const codeBlockMatch = result.match(/```(?:\w+)?\n([\s\S]*?)```/)
            const cleanCode = codeBlockMatch ? codeBlockMatch[1].trim() : result.trim()
            onApply(cleanCode)
            onClose()
        }
    }

    if (!open) return null

    return (
        <div
            className="fixed z-50 w-[480px] rounded-lg border border-[#30363d] bg-[#161b22] shadow-2xl shadow-black/60 overflow-hidden"
            style={{
                top: Math.min(cursorPosition.top, window.innerHeight - 300),
                left: Math.min(cursorPosition.left, window.innerWidth - 500),
            }}
        >
            {/* Input bar */}
            <div className="flex items-center gap-2 p-2 border-b border-[#1b1f27]">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <input
                    ref={inputRef}
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSubmit()
                        }
                        if (e.key === "Escape") onClose()
                    }}
                    placeholder="Describe the change you want..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#484f58] outline-none disabled:opacity-50"
                />
                {isLoading && <Loader2 className="w-4 h-4 text-[#8b949e] animate-spin shrink-0" />}
            </div>

            {/* Selected code context */}
            {selectedCode && !result && (
                <div className="max-h-[120px] overflow-y-auto border-b border-[#1b1f27]">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[#484f58] bg-[#0d1117]">Selected Code</div>
                    <pre className="px-3 py-2 text-[12px] text-[#8b949e] font-mono whitespace-pre-wrap bg-[#0d1117]">
                        {selectedCode.length > 500 ? selectedCode.slice(0, 500) + "..." : selectedCode}
                    </pre>
                </div>
            )}

            {/* Result diff */}
            {result && (
                <div className="max-h-[280px] overflow-y-auto border-b border-[#1b1f27]">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[#484f58] bg-[#0d1117] flex items-center gap-2">
                        <span>AI Suggestion</span>
                        {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    </div>
                    <pre className="px-3 py-2 text-[12px] text-emerald-300 font-mono whitespace-pre-wrap bg-[#0d1117]">
                        {result}
                    </pre>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="px-3 py-2 text-[12px] text-red-400 bg-red-500/5 border-b border-[#1b1f27]">
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[10px] text-[#484f58]">
                    {isLoading ? "Generating..." : result ? "Review the suggestion" : "Press Enter to generate"}
                </span>
                <div className="flex items-center gap-1">
                    {result && !isLoading && (
                        <button
                            onClick={handleApply}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[#238636] hover:bg-[#2ea043] text-white transition-colors"
                        >
                            <Check className="w-3 h-3" />
                            Apply
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[#8b949e] hover:text-white hover:bg-[#30363d] transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}

"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Trash2, ArrowDown, Copy, Check } from "lucide-react"

export interface OutputLine {
    id: string
    timestamp: number
    text: string
    type: "info" | "error" | "warning" | "success" | "system"
    source?: string
}

interface OutputPanelProps {
    lines: OutputLine[]
    onClear: () => void
}

export function OutputPanel({ lines, onClear }: OutputPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [autoScroll, setAutoScroll] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [lines, autoScroll])

    const handleScroll = () => {
        if (!scrollRef.current) return
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
        setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case "error": return "text-red-400"
            case "warning": return "text-amber-400"
            case "success": return "text-emerald-400"
            case "system": return "text-[#484f58]"
            default: return "text-foreground"
        }
    }

    const formatTime = (ts: number) => {
        const d = new Date(ts)
        return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`
    }

    const copyAll = () => {
        const text = lines.map((l) => `[${formatTime(l.timestamp)}] ${l.text}`).join("\n")
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="h-full flex flex-col bg-background text-foreground">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-1 border-b border-[#1b1f27] shrink-0">
                <div className="flex items-center gap-2 text-[11px] text-[#484f58]">
                    <span>{lines.length} entries</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            setAutoScroll(true)
                            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                        }}
                        className={cn("p-1 rounded transition-colors", autoScroll ? "text-[#58a6ff]" : "text-[#484f58] hover:text-[#8b949e]")}
                        title="Auto-scroll"
                    >
                        <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={copyAll} className="p-1 rounded text-[#484f58] hover:text-[#8b949e] transition-colors" title="Copy all">
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={onClear} className="p-1 rounded text-[#484f58] hover:text-[#8b949e] transition-colors" title="Clear">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Output */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto font-mono text-[12px] leading-[18px]"
            >
                {lines.length === 0 ? (
                    <div className="px-3 py-4 text-[#484f58]">[Output] Waiting for output...</div>
                ) : (
                    lines.map((line) => (
                        <div
                            key={line.id}
                            className={cn("flex items-start px-3 py-[1px] hover:bg-[#1f1f1f] transition-colors", getTypeColor(line.type))}
                        >
                            <span className="text-[#30363d] mr-2 shrink-0 select-none">{formatTime(line.timestamp)}</span>
                            {line.source && <span className="text-[#484f58] mr-2 shrink-0">[{line.source}]</span>}
                            <span className="whitespace-pre-wrap break-all">{line.text}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

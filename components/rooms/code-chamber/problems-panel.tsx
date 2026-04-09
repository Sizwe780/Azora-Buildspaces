"use client"

import { useState, useEffect, useCallback } from "react"
import { useFileSystem } from "@/lib/stores/file-system"
import { cn } from "@/lib/utils"
import { AlertTriangle, XCircle, Info, CheckCircle, RefreshCw, Loader2, Filter } from "lucide-react"

export interface Diagnostic {
    severity: "error" | "warning" | "info" | "hint"
    message: string
    line: number
    column?: number
    rule?: string
    file: string
    fileId: string
}

interface ProblemsPanelProps {
    diagnostics: Diagnostic[]
    isLinting: boolean
    onLintFile: (fileId: string) => void
    onNavigate: (fileId: string, line: number) => void
}

export function ProblemsPanel({ diagnostics, isLinting, onLintFile, onNavigate }: ProblemsPanelProps) {
    const { activeFileId, fileMap } = useFileSystem()
    const [filter, setFilter] = useState<"all" | "error" | "warning" | "info">("all")
    const [showCurrentOnly, setShowCurrentOnly] = useState(false)

    const filteredDiags = diagnostics.filter((d) => {
        if (filter !== "all" && d.severity !== filter) return false
        if (showCurrentOnly && d.fileId !== activeFileId) return false
        return true
    })

    const errorCount = diagnostics.filter((d) => d.severity === "error").length
    const warningCount = diagnostics.filter((d) => d.severity === "warning").length
    const infoCount = diagnostics.filter((d) => d.severity === "info").length

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "error": return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            case "info": return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            default: return <Info className="w-3.5 h-3.5 text-[#484f58] shrink-0" />
        }
    }

    // Group by file
    const groupedByFile = filteredDiags.reduce<Record<string, Diagnostic[]>>((acc, d) => {
        const key = d.file
        if (!acc[key]) acc[key] = []
        acc[key].push(d)
        return acc
    }, {})

    return (
        <div className="h-full flex flex-col bg-background text-foreground">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1b1f27] shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                            onClick={() => setFilter("all")}
                            className={cn("px-1.5 py-0.5 rounded transition-colors", filter === "all" ? "bg-[#30363d] text-white" : "text-[#484f58] hover:text-[#8b949e]")}
                        >
                            All ({diagnostics.length})
                        </button>
                        <button
                            onClick={() => setFilter("error")}
                            className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors", filter === "error" ? "bg-red-500/20 text-red-400" : "text-[#484f58] hover:text-red-400")}
                        >
                            <XCircle className="w-3 h-3" /> {errorCount}
                        </button>
                        <button
                            onClick={() => setFilter("warning")}
                            className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors", filter === "warning" ? "bg-amber-500/20 text-amber-400" : "text-[#484f58] hover:text-amber-400")}
                        >
                            <AlertTriangle className="w-3 h-3" /> {warningCount}
                        </button>
                        <button
                            onClick={() => setFilter("info")}
                            className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors", filter === "info" ? "bg-blue-500/20 text-blue-400" : "text-[#484f58] hover:text-blue-400")}
                        >
                            <Info className="w-3 h-3" /> {infoCount}
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowCurrentOnly(!showCurrentOnly)}
                        className={cn("p-1 rounded transition-colors", showCurrentOnly ? "bg-[#1f6feb]/20 text-[#58a6ff]" : "text-[#484f58] hover:text-[#8b949e]")}
                        title="Show current file only"
                    >
                        <Filter className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => activeFileId && onLintFile(activeFileId)}
                        disabled={isLinting || !activeFileId}
                        className="p-1 rounded text-[#484f58] hover:text-[#8b949e] transition-colors disabled:opacity-40"
                        title="Lint current file"
                    >
                        {isLinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {filteredDiags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8">
                        <CheckCircle className="w-8 h-8 text-emerald-500/40 mb-2" />
                        <p className="text-[13px] text-[#484f58]">No problems detected</p>
                        {activeFileId && (
                            <button
                                onClick={() => onLintFile(activeFileId)}
                                disabled={isLinting}
                                className="mt-2 text-[12px] text-[#58a6ff] hover:underline disabled:opacity-40"
                            >
                                {isLinting ? "Linting..." : "Lint current file"}
                            </button>
                        )}
                    </div>
                ) : (
                    Object.entries(groupedByFile).map(([file, diags]) => (
                        <div key={file}>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161b22] text-[12px] font-medium text-foreground sticky top-0">
                                <span className="truncate">{file}</span>
                                <span className="text-[10px] text-[#484f58]">({diags.length})</span>
                            </div>
                            {diags.map((diag, i) => (
                                <button
                                    key={`${diag.fileId}-${diag.line}-${i}`}
                                    onClick={() => onNavigate(diag.fileId, diag.line)}
                                    className="w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-[#1f1f1f] transition-colors"
                                >
                                    {getSeverityIcon(diag.severity)}
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[12px] text-foreground">{diag.message}</span>
                                        {diag.rule && (
                                            <span className="ml-2 text-[10px] text-[#484f58]">[{diag.rule}]</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-[#484f58] shrink-0">
                                        Ln {diag.line}{diag.column ? `, Col ${diag.column}` : ""}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

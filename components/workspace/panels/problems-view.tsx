"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { AlertCircle, AlertTriangle, Info, RefreshCw, FileCode, ChevronRight, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ProblemItem {
    file: string
    line: number
    column: number
    severity: 'error' | 'warning' | 'info'
    code: string
    message: string
    source?: string
}

type SeverityFilter = 'all' | 'error' | 'warning' | 'info'

export function ProblemsView() {
    const [items, setItems] = useState<ProblemItem[]>([])
    const [monacoMarkers, setMonacoMarkers] = useState<ProblemItem[]>([])
    const [taskProblems, setTaskProblems] = useState<ProblemItem[]>([])
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null)
    const [filter, setFilter] = useState<SeverityFilter>('all')
    const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set())

    // Fetch problems from API
    const refresh = useCallback(async () => {
        setLoading(true)
        setApiError(null)
        try {
            const res = await fetch('/api/workbench/runtime?action=problems', { cache: 'no-store' })
            const data = await res.json().catch(() => ({}))
            if (res.ok) {
                const normalized = Array.isArray(data.problems)
                    ? data.problems.map((item: ProblemItem) => ({
                        ...item,
                        source: item.source || 'TypeScript',
                    }))
                    : []
                setItems(normalized)
                return
            }
            setApiError(String(data?.error || 'Problems runtime unavailable. Showing editor markers only.'))
        } catch {
            setApiError('Problems runtime unavailable. Showing editor markers only.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    // Poll Monaco editor markers every 3 seconds
    useEffect(() => {
        if (typeof window === 'undefined') return

        const pollMarkers = () => {
            try {
                // Access Monaco global if available
                const monaco = (window as any).monaco
                if (!monaco?.editor) return

                const markers = monaco.editor.getModelMarkers({})
                if (!Array.isArray(markers)) return

                const mapped: ProblemItem[] = markers.map((m: any) => ({
                    file: m.resource?.path || m.resource?.toString() || 'unknown',
                    line: m.startLineNumber || 1,
                    column: m.startColumn || 1,
                    severity: m.severity === 8 ? 'error' : m.severity === 4 ? 'warning' : 'info',
                    code: m.code?.value || m.code || '',
                    message: m.message || '',
                    source: m.source || 'Monaco',
                }))

                setMonacoMarkers(mapped)
            } catch {
                // Monaco not available yet
            }
        }

        pollMarkers()
        const interval = setInterval(pollMarkers, 3000)
        return () => clearInterval(interval)
    }, [])

    // Listen for task-generated problems (from problem matchers)
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail
            if (detail?.problems && Array.isArray(detail.problems)) {
                setTaskProblems(prev => {
                    // If clear flag, replace all task problems; otherwise append
                    if (detail.clear) return detail.problems
                    const combined = [...prev, ...detail.problems]
                    // Deduplicate
                    const seen = new Set<string>()
                    return combined.filter((p: ProblemItem) => {
                        const key = `${p.file}:${p.line}:${p.column}:${p.message}`
                        if (seen.has(key)) return false
                        seen.add(key)
                        return true
                    })
                })
            }
        }
        window.addEventListener('problems:fromTask', handler)
        return () => window.removeEventListener('problems:fromTask', handler)
    }, [])

    // Merge API problems, Monaco markers, and task problems — deduplicate
    const allProblems = useMemo(() => {
        const combined = [...items, ...monacoMarkers, ...taskProblems]
        const seen = new Set<string>()
        return combined.filter(p => {
            const key = `${p.file}:${p.line}:${p.column}:${p.message}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
    }, [items, monacoMarkers, taskProblems])

    // Apply severity filter
    const filteredProblems = useMemo(() => {
        if (filter === 'all') return allProblems
        return allProblems.filter(p => p.severity === filter)
    }, [allProblems, filter])

    // Group by file
    const groupedByFile = useMemo(() => {
        const groups: Record<string, ProblemItem[]> = {}
        for (const p of filteredProblems) {
            const file = p.file || 'unknown'
            if (!groups[file]) groups[file] = []
            groups[file].push(p)
        }
        // Sort files alphabetically, errors first within each file
        const severityOrder = { error: 0, warning: 1, info: 2 }
        for (const file of Object.keys(groups)) {
            groups[file].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.line - b.line)
        }
        return groups
    }, [filteredProblems])

    const summary = useMemo(() => ({
        errors: allProblems.filter((item) => item.severity === 'error').length,
        warnings: allProblems.filter((item) => item.severity === 'warning').length,
        infos: allProblems.filter((item) => item.severity === 'info').length,
        total: allProblems.length,
    }), [allProblems])

    const sourceTagClass = (source?: string) => {
        const normalized = (source || '').toLowerCase()
        if (normalized.includes('monaco')) return 'bg-violet-500/10 text-violet-300 border-violet-500/20'
        if (normalized.includes('typescript')) return 'bg-blue-500/10 text-blue-300 border-blue-500/20'
        return 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20'
    }

    const toggleFileCollapse = (file: string) => {
        setCollapsedFiles(prev => {
            const next = new Set(prev)
            if (next.has(file)) next.delete(file)
            else next.add(file)
            return next
        })
    }

    const severityIcon = (severity: string) => {
        switch (severity) {
            case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            default: return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        }
    }

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="p-2 border-b border-border/40 flex items-center justify-between text-xs">
                <div className="flex gap-3">
                    <button
                        className={cn("flex items-center gap-1 transition-colors", filter === 'all' || filter === 'error' ? "text-red-500" : "text-muted-foreground hover:text-red-500")}
                        onClick={() => setFilter(f => f === 'error' ? 'all' : 'error')}
                    >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{summary.errors}</span>
                    </button>
                    <button
                        className={cn("flex items-center gap-1 transition-colors", filter === 'warning' ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500")}
                        onClick={() => setFilter(f => f === 'warning' ? 'all' : 'warning')}
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{summary.warnings}</span>
                    </button>
                    <button
                        className={cn("flex items-center gap-1 transition-colors", filter === 'info' ? "text-blue-400" : "text-muted-foreground hover:text-blue-400")}
                        onClick={() => setFilter(f => f === 'info' ? 'all' : 'info')}
                    >
                        <Info className="w-3.5 h-3.5" />
                        <span>{summary.infos}</span>
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    {apiError && (
                        <span className="text-[10px] text-amber-400 max-w-[220px] truncate" title={apiError}>
                            Runtime scan unavailable
                        </span>
                    )}
                    <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1" onClick={refresh} disabled={loading}>
                        <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                        {loading ? 'Scanning…' : 'Refresh'}
                    </Button>
                </div>
            </div>

            {/* Problem list grouped by file */}
            <div className="flex-1 overflow-auto text-xs">
                {filteredProblems.length === 0 ? (
                    <div className="h-full p-4 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                        <div>No problems detected.</div>
                        {apiError ? (
                            <div className="text-[11px] text-amber-400">Runtime diagnostics unavailable; editor markers are still monitored.</div>
                        ) : (
                            <div className="text-[11px] text-muted-foreground/70">{summary.total} items across runtime + editor markers.</div>
                        )}
                    </div>
                ) : (
                    <div>
                        {Object.entries(groupedByFile).map(([file, problems]) => {
                            const isCollapsed = collapsedFiles.has(file)
                            const fileErrors = problems.filter(p => p.severity === 'error').length
                            const fileWarnings = problems.filter(p => p.severity === 'warning').length
                            return (
                                <div key={file}>
                                    {/* File header */}
                                    <button
                                        className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted/30 text-left sticky top-0 bg-background z-10"
                                        onClick={() => toggleFileCollapse(file)}
                                    >
                                        {isCollapsed
                                            ? <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                            : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                                        }
                                        <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate font-medium text-foreground">{file.split('/').pop() || file}</span>
                                        <span className="text-muted-foreground/60 truncate ml-1">{file}</span>
                                        <span className="ml-auto flex items-center gap-2 shrink-0">
                                            {fileErrors > 0 && <span className="text-red-500">{fileErrors}</span>}
                                            {fileWarnings > 0 && <span className="text-yellow-500">{fileWarnings}</span>}
                                        </span>
                                    </button>

                                    {/* Problems in file */}
                                    {!isCollapsed && problems.map((item, index) => (
                                        <div
                                            key={`${item.file}-${item.line}-${item.column}-${index}`}
                                            className="flex items-start gap-2 px-3 py-1.5 pl-8 hover:bg-muted/20 cursor-pointer"
                                        >
                                            {severityIcon(item.severity)}
                                            <div className="flex-1 min-w-0">
                                                <span className="text-foreground">{item.message}</span>
                                                {item.source && (
                                                    <span className={cn("ml-2 inline-flex items-center rounded border px-1 py-0.5 text-[10px] uppercase tracking-wide", sourceTagClass(item.source))}>
                                                        {item.source}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-muted-foreground/60 shrink-0 tabular-nums">
                                                {item.code && <span className="mr-2">{item.code}</span>}
                                                [{item.line},{item.column}]
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

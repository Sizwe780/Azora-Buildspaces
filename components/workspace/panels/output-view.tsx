"use client"

import { useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useWorkbenchRuntimeStore } from "@/lib/stores/workbench-runtime-store"
import type { RuntimeLogEntry } from "@/lib/stores/workbench-runtime-store"

export function OutputView() {
    const logs = useWorkbenchRuntimeStore((state: ReturnType<typeof useWorkbenchRuntimeStore.getState>) => state.logs)
    const clearLogs = useWorkbenchRuntimeStore((state: ReturnType<typeof useWorkbenchRuntimeStore.getState>) => state.clearLogs)

    const ordered = useMemo(() => [...logs].sort((a, b) => a.timestamp - b.timestamp), [logs])

    const summary = useMemo(() => {
        return {
            terminal: ordered.filter((entry: RuntimeLogEntry) => entry.source === 'terminal').length,
            debug: ordered.filter((entry: RuntimeLogEntry) => entry.source === 'debug').length,
            system: ordered.filter((entry: RuntimeLogEntry) => entry.source === 'system').length,
            errors: ordered.filter((entry: RuntimeLogEntry) => entry.level === 'error').length,
            warnings: ordered.filter((entry: RuntimeLogEntry) => entry.level === 'warn').length,
        }
    }, [ordered])

    const levelColor = (level: string) => {
        if (level === 'error') return 'text-red-400'
        if (level === 'warn') return 'text-yellow-400'
        if (level === 'info') return 'text-blue-400'
        return 'text-zinc-200'
    }

    const sourceColor = (source: string) => {
        if (source === 'terminal') return 'bg-cyan-500/15 text-cyan-300'
        if (source === 'debug') return 'bg-violet-500/15 text-violet-300'
        return 'bg-zinc-500/15 text-zinc-300'
    }

    const levelBadgeColor = (level: string) => {
        if (level === 'error') return 'bg-red-500/15 text-red-300'
        if (level === 'warn') return 'bg-yellow-500/15 text-yellow-300'
        if (level === 'info') return 'bg-blue-500/15 text-blue-300'
        return 'bg-zinc-500/15 text-zinc-300'
    }

    return (
        <div className="h-full bg-black text-white font-mono text-xs p-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Output ({ordered.length})</div>
                <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={clearLogs} disabled={ordered.length === 0}>Clear</Button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-cyan-300">terminal {summary.terminal}</span>
                <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-violet-300">debug {summary.debug}</span>
                <span className="rounded bg-zinc-500/15 px-1.5 py-0.5 text-zinc-300">system {summary.system}</span>
                <span className="ml-1 rounded bg-red-500/15 px-1.5 py-0.5 text-red-300">errors {summary.errors}</span>
                <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-yellow-300">warnings {summary.warnings}</span>
            </div>
            <ScrollArea className="h-full">
                <div className="space-y-1 pr-2">
                    {ordered.length === 0 ? (
                        <div className="text-muted-foreground">No output yet. Run terminal/debug commands to populate this panel.</div>
                    ) : ordered.map((entry: RuntimeLogEntry) => (
                        <div key={entry.id} className={levelColor(entry.level)}>
                            <span className="text-muted-foreground">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>{' '}
                            <span className={`rounded px-1 py-0.5 text-[10px] uppercase ${sourceColor(entry.source)}`}>{entry.source}</span>{' '}
                            <span className={`rounded px-1 py-0.5 text-[10px] uppercase ${levelBadgeColor(entry.level)}`}>{entry.level}</span>{' '}
                            <span>{entry.message}</span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}

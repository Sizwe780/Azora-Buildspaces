"use client"

import { useState, useEffect, useCallback } from "react"
import {
  GitCommit, Clock, User, FileCode, RefreshCw,
  ChevronRight, Calendar, ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface TimelineEntry {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
  timestamp: number
  filePath?: string
}

export function TimelineView({ activeFile, onNavigateToFile }: {
  activeFile?: string | null
  onNavigateToFile?: (file: string) => void
}) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTimeline = useCallback(async () => {
    if (!activeFile) {
      setEntries([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Call FS API with git log for the specific file
      const res = await fetch('/api/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'gitLog',
          path: activeFile,
          limit: 50,
        }),
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch timeline: ${res.status}`)
      }

      const data = await res.json()

      if (data.log && Array.isArray(data.log)) {
        const mapped: TimelineEntry[] = data.log.map((entry: any) => ({
          hash: entry.hash || entry.oid || '',
          shortHash: (entry.hash || entry.oid || '').slice(0, 7),
          message: entry.message || entry.commit?.message || 'No message',
          author: entry.author || entry.commit?.author?.name || 'Unknown',
          date: entry.date || entry.commit?.author?.timestamp
            ? new Date((entry.commit?.author?.timestamp || 0) * 1000).toLocaleString()
            : 'Unknown date',
          timestamp: entry.timestamp || entry.commit?.author?.timestamp || 0,
          filePath: activeFile,
        }))
        setEntries(mapped)
      } else {
        setEntries([])
      }
    } catch (err: any) {
      // Git might not be available — show empty state gracefully
      setError(err.message || 'Failed to load file history')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [activeFile])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  const formatRelativeTime = (timestamp: number): string => {
    if (!timestamp) return ''
    const now = Date.now() / 1000
    const diff = now - timestamp
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`
    return `${Math.floor(diff / 2592000)}mo ago`
  }

  if (!activeFile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
          <div>
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Open a file to see its timeline</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] font-medium text-foreground truncate">
            {activeFile?.split('/').pop() || 'Timeline'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6"
          onClick={fetchTimeline}
          disabled={loading}
          title="Refresh timeline"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Timeline entries */}
      <div className="flex-1 overflow-auto">
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading history...
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <GitCommit className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground mb-1">Git history unavailable</p>
            <p className="text-[10px] text-muted-foreground/60">{error}</p>
            <Button variant="ghost" size="sm" className="mt-2 h-6 text-[11px]" onClick={fetchTimeline}>
              Retry
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
            <div className="text-center">
              <GitCommit className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No history for this file</p>
            </div>
          </div>
        ) : (
          <div className="py-1">
            {entries.map((entry, i) => (
              <div
                key={entry.hash || i}
                className="group relative px-3 py-2 hover:bg-accent/30 transition-colors cursor-default"
              >
                {/* Vertical timeline line */}
                {i < entries.length - 1 && (
                  <div className="absolute left-[19px] top-6 bottom-0 w-px bg-border/40" />
                )}

                <div className="flex items-start gap-2.5">
                  {/* Commit dot */}
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full mt-1 shrink-0 ring-2 ring-background",
                    i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                  )} />

                  <div className="flex-1 min-w-0">
                    {/* Commit message */}
                    <p className="text-[12px] text-foreground/90 leading-tight truncate group-hover:text-foreground">
                      {entry.message.split('\n')[0]}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <User className="w-2.5 h-2.5" />
                        {entry.author}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {entry.timestamp ? formatRelativeTime(entry.timestamp) : entry.date}
                      </span>
                      <span className="font-mono text-primary/70">{entry.shortHash}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border/20 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>{entries.length} commit{entries.length !== 1 ? 's' : ''}</span>
        <span className="flex items-center gap-1">
          <GitCommit className="w-2.5 h-2.5" />
          Git History
        </span>
      </div>
    </div>
  )
}

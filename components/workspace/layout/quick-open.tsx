"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { FileCode, Search, Folder, Hash } from "lucide-react"
import { useFileSystem } from "@/lib/stores/file-system"
import { useWorkbench } from "@/lib/stores/workbench-store"
import { cn } from "@/lib/utils"

interface QuickOpenProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileSelect: (path: string) => void
}

export function QuickOpen({ open, onOpenChange, onFileSelect }: QuickOpenProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { fileMap } = useFileSystem()

  // Collect all file paths from the file system
  const allFiles = useMemo(() => {
    return Object.entries(fileMap)
      .filter(([, node]) => node.type === 'file')
      .map(([, node]) => node.path || node.name)
      .sort()
  }, [fileMap])

  // Fuzzy-match files
  const filtered = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 50)
    const q = query.toLowerCase()
    return allFiles
      .filter(f => {
        const name = f.toLowerCase()
        // Simple fuzzy: all chars of query appear in order
        let qi = 0
        for (let i = 0; i < name.length && qi < q.length; i++) {
          if (name[i] === q[qi]) qi++
        }
        return qi === q.length
      })
      .sort((a, b) => {
        // Prefer files whose name starts with query
        const aName = a.split('/').pop()?.toLowerCase() || ''
        const bName = b.split('/').pop()?.toLowerCase() || ''
        const aStarts = aName.startsWith(q) ? -1 : 0
        const bStarts = bName.startsWith(q) ? -1 : 0
        return aStarts - bStarts || a.length - b.length
      })
      .slice(0, 50)
  }, [query, allFiles])

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        onFileSelect(filtered[selectedIndex])
        onOpenChange(false)
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  if (!open) return null

  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase()
    const iconColors: Record<string, string> = {
      ts: 'text-blue-400', tsx: 'text-blue-400',
      js: 'text-yellow-400', jsx: 'text-yellow-400',
      css: 'text-purple-400', scss: 'text-pink-400',
      json: 'text-yellow-500', md: 'text-gray-400',
      html: 'text-orange-400', py: 'text-green-400',
      go: 'text-cyan-400', rs: 'text-orange-500',
    }
    return iconColors[ext || ''] || 'text-muted-foreground'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => onOpenChange(false)}>
      <div
        className="w-[560px] max-h-[400px] bg-popover border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <span className="text-[10px] text-muted-foreground shrink-0">
            {filtered.length} file{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div ref={listRef} className="overflow-y-auto max-h-[340px] py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No files found
            </div>
          ) : (
            filtered.map((filePath, idx) => {
              const fileName = filePath.split('/').pop() || filePath
              const dirPath = filePath.split('/').slice(0, -1).join('/')
              return (
                <button
                  key={filePath}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1 text-left text-[12px] hover:bg-accent/50 transition-colors",
                    idx === selectedIndex && "bg-accent"
                  )}
                  onClick={() => {
                    onFileSelect(filePath)
                    onOpenChange(false)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <FileCode className={cn("w-4 h-4 shrink-0", getFileIcon(filePath))} />
                  <span className="font-medium truncate">{fileName}</span>
                  <span className="text-[11px] text-muted-foreground truncate ml-auto">{dirPath}</span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

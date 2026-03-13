"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Hash, FileCode, Box, Braces } from "lucide-react"
import { useFileSystem } from "@/lib/stores/file-system"
import { cn } from "@/lib/utils"

interface WorkspaceSymbol {
  name: string
  kind: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'enum' | 'method'
  file: string
  line: number
}

interface WorkspaceSymbolSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (filePath: string, line: number) => void
}

const SYMBOL_REGEX = /(?:export\s+)?(?:(?:async\s+)?function\s+(\w+)|class\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=|interface\s+(\w+)|type\s+(\w+)\s*=|enum\s+(\w+))/g

function extractSymbols(content: string, filePath: string): WorkspaceSymbol[] {
  const symbols: WorkspaceSymbol[] = []
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    SYMBOL_REGEX.lastIndex = 0
    let match
    while ((match = SYMBOL_REGEX.exec(line)) !== null) {
      const name = match[1] || match[2] || match[3] || match[4] || match[5] || match[6]
      if (!name) continue
      let kind: WorkspaceSymbol['kind'] = 'variable'
      if (match[1]) kind = 'function'
      else if (match[2]) kind = 'class'
      else if (match[4]) kind = 'interface'
      else if (match[5]) kind = 'type'
      else if (match[6]) kind = 'enum'
      symbols.push({ name, kind, file: filePath, line: idx + 1 })
    }
  })
  return symbols
}

const SYMBOL_ICONS: Record<string, typeof Hash> = {
  function: Braces,
  class: Box,
  variable: Hash,
  interface: FileCode,
  type: FileCode,
  enum: Box,
  method: Braces,
}

export function WorkspaceSymbolSearch({ open, onOpenChange, onNavigate }: WorkspaceSymbolSearchProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { fileMap } = useFileSystem()

  // Build workspace symbols index
  const allSymbols = useMemo(() => {
    const symbols: WorkspaceSymbol[] = []
    Object.values(fileMap).forEach((node: any) => {
      if (node.type !== 'file' || !node.content) return
      symbols.push(...extractSymbols(node.content, node.path || node.name))
    })
    return symbols
  }, [fileMap])

  // Filter symbols
  const filtered = useMemo(() => {
    if (!query.trim()) return allSymbols.slice(0, 100)
    const q = query.toLowerCase()
    return allSymbols
      .filter(s => s.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? -1 : 0
        const bStarts = b.name.toLowerCase().startsWith(q) ? -1 : 0
        return aStarts - bStarts || a.name.length - b.name.length
      })
      .slice(0, 100)
  }, [query, allSymbols])

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setSelectedIndex(0) }, [filtered])

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.children[selectedIndex] as HTMLElement
    if (item) item.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleSelect = (sym: WorkspaceSymbol) => {
    onNavigate(sym.file, sym.line)
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex])
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  // Listen for workspace symbol search event
  useEffect(() => {
    const handler = () => onOpenChange(true)
    window.addEventListener('azora:workspaceSymbolSearch', handler)
    return () => window.removeEventListener('azora:workspaceSymbolSearch', handler)
  }, [onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => onOpenChange(false)}>
      <div
        className="w-[560px] max-h-[400px] bg-background border border-border rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-3 border-b border-border">
          <Hash className="w-4 h-4 text-muted-foreground mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type to search workspace symbols..."
            className="flex-1 h-10 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="text-[10px] text-muted-foreground">{filtered.length} symbols</span>
        </div>
        <div ref={listRef} className="max-h-[340px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No symbols found
            </div>
          ) : (
            filtered.map((sym, idx) => {
              const Icon = SYMBOL_ICONS[sym.kind] || Hash
              return (
                <div
                  key={`${sym.file}:${sym.line}:${sym.name}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 cursor-pointer text-sm",
                    idx === selectedIndex ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                  )}
                  onClick={() => handleSelect(sym)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{sym.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{sym.kind}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[200px]">
                    {sym.file}:{sym.line}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

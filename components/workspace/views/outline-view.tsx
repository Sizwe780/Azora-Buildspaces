"use client"

import { useState, useEffect, useMemo, memo } from "react"
import {
  ChevronRight, ChevronDown, FileCode, Hash, Braces, Type,
  Variable, Box, Zap, Shield, Clock, Brackets,
  ArrowUpDown, Filter, Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFileSystem } from "@/lib/stores/file-system"
import { Button } from "@/components/ui/button"

// Symbol kinds from LSP/Monaco SymbolKind
type SymbolKind =
  | 'file' | 'module' | 'namespace' | 'package' | 'class' | 'method'
  | 'property' | 'field' | 'constructor' | 'enum' | 'interface'
  | 'function' | 'variable' | 'constant' | 'string' | 'number'
  | 'boolean' | 'array' | 'object' | 'key' | 'null' | 'struct'
  | 'event' | 'operator' | 'type'

interface DocumentSymbol {
  name: string
  kind: SymbolKind
  range: { startLine: number; endLine: number }
  children?: DocumentSymbol[]
}

const ICON_MAP: Record<string, React.ReactNode> = {
  function: <Zap className="w-3.5 h-3.5 text-yellow-400" />,
  method: <Zap className="w-3.5 h-3.5 text-yellow-400" />,
  class: <Box className="w-3.5 h-3.5 text-orange-400" />,
  interface: <Shield className="w-3.5 h-3.5 text-blue-400" />,
  type: <Type className="w-3.5 h-3.5 text-blue-300" />,
  enum: <Brackets className="w-3.5 h-3.5 text-emerald-400" />,
  variable: <Variable className="w-3.5 h-3.5 text-sky-400" />,
  constant: <Hash className="w-3.5 h-3.5 text-pink-400" />,
  property: <Braces className="w-3.5 h-3.5 text-violet-400" />,
  field: <Braces className="w-3.5 h-3.5 text-violet-400" />,
  constructor: <Zap className="w-3.5 h-3.5 text-amber-500" />,
  module: <FileCode className="w-3.5 h-3.5 text-green-400" />,
  namespace: <FileCode className="w-3.5 h-3.5 text-green-400" />,
}

function getSymbolIcon(kind: SymbolKind) {
  return ICON_MAP[kind] || <Hash className="w-3.5 h-3.5 text-muted-foreground" />
}

/** Parse TypeScript/JavaScript source into document symbols */
function parseSymbols(code: string, fileName: string): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = []
  const lines = code.split('\n')

  // Regex patterns for common TS/JS constructs
  const patterns: { regex: RegExp; kind: SymbolKind }[] = [
    { regex: /^export\s+(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/, kind: 'class' },
    { regex: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/, kind: 'class' },
    { regex: /^export\s+(?:default\s+)?interface\s+(\w+)/, kind: 'interface' },
    { regex: /^(?:export\s+)?interface\s+(\w+)/, kind: 'interface' },
    { regex: /^export\s+(?:default\s+)?type\s+(\w+)/, kind: 'type' },
    { regex: /^(?:export\s+)?type\s+(\w+)/, kind: 'type' },
    { regex: /^export\s+(?:default\s+)?enum\s+(\w+)/, kind: 'enum' },
    { regex: /^(?:export\s+)?enum\s+(\w+)/, kind: 'enum' },
    { regex: /^export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/, kind: 'function' },
    { regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/, kind: 'function' },
    { regex: /^export\s+(?:const|let|var)\s+(\w+)/, kind: 'variable' },
    { regex: /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/, kind: 'function' },
    { regex: /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/, kind: 'function' },
    { regex: /^(?:const|let|var)\s+(\w+)/, kind: 'variable' },
    // React components
    { regex: /^export\s+(?:default\s+)?function\s+([A-Z]\w+)/, kind: 'class' },
  ]

  // TSX/JSX: detect components by uppercase function names
  const isReactFile = /\.(tsx|jsx)$/.test(fileName)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue

    for (const { regex, kind } of patterns) {
      const match = line.match(regex)
      if (match && match[1]) {
        let effectiveKind = kind
        // React component detection (uppercase first letter function)
        if (isReactFile && kind === 'function' && /^[A-Z]/.test(match[1])) {
          effectiveKind = 'class'
        }

        // Determine end of block by matching braces
        let endLine = i
        let braceDepth = 0
        let foundBrace = false
        for (let j = i; j < lines.length && j < i + 500; j++) {
          for (const ch of lines[j]) {
            if (ch === '{') { braceDepth++; foundBrace = true }
            if (ch === '}') braceDepth--
          }
          if (foundBrace && braceDepth <= 0) { endLine = j; break }
          endLine = j
        }

        symbols.push({
          name: match[1],
          kind: effectiveKind,
          range: { startLine: i + 1, endLine: endLine + 1 },
        })
        break
      }
    }
  }

  // Deduplicate by name (first occurrence wins)
  const seen = new Set<string>()
  return symbols.filter(s => {
    if (seen.has(s.name)) return false
    seen.add(s.name)
    return true
  })
}

const SymbolItem = memo(function SymbolItem({ symbol, depth = 0, onNavigate }: {
  symbol: DocumentSymbol
  depth?: number
  onNavigate: (line: number) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = symbol.children && symbol.children.length > 0

  return (
    <div>
      <button
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        aria-level={depth + 1}
        className={cn(
          "w-full flex items-center gap-1.5 py-[3px] pl-2 pr-2 text-[12px] hover:bg-accent/40 transition-colors text-left group",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded)
          onNavigate(symbol.range.startLine)
        }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {getSymbolIcon(symbol.kind)}
        <span className="truncate text-foreground/90 group-hover:text-foreground">{symbol.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/60 shrink-0">:{symbol.range.startLine}</span>
      </button>
      {expanded && hasChildren && symbol.children!.map((child, ci) => (
        <SymbolItem key={`${child.name}-${ci}`} symbol={child} depth={depth + 1} onNavigate={onNavigate} />
      ))}
    </div>
  )
})

export function OutlineView({ activeFile, onNavigateToLine }: {
  activeFile?: string | null
  onNavigateToLine?: (file: string, line: number) => void
}) {
  const { fileMap, workspaceId } = useFileSystem()
  const [symbols, setSymbols] = useState<DocumentSymbol[]>([])
  const [loading, setLoading] = useState(false)
  const [sortByPosition, setSortByPosition] = useState(true)
  const [filterText, setFilterText] = useState('')

  // Fetch and parse symbols when active file changes
  useEffect(() => {
    if (!activeFile) {
      setSymbols([])
      return
    }

    let cancelled = false
    setLoading(true)

    const fetchAndParse = async () => {
      try {
        const params = new URLSearchParams({ path: activeFile })
        if (workspaceId) {
          params.set('workspaceId', workspaceId)
        }

        const res = await fetch(`/api/fs/content?${params.toString()}`)
        const data = await res.json()
        if (cancelled) return

        if (data.content) {
          const parsed = parseSymbols(data.content, activeFile)
          setSymbols(parsed)
        } else {
          setSymbols([])
        }
      } catch {
        if (!cancelled) setSymbols([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAndParse()
    return () => { cancelled = true }
  }, [activeFile, workspaceId])

  const sortedSymbols = useMemo(() => {
    let filtered = symbols
    if (filterText.trim()) {
      const q = filterText.toLowerCase()
      filtered = symbols.filter(s => s.name.toLowerCase().includes(q))
    }
    if (!sortByPosition) {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    }
    return filtered
  }, [symbols, sortByPosition, filterText])

  const handleNavigate = (line: number) => {
    if (activeFile && onNavigateToLine) {
      onNavigateToLine(activeFile, line)
    }
  }

  if (!activeFile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
          <div>
            <FileCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Open a file to see its outline</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/30">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            className="w-full h-6 pl-6 pr-2 text-[11px] bg-muted/30 border border-border/40 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
            placeholder="Filter symbols..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn("w-6 h-6", !sortByPosition && "bg-accent/50")}
          onClick={() => setSortByPosition(!sortByPosition)}
          title={sortByPosition ? "Sort by position" : "Sort alphabetically"}
        >
          <ArrowUpDown className="w-3 h-3" />
        </Button>
      </div>

      {/* Symbol tree */}
      <div className="flex-1 overflow-auto py-1" role="tree" aria-label="Document outline">
        {loading ? (
          <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 animate-spin mr-2" />
            Parsing symbols...
          </div>
        ) : sortedSymbols.length === 0 ? (
          <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
            No symbols found in this file
          </div>
        ) : (
          sortedSymbols.map((symbol, i) => (
            <SymbolItem
              key={`${symbol.name}-${i}`}
              symbol={symbol}
              onNavigate={handleNavigate}
            />
          ))
        )}
      </div>

      {/* Footer stats */}
      <div className="px-2 py-1 border-t border-border/20 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>{symbols.length} symbol{symbols.length !== 1 ? 's' : ''}</span>
        <span className="truncate ml-2">{activeFile?.split('/').pop()}</span>
      </div>
    </div>
  )
}

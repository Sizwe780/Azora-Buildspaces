"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Search,
  Replace,
  ChevronDown,
  ChevronRight,
  FileCode,
  X,
  CaseSensitive,
  Regex,
  WholeWord,
  FolderOpen,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  ChevronUp,
  Loader2,
  History,
  Settings,
  FileText,
  Hash,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useFileSystem } from "@/lib/stores/file-system"

interface SearchMatch {
  line: number
  column: number
  text: string
  matchStart: number
  matchEnd: number
}

interface SearchResult {
  file: string
  matches: SearchMatch[]
}

interface SearchHistoryItem {
  query: string
  replaceQuery?: string
  caseSensitive: boolean
  wholeWord: boolean
  useRegex: boolean
  includePattern: string
  excludePattern: string
  timestamp: Date
}

export function SearchReplaceView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [replaceQuery, setReplaceQuery] = useState("")
  const [showReplace, setShowReplace] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [preserveCase, setPreserveCase] = useState(false)
  const [includePattern, setIncludePattern] = useState("")
  const [excludePattern, setExcludePattern] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [resultLimit, setResultLimit] = useState(10000)
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [multiLineSearch, setMultiLineSearch] = useState(false)

  const { fileMap, writeFile } = useFileSystem()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const openMatchInEditor = useCallback((filePath: string, match: SearchMatch) => {
    window.dispatchEvent(new CustomEvent('azora:openFile', {
      detail: {
        path: filePath,
        line: match.line,
        column: match.column || match.matchStart + 1,
      },
    }))
  }, [])

  // Build a text-matching function based on current flags
  const buildMatcher = useCallback((query: string) => {
    if (!query) return null
    try {
      let flags = caseSensitive ? 'g' : 'gi'
      if (multiLineSearch) flags += 'm'

      if (useRegex) {
        return new RegExp(query, flags)
      }
      // Escape regex special characters for literal search
      let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (wholeWord) escaped = `\\b${escaped}\\b`
      return new RegExp(escaped, flags)
    } catch {
      return null
    }
  }, [caseSensitive, wholeWord, useRegex, multiLineSearch])

  // Perform search across all files in fileMap
  const performSearch = useCallback((query: string) => {
    const matcher = buildMatcher(query)
    if (!matcher) { setResults([]); return }

    setIsSearching(true)
    const found: SearchResult[] = []
    let totalMatches = 0

    // Glob-style pattern matching helper
    const matchGlob = (path: string, pattern: string) => {
      if (!pattern.trim()) return true
      return pattern.split(',').some(p => {
        const trimmed = p.trim()
        if (!trimmed) return true
        if (trimmed.startsWith('*')) return path.endsWith(trimmed.slice(1))
        return path.includes(trimmed)
      })
    }

    for (const [, node] of Object.entries(fileMap)) {
      if (node.type !== 'file' || !node.content) continue
      const filePath = node.path || node.name

      // Apply include/exclude filters
      if (includePattern.trim() && !matchGlob(filePath, includePattern)) continue
      if (excludePattern.trim() && matchGlob(filePath, excludePattern)) continue

      const content = node.content
      const matches: SearchMatch[] = []

      if (multiLineSearch) {
        // Multi-line search: search the entire file content
        matcher.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = matcher.exec(content)) !== null && totalMatches < resultLimit) {
          matches.push({
            line: content.substring(0, m.index).split('\n').length,
            column: m.index - content.lastIndexOf('\n', m.index) + 1,
            text: content.substring(Math.max(0, m.index - 50), Math.min(content.length, m.index + m[0].length + 50)),
            matchStart: m.index - Math.max(0, m.index - 50),
            matchEnd: m.index - Math.max(0, m.index - 50) + m[0].length,
          })
          totalMatches++
          // Prevent infinite loop for zero-length matches
          if (m[0].length === 0) matcher.lastIndex++
        }
      } else {
        // Line-by-line search
        const lines = content.split('\n')
        lines.forEach((lineText, idx) => {
          if (totalMatches >= resultLimit) return
          matcher.lastIndex = 0
          let m: RegExpExecArray | null
          while ((m = matcher.exec(lineText)) !== null && totalMatches < resultLimit) {
            matches.push({
              line: idx + 1,
              column: m.index + 1,
              text: lineText,
              matchStart: m.index,
              matchEnd: m.index + m[0].length,
            })
            totalMatches++
            // Prevent infinite loop for zero-length matches
            if (m[0].length === 0) matcher.lastIndex++
          }
        })
      }

      if (matches.length > 0) {
        found.push({ file: filePath, matches })
      }
    }

    setResults(found)
    setExpandedFiles(new Set(found.map(r => r.file)))
    setIsSearching(false)

    // Add to search history
    if (query.trim()) {
      const historyItem: SearchHistoryItem = {
        query,
        replaceQuery: showReplace ? replaceQuery : undefined,
        caseSensitive,
        wholeWord,
        useRegex,
        includePattern,
        excludePattern,
        timestamp: new Date()
      }
      setSearchHistory(prev => [historyItem, ...prev.slice(0, 9)]) // Keep last 10 items
    }
  }, [buildMatcher, fileMap, includePattern, excludePattern, resultLimit, multiLineSearch, showReplace, replaceQuery, caseSensitive, wholeWord, useRegex])

  // Debounced search on query/flag changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery) { setResults([]); return }
    debounceRef.current = setTimeout(() => performSearch(searchQuery), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, caseSensitive, wholeWord, useRegex, includePattern, excludePattern, performSearch])

  const totalMatches = results.reduce((acc, r) => acc + r.matches.length, 0)

  // Replace a single match
  const handleReplaceSingle = useCallback((file: string, match: SearchMatch) => {
    const node = Object.values(fileMap).find(n => (n.path || n.name) === file)
    if (!node || !node.content) return

    let replacement = replaceQuery
    if (preserveCase && match.text.substring(match.matchStart, match.matchEnd)) {
      const original = match.text.substring(match.matchStart, match.matchEnd)
      if (original === original.toUpperCase()) {
        replacement = replacement.toUpperCase()
      } else if (original === original.toLowerCase()) {
        replacement = replacement.toLowerCase()
      } else if (original[0] === original[0].toUpperCase()) {
        replacement = replacement[0].toUpperCase() + replacement.slice(1).toLowerCase()
      }
    }

    const lines = node.content.split('\n')
    const lineIdx = match.line - 1
    if (lineIdx < 0 || lineIdx >= lines.length) return
    const line = lines[lineIdx]
    lines[lineIdx] = line.substring(0, match.matchStart) + replacement + line.substring(match.matchEnd)
    writeFile(node.id, lines.join('\n'))
    // Re-run search to refresh results
    setTimeout(() => performSearch(searchQuery), 100)
  }, [fileMap, replaceQuery, preserveCase, writeFile, performSearch, searchQuery])

  // Replace all matches in a file or all files
  const handleReplaceAll = useCallback(() => {
    const matcher = buildMatcher(searchQuery)
    if (!matcher) return

    for (const result of results) {
      const node = Object.values(fileMap).find(n => (n.path || n.name) === result.file)
      if (!node || !node.content) continue

      let newContent = node.content
      if (preserveCase) {
        // For preserve case, we need to handle each match individually
        const matches = [...node.content.matchAll(matcher)]
        let offset = 0
        for (const match of matches) {
          let replacement = replaceQuery
          const original = match[0]
          if (original === original.toUpperCase()) {
            replacement = replacement.toUpperCase()
          } else if (original === original.toLowerCase()) {
            replacement = replacement.toLowerCase()
          } else if (original[0] === original[0].toUpperCase()) {
            replacement = replacement[0].toUpperCase() + replacement.slice(1).toLowerCase()
          }

          const start = match.index + offset
          const end = start + original.length
          newContent = newContent.substring(0, start) + replacement + newContent.substring(end)
          offset += replacement.length - original.length
        }
      } else {
        newContent = node.content.replace(matcher, replaceQuery)
      }

      writeFile(node.id, newContent)
    }
    setTimeout(() => performSearch(searchQuery), 100)
  }, [buildMatcher, searchQuery, results, fileMap, replaceQuery, preserveCase, writeFile, performSearch])

  const toggleFile = (file: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(file)) next.delete(file)
      else next.add(file)
      return next
    })
  }

  const collapseAll = () => setExpandedFiles(new Set())
  const expandAll = () => setExpandedFiles(new Set(results.map((r) => r.file)))

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        {/* Search Header */}
        <div className="px-2 pt-2 pb-1 space-y-1.5">
          {/* Search Row */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 shrink-0"
              onClick={() => setShowReplace(!showReplace)}
            >
              {showReplace ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>

            <div className="flex-1 relative">
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="h-[26px] text-[12px] pl-2 pr-20 bg-input/50 border-border/40 rounded-sm focus-visible:ring-1 focus-visible:ring-primary/40"
              />
              {/* Toggle Buttons inside input */}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "w-[22px] h-[20px] rounded-sm flex items-center justify-center transition-colors",
                        caseSensitive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      )}
                      onClick={() => setCaseSensitive(!caseSensitive)}
                    >
                      <CaseSensitive className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">Match Case</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "w-[22px] h-[20px] rounded-sm flex items-center justify-center transition-colors",
                        wholeWord ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      )}
                      onClick={() => setWholeWord(!wholeWord)}
                    >
                      <WholeWord className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">Match Whole Word</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "w-[22px] h-[20px] rounded-sm flex items-center justify-center transition-colors",
                        useRegex ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      )}
                      onClick={() => setUseRegex(!useRegex)}
                    >
                      <Regex className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">Use Regular Expression</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "w-[22px] h-[20px] rounded-sm flex items-center justify-center transition-colors",
                        multiLineSearch ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      )}
                      onClick={() => setMultiLineSearch(!multiLineSearch)}
                    >
                      <Hash className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">Multi-line Search</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="w-[22px] h-[20px] rounded-sm flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">Search History</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Replace Row */}
          {showReplace && (
            <div className="flex items-center gap-1 ml-6">
              <Input
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace"
                className="h-[26px] text-[12px] pl-2 pr-16 bg-input/50 border-border/40 rounded-sm focus-visible:ring-1 focus-visible:ring-primary/40"
              />
              {/* Replace toggles */}
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "w-[22px] h-[20px] rounded-sm flex items-center justify-center transition-colors",
                        preserveCase ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      )}
                      onClick={() => setPreserveCase(!preserveCase)}
                    >
                      <CaseSensitive className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">Preserve Case</TooltipContent>
                </Tooltip>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-[26px] h-[26px] shrink-0" disabled={results.length === 0}>
                    <Replace className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">Replace (Ctrl+Shift+1)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-[26px] h-[26px] shrink-0" onClick={handleReplaceAll} disabled={results.length === 0}>
                    <Replace className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">Replace All (Ctrl+Alt+Enter)</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* File Filters */}
          <div className="flex items-center gap-1 ml-6">
            <button
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FolderOpen className="w-3 h-3" />
              files to include/exclude
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showFilters && (
            <div className="space-y-1 ml-6">
              <Input
                value={includePattern}
                onChange={(e) => setIncludePattern(e.target.value)}
                placeholder="files to include (e.g. *.tsx, src/**)"
                className="h-[24px] text-[11px] pl-2 bg-input/50 border-border/40 rounded-sm"
              />
              <Input
                value={excludePattern}
                onChange={(e) => setExcludePattern(e.target.value)}
                placeholder="files to exclude (e.g. node_modules, dist)"
                className="h-[24px] text-[11px] pl-2 bg-input/50 border-border/40 rounded-sm"
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Result limit:</span>
                <Input
                  type="number"
                  value={resultLimit}
                  onChange={(e) => setResultLimit(Math.max(1, parseInt(e.target.value) || 10000))}
                  className="h-[24px] w-20 text-[11px] pl-2 bg-input/50 border-border/40 rounded-sm"
                  min="1"
                  max="50000"
                />
              </div>
            </div>
          )}

          {/* Search History */}
          {showHistory && searchHistory.length > 0 && (
            <div className="ml-6 mt-1 p-2 bg-accent/20 rounded border">
              <div className="text-[11px] font-medium text-foreground mb-1">Recent Searches</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {searchHistory.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery(item.query)
                      setReplaceQuery(item.replaceQuery || '')
                      setCaseSensitive(item.caseSensitive)
                      setWholeWord(item.wholeWord)
                      setUseRegex(item.useRegex)
                      setIncludePattern(item.includePattern)
                      setExcludePattern(item.excludePattern)
                      setShowHistory(false)
                    }}
                    className="w-full text-left p-1 rounded hover:bg-accent/40 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <div className="font-mono truncate">{item.query}</div>
                    {item.replaceQuery && (
                      <div className="text-[9px] text-muted-foreground">→ {item.replaceQuery}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between px-3 py-1 border-y border-border/20 text-[11px] text-muted-foreground">
          <span>
            {isSearching ? (
              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Searching...</span>
            ) : searchQuery ? `${totalMatches} results in ${results.length} files` : "Type to search"}
          </span>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="w-5 h-5" onClick={expandAll} title="Expand All">
              <ChevronDown className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="w-5 h-5" onClick={collapseAll} title="Collapse All">
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="w-5 h-5" title="Refresh" onClick={() => performSearch(searchQuery)}>
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="w-5 h-5" title="Clear" onClick={() => { setSearchQuery(''); setResults([]) }}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Results List */}
        <ScrollArea className="flex-1">
          {results.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Search className="w-6 h-6 mx-auto opacity-30 mb-2" />
              <p>{searchQuery ? 'No results found' : 'Type to search across workspace files'}</p>
            </div>
          ) : (
            <div className="py-0.5">
              {results.map((result) => (
                <div key={result.file}>
                  {/* File Header */}
                  <button
                    className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-accent/20 text-[12px] transition-colors"
                    onClick={() => toggleFile(result.file)}
                  >
                    {expandedFiles.has(result.file) ? (
                      <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                    <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-foreground truncate">{result.file.split("/").pop()}</span>
                    <span className="text-muted-foreground/50 text-[10px] truncate">
                      {result.file}
                    </span>
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-auto shrink-0">
                      {result.matches.length}
                    </Badge>
                  </button>

                  {/* Match Lines */}
                  {expandedFiles.has(result.file) &&
                    result.matches.map((match, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-4 pl-9 py-0.5 hover:bg-accent/20 cursor-pointer text-[12px] transition-colors group"
                        onClick={() => openMatchInEditor(result.file, match)}
                      >
                        <span className="text-muted-foreground/40 tabular-nums w-6 text-right shrink-0 text-[10px]">
                          {match.line}
                        </span>
                        <span className="truncate text-muted-foreground">
                          {match.text.substring(0, match.matchStart)}
                          <span className="bg-primary/25 text-primary font-medium border border-primary/30 rounded-sm px-0.5">
                            {match.text.substring(match.matchStart, match.matchEnd)}
                          </span>
                          {match.text.substring(match.matchEnd)}
                        </span>
                        {showReplace && (
                          <div className="flex items-center gap-0.5 ml-auto shrink-0 opacity-0 group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-4 h-4"
                              onClick={(e) => {
                                e.stopPropagation()
                                openMatchInEditor(result.file, match)
                              }}
                              title="Open in Editor"
                            >
                              <FileText className="w-2.5 h-2.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-4 h-4" onClick={() => handleReplaceSingle(result.file, match)} title="Replace this match">
                              <Replace className="w-2.5 h-2.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-4 h-4" title="Dismiss">
                              <X className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        )}
                        {!showReplace && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-4 h-4 ml-auto shrink-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              openMatchInEditor(result.file, match)
                            }}
                            title="Open in Editor"
                          >
                            <FileText className="w-2.5 h-2.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}

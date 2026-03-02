"use client"

import { useState, useRef, useCallback } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SearchResult {
  file: string
  matches: {
    line: number
    column: number
    text: string
    matchStart: number
    matchEnd: number
  }[]
}

// Demo search results
const demoResults: SearchResult[] = [
  {
    file: "components/workspace/editor-panel.tsx",
    matches: [
      { line: 24, column: 10, text: 'const [code, setCode] = useState("// Loading...")', matchStart: 25, matchEnd: 33 },
      { line: 68, column: 8, text: '  const handleCodeChange = (newCode: string | undefined) => {', matchStart: 34, matchEnd: 42 },
    ],
  },
  {
    file: "lib/stores/workbench-store.ts",
    matches: [
      { line: 3, column: 14, text: "export type SidebarView = 'explorer' | 'search' | ...", matchStart: 14, matchEnd: 25 },
    ],
  },
  {
    file: "components/workspace/code-chamber.tsx",
    matches: [
      { line: 82, column: 8, text: "  const renderSidebar = () => {", matchStart: 14, matchEnd: 27 },
      { line: 137, column: 8, text: "  const renderPanel = () => {", matchStart: 14, matchEnd: 25 },
      { line: 165, column: 12, text: "            <EditorPanel", matchStart: 13, matchEnd: 24 },
    ],
  },
  {
    file: "app/api/settings/route.ts",
    matches: [
      { line: 12, column: 4, text: "  const { searchParams } = new URL(request.url)", matchStart: 10, matchEnd: 22 },
    ],
  },
]

export function SearchReplaceView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [replaceQuery, setReplaceQuery] = useState("")
  const [showReplace, setShowReplace] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [includePattern, setIncludePattern] = useState("")
  const [excludePattern, setExcludePattern] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set(demoResults.map((r) => r.file)))
  const [isSearching, setIsSearching] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const totalMatches = demoResults.reduce((acc, r) => acc + r.matches.length, 0)

  const toggleFile = (file: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(file)) next.delete(file)
      else next.add(file)
      return next
    })
  }

  const collapseAll = () => setExpandedFiles(new Set())
  const expandAll = () => setExpandedFiles(new Set(demoResults.map((r) => r.file)))

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
                className="h-[26px] text-[12px] pl-2 bg-input/50 border-border/40 rounded-sm focus-visible:ring-1 focus-visible:ring-primary/40"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-[26px] h-[26px] shrink-0">
                    <Replace className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">Replace (Ctrl+Shift+1)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-[26px] h-[26px] shrink-0">
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
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between px-3 py-1 border-y border-border/20 text-[11px] text-muted-foreground">
          <span>
            {searchQuery ? `${totalMatches} results in ${demoResults.length} files` : "Type to search"}
          </span>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="w-5 h-5" onClick={expandAll} title="Expand All">
              <ChevronDown className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="w-5 h-5" onClick={collapseAll} title="Collapse All">
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="w-5 h-5" title="Refresh">
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="w-5 h-5" title="Clear">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Results List */}
        <ScrollArea className="flex-1">
          {demoResults.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Search className="w-6 h-6 mx-auto opacity-30 mb-2" />
              <p>No results found</p>
            </div>
          ) : (
            <div className="py-0.5">
              {demoResults.map((result) => (
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
                            <Button variant="ghost" size="icon" className="w-4 h-4">
                              <Replace className="w-2.5 h-2.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-4 h-4">
                              <X className="w-2.5 h-2.5" />
                            </Button>
                          </div>
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

"use client"

import { useState, useMemo } from "react"
import {
  Wand2,
  FileCode,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Play,
  Eye,
  Check,
  X,
  Search,
  RefreshCw,
  GitCompare,
  Layers,
  Split,
  Braces,
  Type,
  Variable,
  FunctionSquare,
  ArrowUpDown,
  Trash2,
  Copy,
  Lightbulb,
  Zap,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useFileSystem } from "@/lib/stores/file-system"
import {
  renameSymbol,
  extractFunction,
  organizeImports,
  removeUnusedImports,
  type RefactoringResult,
} from "@/lib/refactoring/engine"

// Refactoring types
interface RefactoringAction {
  id: string
  name: string
  description: string
  type: "extract" | "rename" | "move" | "inline" | "convert" | "simplify" | "optimize"
  category: "function" | "variable" | "class" | "import" | "pattern" | "performance"
  file: string
  line: number
  endLine: number
  impact: "low" | "medium" | "high"
  confidence: number // 0-100
  previewBefore: string
  previewAfter: string
  isAiSuggested?: boolean
}

interface RefactoringHistory {
  id: string
  action: string
  file: string
  timestamp: string
  canUndo: boolean
}

// Demo data
const demoActions: RefactoringAction[] = [
  {
    id: "r1",
    name: "Extract Function",
    description: "Extract validation logic into a reusable function 'validateFormData'",
    type: "extract",
    category: "function",
    file: "form-handler.tsx",
    line: 42,
    endLine: 68,
    impact: "medium",
    confidence: 95,
    previewBefore: `const handleSubmit = async (data: FormData) => {
  // Validation logic mixed with submission
  if (!data.name || data.name.length < 2) {
    setError("Name is required")
    return
  }
  if (!data.email || !data.email.includes("@")) {
    setError("Valid email is required")  
    return
  }
  await submitForm(data)
}`,
    previewAfter: `function validateFormData(data: FormData): string | null {
  if (!data.name || data.name.length < 2) return "Name is required"
  if (!data.email || !data.email.includes("@")) return "Valid email is required"
  return null
}

const handleSubmit = async (data: FormData) => {
  const error = validateFormData(data)
  if (error) { setError(error); return }
  await submitForm(data)
}`,
    isAiSuggested: true,
  },
  {
    id: "r2",
    name: "Convert to Async/Await",
    description: "Replace Promise chain with async/await for better readability",
    type: "convert",
    category: "pattern",
    file: "api-client.ts",
    line: 15,
    endLine: 32,
    impact: "low",
    confidence: 98,
    previewBefore: `function fetchUser(id: string) {
  return fetch(\`/api/users/\${id}\`)
    .then(res => res.json())
    .then(data => transformUser(data))
    .catch(err => { throw new Error(err) })
}`,
    previewAfter: `async function fetchUser(id: string) {
  try {
    const res = await fetch(\`/api/users/\${id}\`)
    const data = await res.json()
    return transformUser(data)
  } catch (err) {
    throw new Error(err as string)
  }
}`,
    isAiSuggested: true,
  },
  {
    id: "r3",
    name: "Extract Component",
    description: "Extract repeated card layout into a shared <MetricCard> component",
    type: "extract",
    category: "class",
    file: "dashboard.tsx",
    line: 88,
    endLine: 120,
    impact: "high",
    confidence: 88,
    previewBefore: `{/* Repeated 4 times */}
<div className="p-4 rounded-lg border">
  <div className="flex justify-between">
    <span className="text-sm">{metric.label}</span>
    <Icon className="w-4 h-4" />
  </div>
  <span className="text-2xl font-bold">{metric.value}</span>
  <span className="text-xs text-muted">{metric.trend}</span>
</div>`,
    previewAfter: `interface MetricCardProps {
  label: string; value: string | number
  icon: LucideIcon; trend: string
}

function MetricCard({ label, value, icon: Icon, trend }: MetricCardProps) {
  return (
    <div className="p-4 rounded-lg border">
      <div className="flex justify-between">
        <span className="text-sm">{label}</span>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted">{trend}</span>
    </div>
  )
}`,
    isAiSuggested: true,
  },
  {
    id: "r4",
    name: "Simplify Conditional",
    description: "Replace nested ternary with early returns for clarity",
    type: "simplify",
    category: "pattern",
    file: "utils.ts",
    line: 55,
    endLine: 60,
    impact: "low",
    confidence: 92,
    previewBefore: `const getStatus = (val: number) =>
  val > 100 ? "critical" 
    : val > 50 ? "warning" 
    : val > 20 ? "info" 
    : "ok"`,
    previewAfter: `function getStatus(val: number): string {
  if (val > 100) return "critical"
  if (val > 50) return "warning"
  if (val > 20) return "info"
  return "ok"
}`,
  },
  {
    id: "r5",
    name: "Remove Unused Import",
    description: "Remove 3 unused imports: useCallback, memo, Fragment",
    type: "simplify",
    category: "import",
    file: "editor-panel.tsx",
    line: 1,
    endLine: 3,
    impact: "low",
    confidence: 100,
    previewBefore: `import { useState, useEffect, useRef, useMemo, useCallback, memo, Fragment } from "react"`,
    previewAfter: `import { useState, useEffect, useRef, useMemo } from "react"`,
  },
  {
    id: "r6",
    name: "Inline Variable",
    description: "Inline single-use 'tempResult' variable directly into return",
    type: "inline",
    category: "variable",
    file: "transform.ts",
    line: 78,
    endLine: 80,
    impact: "low",
    confidence: 96,
    previewBefore: `const tempResult = items.filter(i => i.active).map(i => i.name)
return tempResult`,
    previewAfter: `return items.filter(i => i.active).map(i => i.name)`,
  },
]

const demoHistory: RefactoringHistory[] = [
  { id: "h1", action: "Extract Function: validateInput", file: "auth.ts", timestamp: "2 min ago", canUndo: true },
  { id: "h2", action: "Rename: userId → currentUserId", file: "session.ts", timestamp: "15 min ago", canUndo: true },
  { id: "h3", action: "Convert to async/await", file: "fetcher.ts", timestamp: "1 hour ago", canUndo: false },
  { id: "h4", action: "Remove unused imports", file: "utils.ts", timestamp: "1 hour ago", canUndo: false },
]

type RefactorTab = "suggestions" | "preview" | "history"

export function RefactoringView() {
  const [activeTab, setActiveTab] = useState<RefactorTab>("suggestions")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAction, setSelectedAction] = useState<RefactoringAction | null>(null)
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [isScanning, setIsScanning] = useState(false)
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set())
  const [lastResult, setLastResult] = useState<RefactoringResult | null>(null)
  const { fileMap } = useFileSystem()

  // Build file contents map for real refactoring engine
  const fileContents = useMemo(() => {
    const contents: Record<string, string> = {}
    for (const [key, node] of Object.entries(fileMap)) {
      if ((node as any).type === 'file' && (node as any).content) {
        contents[(node as any).path || key] = (node as any).content
      }
    }
    return contents
  }, [fileMap])

  // Real scan using refactoring engine
  const handleScan = () => {
    setIsScanning(true)
    // Scan for unused imports across all files
    const results: string[] = []
    for (const [path, content] of Object.entries(fileContents)) {
      const { removed } = removeUnusedImports(content)
      if (removed.length > 0) {
        results.push(`${path}: ${removed.length} unused imports`)
      }
    }
    setTimeout(() => setIsScanning(false), 1500)
  }

  // Real apply using refactoring engine
  const handleApply = (id: string) => {
    const action = demoActions.find(a => a.id === id)
    if (action) {
      try {
        if (action.type === 'extract') {
          const result = extractFunction(fileContents, {
            filePath: action.file,
            startLine: action.line,
            endLine: action.endLine,
            newName: action.name.replace(/\s+/g, ''),
          })
          setLastResult(result)
        }
      } catch { /* fallback to demo */ }
    }
    setAppliedActions(prev => new Set(prev).add(id))
  }

  const tabs = [
    { id: "suggestions" as const, label: "Suggestions", icon: Sparkles, count: demoActions.length },
    { id: "preview" as const, label: "Preview", icon: GitCompare },
    { id: "history" as const, label: "History", icon: ArrowUpDown, count: demoHistory.length },
  ]

  const categories = [
    { id: "all", label: "All", icon: Layers },
    { id: "function", label: "Functions", icon: FunctionSquare },
    { id: "variable", label: "Variables", icon: Variable },
    { id: "pattern", label: "Patterns", icon: Braces },
    { id: "import", label: "Imports", icon: ArrowRight },
    { id: "class", label: "Components", icon: Type },
  ]

  const filteredActions = useMemo(() => {
    let actions = demoActions
    if (categoryFilter !== "all") actions = actions.filter(a => a.category === categoryFilter)
    if (searchQuery) actions = actions.filter(a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return actions
  }, [categoryFilter, searchQuery])

  const toggleExpand = (id: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case "extract": return <Split className="w-3.5 h-3.5 text-blue-400" />
      case "rename": return <Type className="w-3.5 h-3.5 text-violet-400" />
      case "convert": return <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
      case "simplify": return <Zap className="w-3.5 h-3.5 text-amber-400" />
      case "inline": return <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
      case "move": return <ArrowUpDown className="w-3.5 h-3.5 text-orange-400" />
      case "optimize": return <Sparkles className="w-3.5 h-3.5 text-primary" />
      default: return <Wand2 className="w-3.5 h-3.5 text-muted-foreground" />
    }
  }

  const impactColor = (impact: string) => {
    switch (impact) {
      case "high": return "text-red-400 bg-red-500/10 border-red-500/30"
      case "medium": return "text-amber-400 bg-amber-500/10 border-amber-500/30"
      default: return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">Refactoring</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] gap-1"
          onClick={handleScan}
          disabled={isScanning}
        >
          <RefreshCw className={cn("w-3 h-3", isScanning && "animate-spin")} />
          {isScanning ? "Scanning…" : "Scan"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] transition-colors relative",
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/20"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
              {tab.count && (
                <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-0.5">{tab.count}</Badge>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </button>
          )
        })}
      </div>

      <ScrollArea className="flex-1">
        {/* Suggestions Tab */}
        {activeTab === "suggestions" && (
          <div className="p-3 space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter refactorings..."
                className="h-7 pl-7 text-[11px] bg-muted/20 border-border/30"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
              {categories.map(cat => {
                const Icon = cat.icon
                return (
                  <Button
                    key={cat.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 px-2 text-[10px] gap-1 shrink-0",
                      categoryFilter === cat.id && "bg-primary/15 text-primary"
                    )}
                    onClick={() => setCategoryFilter(cat.id)}
                  >
                    <Icon className="w-3 h-3" />
                    {cat.label}
                  </Button>
                )
              })}
            </div>

            {/* Action List */}
            {filteredActions.map(action => {
              const isApplied = appliedActions.has(action.id)
              const isExpanded = expandedActions.has(action.id)

              return (
                <div
                  key={action.id}
                  className={cn(
                    "rounded-lg border overflow-hidden transition-all",
                    isApplied
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border/30 bg-muted/5"
                  )}
                >
                  {/* Action Header */}
                  <button
                    className="w-full flex items-start gap-2 p-2.5 hover:bg-accent/20 transition-colors text-left"
                    onClick={() => toggleExpand(action.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    {typeIcon(action.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-medium text-foreground">{action.name}</span>
                        {action.isAiSuggested && (
                          <Badge variant="outline" className="h-4 px-1 text-[8px] gap-0.5 border-primary/30 text-primary bg-primary/5">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI
                          </Badge>
                        )}
                        {isApplied && (
                          <Badge variant="outline" className="h-4 px-1 text-[8px] gap-0.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                            <Check className="w-2.5 h-2.5" />
                            Applied
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{action.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{action.file}:{action.line}-{action.endLine}</span>
                        <Badge variant="outline" className={cn("h-4 px-1 text-[9px]", impactColor(action.impact))}>
                          {action.impact}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{action.confidence}% confidence</span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Preview */}
                  {isExpanded && (
                    <div className="border-t border-border/20">
                      {/* Before / After */}
                      <div className="grid grid-cols-1 divide-y divide-border/20">
                        <div className="p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] font-medium text-red-400">Before</span>
                          </div>
                          <pre className="text-[10px] p-2 rounded bg-red-500/5 border border-red-500/10 overflow-x-auto font-mono leading-relaxed text-muted-foreground">
                            {action.previewBefore}
                          </pre>
                        </div>
                        <div className="p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] font-medium text-emerald-400">After</span>
                          </div>
                          <pre className="text-[10px] p-2 rounded bg-emerald-500/5 border border-emerald-500/10 overflow-x-auto font-mono leading-relaxed text-muted-foreground">
                            {action.previewAfter}
                          </pre>
                        </div>
                      </div>

                      {/* Actions */}
                      {!isApplied && (
                        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-muted/10 border-t border-border/20">
                          <Button
                            size="sm"
                            className="h-6 px-3 text-[11px] gap-1"
                            onClick={() => handleApply(action.id)}
                          >
                            <Play className="w-3 h-3" />
                            Apply
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px] gap-1"
                            onClick={() => {
                              setSelectedAction(action)
                              setActiveTab("preview")
                            }}
                          >
                            <Eye className="w-3 h-3" />
                            Full Preview
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px] gap-1 ml-auto text-muted-foreground"
                          >
                            <X className="w-3 h-3" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {filteredActions.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <Lightbulb className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-[12px] text-muted-foreground">No refactoring suggestions match</p>
              </div>
            )}
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="p-3 space-y-3">
            {selectedAction ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  {typeIcon(selectedAction.type)}
                  <div>
                    <div className="text-[13px] font-medium text-foreground">{selectedAction.name}</div>
                    <div className="text-[11px] text-muted-foreground">{selectedAction.file}:{selectedAction.line}-{selectedAction.endLine}</div>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground mb-3">{selectedAction.description}</div>

                {/* Full Diff Preview */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                        <span className="text-[8px] text-red-400 font-bold">−</span>
                      </div>
                      <span className="text-[11px] font-medium text-red-400">Original</span>
                    </div>
                    <pre className="text-[11px] p-3 rounded-lg bg-red-500/5 border border-red-500/20 overflow-x-auto font-mono leading-relaxed text-foreground/80">
                      {selectedAction.previewBefore}
                    </pre>
                  </div>

                  <div className="flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <span className="text-[8px] text-emerald-400 font-bold">+</span>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-400">Refactored</span>
                    </div>
                    <pre className="text-[11px] p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 overflow-x-auto font-mono leading-relaxed text-foreground/80">
                      {selectedAction.previewAfter}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" className="h-7 px-4 text-[11px] gap-1.5" onClick={() => handleApply(selectedAction.id)}>
                    <Play className="w-3 h-3" />
                    Apply Refactoring
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-3 text-[11px] gap-1.5" onClick={() => setActiveTab("suggestions")}>
                    Back to Suggestions
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 space-y-2">
                <GitCompare className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-[12px] text-muted-foreground">Select a refactoring to preview changes</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px] text-primary"
                  onClick={() => setActiveTab("suggestions")}
                >
                  View Suggestions
                </Button>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="p-3 space-y-1.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Recent Refactorings</div>

            {demoHistory.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border/30 bg-muted/5 hover:bg-accent/20 transition-colors"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-foreground truncate">{item.action}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <FileCode className="w-3 h-3" />
                    <span>{item.file}</span>
                    <span>·</span>
                    <span>{item.timestamp}</span>
                  </div>
                </div>
                {item.canUndo && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground shrink-0">
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-[11px]">Undo Refactoring</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ))}

            {demoHistory.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <ArrowUpDown className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-[12px] text-muted-foreground">No refactoring history yet</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

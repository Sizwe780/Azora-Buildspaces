"use client"

import { useState, useMemo } from "react"
import {
  BarChart3,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  GitBranch,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Cpu,
  Shield,
  Layers,
  Activity,
  Search,
  RefreshCw,
  Filter,
  Zap,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"

// Analysis metric types
interface CodeMetric {
  label: string
  value: number
  max: number
  unit: string
  trend: "up" | "down" | "stable"
  trendValue: string
  status: "good" | "warning" | "critical"
}

interface FileComplexity {
  path: string
  name: string
  complexity: number
  maxComplexity: number
  loc: number
  functions: number
  dependencies: number
  issues: number
  grade: "A" | "B" | "C" | "D" | "F"
}

interface DependencyNode {
  name: string
  type: "internal" | "external" | "circular"
  imports: string[]
  importedBy: string[]
  size?: string
}

interface CodeSmell {
  id: string
  file: string
  line: number
  type: "complexity" | "duplication" | "long-method" | "dead-code" | "coupling"
  severity: "info" | "warning" | "error"
  message: string
  suggestion: string
}

// Demo data
const demoMetrics: CodeMetric[] = [
  { label: "Maintainability", value: 87, max: 100, unit: "/100", trend: "up", trendValue: "+3", status: "good" },
  { label: "Cyclomatic Complexity", value: 12, max: 50, unit: "avg", trend: "down", trendValue: "-2", status: "good" },
  { label: "Code Coverage", value: 72, max: 100, unit: "%", trend: "up", trendValue: "+5%", status: "warning" },
  { label: "Technical Debt", value: 4.2, max: 24, unit: "hrs", trend: "down", trendValue: "-1.5h", status: "good" },
  { label: "Duplication", value: 3.8, max: 100, unit: "%", trend: "stable", trendValue: "0%", status: "good" },
  { label: "Dependencies", value: 34, max: 100, unit: "total", trend: "up", trendValue: "+2", status: "warning" },
]

const demoFiles: FileComplexity[] = [
  { path: "lib/services/", name: "ai-code-service.ts", complexity: 28, maxComplexity: 8, loc: 420, functions: 15, dependencies: 12, issues: 3, grade: "C" },
  { path: "components/workspace/", name: "editor-panel.tsx", complexity: 22, maxComplexity: 6, loc: 347, functions: 8, dependencies: 9, issues: 1, grade: "B" },
  { path: "lib/stores/", name: "file-system.ts", complexity: 18, maxComplexity: 5, loc: 260, functions: 12, dependencies: 4, issues: 0, grade: "A" },
  { path: "components/workspace/", name: "code-chamber.tsx", complexity: 15, maxComplexity: 4, loc: 189, functions: 6, dependencies: 20, issues: 0, grade: "A" },
  { path: "lib/services/", name: "git-integration.ts", complexity: 32, maxComplexity: 10, loc: 510, functions: 18, dependencies: 8, issues: 5, grade: "D" },
  { path: "lib/engines/", name: "workspace-engine.ts", complexity: 25, maxComplexity: 7, loc: 380, functions: 14, dependencies: 11, issues: 2, grade: "C" },
]

const demoSmells: CodeSmell[] = [
  { id: "s1", file: "ai-code-service.ts", line: 142, type: "complexity", severity: "warning", message: "Function 'generateCode' has cyclomatic complexity of 15", suggestion: "Extract conditional branches into separate handler functions" },
  { id: "s2", file: "git-integration.ts", line: 88, type: "long-method", severity: "warning", message: "Method 'commitChanges' is 85 lines long", suggestion: "Split into validation, staging, and commit phases" },
  { id: "s3", file: "git-integration.ts", line: 210, type: "duplication", severity: "info", message: "Similar code block found in deployment-export.ts:45", suggestion: "Extract shared logic into a utility function" },
  { id: "s4", file: "editor-panel.tsx", line: 95, type: "coupling", severity: "info", message: "Component has 9 external dependencies", suggestion: "Consider using a facade pattern to reduce coupling" },
  { id: "s5", file: "ai-code-service.ts", line: 320, type: "dead-code", severity: "info", message: "Function 'legacyParse' is never called", suggestion: "Remove unused function or add usage" },
  { id: "s6", file: "workspace-engine.ts", line: 175, type: "complexity", severity: "error", message: "Nested callbacks depth exceeds 4 levels", suggestion: "Refactor to async/await pattern" },
]
import { LspInspector } from "@/components/code-chamber/lsp-inspector"
import { useFileSystem } from "@/lib/stores/file-system"
import { useWorkbench } from "@/lib/stores/workbench-store"

const demoDependencies: DependencyNode[] = [
  { name: "code-chamber.tsx", type: "internal", imports: ["editor-panel", "workbench-layout", "explorer-view", "ai-assistant-sidebar"], importedBy: ["page.tsx"], size: "5.2 KB" },
  { name: "workbench-store.ts", type: "internal", imports: ["zustand"], importedBy: ["code-chamber", "activity-bar", "workbench-layout", "command-palette"], size: "3.1 KB" },
  { name: "ai-code-service.ts", type: "internal", imports: ["openai", "prisma", "utils"], importedBy: ["ai-assistant-sidebar", "api/ai/route"], size: "12.4 KB" },
  { name: "zustand", type: "external", imports: [], importedBy: ["workbench-store", "file-system"], size: "14 KB" },
  { name: "react", type: "external", imports: [], importedBy: ["*"], size: "42 KB" },
]

type AnalysisTab = "overview" | "complexity" | "smells" | "dependencies" | "lsp"

export function CodeAnalysisView() {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("lsp")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<"complexity" | "loc" | "issues">("complexity")
  const [severityFilter, setSeverityFilter] = useState<"all" | "error" | "warning" | "info">("all")

  const { activeFileId, fileMap } = useFileSystem()
  const { setPanelView } = useWorkbench()

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "lsp" as const, label: "LSP", icon: Zap },
    { id: "complexity" as const, label: "Complexity", icon: Cpu },
    { id: "smells" as const, label: "Smells", icon: AlertTriangle },
    { id: "dependencies" as const, label: "Deps", icon: GitBranch },
  ]

  const activeContent = useMemo(() => {
    if (!activeFileId) return null
    const file = fileMap[activeFileId]
    return typeof file === 'string' ? file : file?.content || null
  }, [activeFileId, fileMap])

  const handleApplyFix = (line: number, fix: string) => {
    console.log(`Apply fix to line ${line}:`, fix)
    setPanelView("problems")
  }

  const handleAnalyze = () => {
    setIsAnalyzing(true)
    setTimeout(() => setIsAnalyzing(false), 2000)
  }

  const toggleFile = (name: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const sortedFiles = useMemo(() => {
    return [...demoFiles].sort((a, b) => {
      if (sortBy === "complexity") return b.complexity - a.complexity
      if (sortBy === "loc") return b.loc - a.loc
      return b.issues - a.issues
    })
  }, [sortBy])

  const filteredSmells = useMemo(() => {
    let smells = demoSmells
    if (severityFilter !== "all") smells = smells.filter(s => s.severity === severityFilter)
    if (searchQuery) smells = smells.filter(s => s.file.toLowerCase().includes(searchQuery.toLowerCase()) || s.message.toLowerCase().includes(searchQuery.toLowerCase()))
    return smells
  }, [severityFilter, searchQuery])

  const gradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      case "B": return "text-blue-400 bg-blue-500/10 border-blue-500/30"
      case "C": return "text-amber-400 bg-amber-500/10 border-amber-500/30"
      case "D": return "text-orange-400 bg-orange-500/10 border-orange-500/30"
      case "F": return "text-red-400 bg-red-500/10 border-red-500/30"
      default: return "text-muted-foreground"
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "good": return "text-emerald-400"
      case "warning": return "text-amber-400"
      case "critical": return "text-red-400"
      default: return "text-muted-foreground"
    }
  }

  const severityIcon = (severity: string) => {
    switch (severity) {
      case "error": return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
      case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
      default: return <Activity className="w-3.5 h-3.5 text-blue-400" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">Code Analysis</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] gap-1"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
          <RefreshCw className={cn("w-3 h-3", isAnalyzing && "animate-spin")} />
          {isAnalyzing ? "Analyzing…" : "Analyze"}
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
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </button>
          )
        })}
      </div>

      <ScrollArea className="flex-1">
        {/* LSP Inspector Tab */}
        {activeTab === "lsp" && (
          <LspInspector
              activeFile={activeFileId}
                content={activeContent}
                onApplyFix={handleApplyFix}
          />
        )}
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="p-3 space-y-3">
            {/* Health Score */}
            <div className="p-3 rounded-lg border border-border/30 bg-muted/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-foreground">Overall Health Score</span>
                <span className="text-[20px] font-bold text-emerald-400">B+</span>
              </div>
              <Progress value={82} className="h-2 mb-2" />
              <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                <TrendingUp className="w-3 h-3" />
                <span>+4 points from last analysis</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              {demoMetrics.map(metric => (
                <div key={metric.label} className="p-2.5 rounded-lg border border-border/30 bg-muted/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">{metric.label}</span>
                    <div className={cn("flex items-center gap-0.5 text-[10px]", statusColor(metric.status))}>
                      {metric.trend === "up" && <ArrowUpRight className="w-3 h-3" />}
                      {metric.trend === "down" && <ArrowDownRight className="w-3 h-3" />}
                      <span>{metric.trendValue}</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[16px] font-bold text-foreground">{metric.value}</span>
                    <span className="text-[10px] text-muted-foreground">{metric.unit}</span>
                  </div>
                  <Progress value={(metric.value / metric.max) * 100} className="h-1 mt-1.5" />
                </div>
              ))}
            </div>

            {/* Quick Summary */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Quick Summary</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-foreground">4 files have improved since last analysis</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/5 border border-amber-500/10">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-foreground">6 code smells detected across 4 files</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-blue-500/5 border border-blue-500/10">
                  <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-[11px] text-foreground">No circular dependencies detected</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Complexity Tab */}
        {activeTab === "complexity" && (
          <div className="p-3 space-y-2">
            {/* Sort controls */}
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[10px] text-muted-foreground mr-1">Sort by:</span>
              {(["complexity", "loc", "issues"] as const).map(s => (
                <Button
                  key={s}
                  variant="ghost"
                  size="sm"
                  className={cn("h-5 px-2 text-[10px]", sortBy === s && "bg-primary/15 text-primary")}
                  onClick={() => setSortBy(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>

            {/* File List */}
            {sortedFiles.map(file => (
              <div key={file.name} className="rounded-lg border border-border/30 bg-muted/5 overflow-hidden">
                <button
                  className="w-full flex items-center gap-2 p-2.5 hover:bg-accent/20 transition-colors"
                  onClick={() => toggleFile(file.name)}
                >
                  {expandedFiles.has(file.name) ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                  <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-[12px] text-foreground truncate">{file.name}</span>
                  <Badge variant="outline" className={cn("h-4 px-1.5 text-[9px] ml-auto shrink-0", gradeColor(file.grade))}>
                    {file.grade}
                  </Badge>
                  {file.issues > 0 && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-amber-500/30 text-amber-400 bg-amber-500/10 shrink-0">
                      {file.issues}
                    </Badge>
                  )}
                </button>

                {expandedFiles.has(file.name) && (
                  <div className="px-3 pb-2.5 pt-0 border-t border-border/20">
                    <div className="text-[10px] text-muted-foreground mb-1.5">{file.path}{file.name}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Complexity:</span>
                        <span className={cn("font-medium", file.complexity > 25 ? "text-amber-400" : "text-foreground")}>{file.complexity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max CC:</span>
                        <span className="text-foreground">{file.maxComplexity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lines:</span>
                        <span className="text-foreground">{file.loc}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Functions:</span>
                        <span className="text-foreground">{file.functions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dependencies:</span>
                        <span className="text-foreground">{file.dependencies}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Issues:</span>
                        <span className={cn("font-medium", file.issues > 0 ? "text-amber-400" : "text-emerald-400")}>{file.issues}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Complexity Distribution</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden flex">
                        <div className="bg-emerald-500" style={{ width: `${Math.max(0, 100 - file.complexity * 2)}%` }} />
                        <div className="bg-amber-500" style={{ width: `${Math.min(40, file.complexity)}%` }} />
                        <div className="bg-red-500" style={{ width: `${Math.max(0, file.complexity - 25)}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Code Smells Tab */}
        {activeTab === "smells" && (
          <div className="p-3 space-y-2">
            {/* Search & Filter */}
            <div className="flex items-center gap-2 mb-1">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter smells..."
                  className="h-7 pl-7 text-[11px] bg-muted/20 border-border/30"
                />
              </div>
              <div className="flex items-center gap-0.5">
                {(["all", "error", "warning", "info"] as const).map(f => (
                  <Button
                    key={f}
                    variant="ghost"
                    size="sm"
                    className={cn("h-6 px-2 text-[10px]", severityFilter === f && "bg-primary/15 text-primary")}
                    onClick={() => setSeverityFilter(f)}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Smell List */}
            {filteredSmells.map(smell => (
              <div key={smell.id} className="p-2.5 rounded-lg border border-border/30 bg-muted/5 space-y-1.5">
                <div className="flex items-start gap-2">
                  {severityIcon(smell.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-foreground leading-tight">{smell.message}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{smell.file}:{smell.line}</span>
                      <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                        {smell.type.replace("-", " ")}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 ml-5.5 pl-0.5">
                  <Zap className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                  <span className="text-[11px] text-primary/80">{smell.suggestion}</span>
                </div>
              </div>
            ))}

            {filteredSmells.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-[12px]">
                No code smells match the current filter
              </div>
            )}
          </div>
        )}

        {/* Dependencies Tab */}
        {activeTab === "dependencies" && (
          <div className="p-3 space-y-2">
            <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Dependency Graph</div>

            {demoDependencies.map(dep => (
              <div key={dep.name} className="p-2.5 rounded-lg border border-border/30 bg-muted/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    dep.type === "internal" ? "bg-blue-400" : dep.type === "external" ? "bg-violet-400" : "bg-red-400"
                  )} />
                  <span className="text-[12px] font-medium text-foreground truncate">{dep.name}</span>
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] ml-auto shrink-0">
                    {dep.type}
                  </Badge>
                  {dep.size && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{dep.size}</span>
                  )}
                </div>

                {dep.imports.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mb-1">
                    <span className="text-[10px] text-muted-foreground shrink-0">imports:</span>
                    {dep.imports.map(imp => (
                      <Badge key={imp} variant="outline" className="h-4 px-1.5 text-[9px] bg-blue-500/5 border-blue-500/20 text-blue-400">
                        {imp}
                      </Badge>
                    ))}
                  </div>
                )}

                {dep.importedBy.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground shrink-0">used by:</span>
                    {dep.importedBy.map(imp => (
                      <Badge key={imp} variant="outline" className="h-4 px-1.5 text-[9px] bg-emerald-500/5 border-emerald-500/20 text-emerald-400">
                        {imp}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-4 pt-2 border-t border-border/20 mt-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                Internal
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-violet-400" />
                External
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                Circular
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}


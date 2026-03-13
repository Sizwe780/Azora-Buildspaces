"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FlaskConical, Play, Square, RotateCw, Clock, CheckCircle2, XCircle,
  AlertTriangle, Loader2, ChevronRight, ChevronDown, FileCode, Eye,
  BarChart3, Filter, Settings2, Search, Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface TestResult {
  id: string
  name: string
  status: 'passed' | 'failed' | 'skipped' | 'running' | 'pending'
  duration?: number
  error?: string
  file?: string
  line?: number
}

interface TestSuite {
  name: string
  file: string
  tests: TestResult[]
  expanded: boolean
}

interface TestRun {
  id: string
  framework: string
  status: 'running' | 'completed' | 'cancelled' | 'failed'
  startedAt: number
  completedAt?: number
  results: { passed: number; failed: number; skipped: number; total: number }
  coverage?: { lines: number; branches: number; functions: number; statements: number }
  suites?: Array<{ name: string; file: string; tests: TestResult[] }>
}

interface Framework {
  id: string
  name: string
  languages: string[]
  testPattern: string
}

interface QACapabilities {
  watchMode?: {
    supported?: boolean
    reason?: string
    pollingIntervalMs?: number
  }
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  passed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  skipped: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/10' },
  completed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
  cancelled: { icon: Square, color: 'text-muted-foreground', bg: 'bg-muted/10' },
}

export function QATestingView() {
  const [tab, setTab] = useState('runner')
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [selectedFramework, setSelectedFramework] = useState('')
  const [testRuns, setTestRuns] = useState<TestRun[]>([])
  const [currentRun, setCurrentRun] = useState<TestRun | null>(null)
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isRunning, setIsRunning] = useState(false)
  const [watchMode, setWatchMode] = useState(false)
  const [watchId, setWatchId] = useState<string | null>(null)
  const [capabilities, setCapabilities] = useState<QACapabilities>({})
  const [watchError, setWatchError] = useState<string | null>(null)

  useEffect(() => {
    fetchFrameworks()
    fetchRecentRuns()
    fetchCapabilities()
  }, [])

  const fetchCapabilities = async () => {
    try {
      const res = await fetch('/api/qa-testing?action=capabilities')
      const data = await res.json()
      setCapabilities(data.capabilities || {})
    } catch {
      setCapabilities({ watchMode: { supported: false, reason: 'Unable to load QA capabilities' } })
    }
  }

  const fetchFrameworks = async () => {
    try {
      const res = await fetch('/api/qa-testing?action=frameworks')
      const data = await res.json()
      setFrameworks(data.frameworks || [])
      if (data.frameworks?.length > 0 && !selectedFramework) {
        setSelectedFramework(data.frameworks[0].id)
      }
    } catch (err) { console.error('Failed to fetch frameworks:', err) }
  }

  const fetchRecentRuns = async () => {
    try {
      const res = await fetch('/api/qa-testing?action=runs&limit=10')
      const data = await res.json()
      setTestRuns(data.runs || [])
    } catch (err) { console.error('Failed to fetch runs:', err) }
  }

  const runTests = async () => {
    if (!selectedFramework) return
    setIsRunning(true)
    try {
      const res = await fetch('/api/qa-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run',
          config: {
            framework: selectedFramework,
            testDir: 'tests',
            pattern: '**/*.test.*',
            coverage: true,
            watch: false,
            parallel: true,
            timeout: 120000,
            env: {},
          }
        })
      })
      const data = await res.json()
      if (data.run) {
        const normalized = normalizeRun(data.run)
        setCurrentRun(normalized)
        buildSuites(normalized)
        fetchRecentRuns()
      }
    } catch (err) { console.error('Failed to run tests:', err) }
    finally { setIsRunning(false) }
  }

  const cancelRun = async () => {
    if (!currentRun) return
    try {
      await fetch('/api/qa-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', runId: currentRun.id })
      })
      setIsRunning(false)
      fetchRecentRuns()
    } catch (err) { console.error('Failed to cancel run:', err) }
  }

  const toggleWatch = async () => {
    const watchSupported = capabilities.watchMode?.supported === true
    if (!watchSupported) {
      setWatchError(capabilities.watchMode?.reason || 'Watch mode is unavailable')
      return
    }

    if (watchMode && watchId) {
      await fetch('/api/qa-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unwatch', watchId })
      })
      setWatchMode(false)
      setWatchId(null)
      setWatchError(null)
    } else {
      const res = await fetch('/api/qa-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'watch',
          config: {
            framework: selectedFramework,
            testDir: 'tests',
            pattern: '**/*.test.*',
            coverage: false,
            watch: true,
            parallel: true,
            timeout: 120000,
            env: {},
          }
        })
      })
      const data = await res.json()
      if (res.ok && data.watchId) {
        setWatchId(data.watchId)
        setWatchMode(true)
        setWatchError(null)
      } else {
        if (data?.capabilities) {
          setCapabilities(data.capabilities)
        }
        setWatchMode(false)
        setWatchId(null)
        setWatchError(data?.error || 'Failed to start watch mode')
      }
    }
  }

  const normalizeRun = (run: any): TestRun => {
    const suites = Array.isArray(run?.suites)
      ? run.suites.map((suite: any) => ({
          name: suite?.name || suite?.file || 'suite',
          file: suite?.file || suite?.name || 'unknown',
          tests: Array.isArray(suite?.tests)
            ? suite.tests.map((test: any, index: number) => ({
                id: test?.id || `${suite?.name || 'suite'}-${index}`,
                name: test?.name || 'test',
                status: test?.status || 'pending',
                duration: typeof test?.duration === 'number' ? test.duration : undefined,
                error: test?.error,
                file: test?.file || suite?.file,
                line: typeof test?.line === 'number' ? test.line : undefined,
              }))
            : [],
        }))
      : []

    return {
      id: run?.id,
      framework: run?.framework,
      status: run?.status === 'passed' ? 'completed' : run?.status === 'error' ? 'failed' : run?.status,
      startedAt: run?.startedAt,
      completedAt: run?.completedAt,
      results: {
        passed: run?.results?.passed ?? run?.passed ?? 0,
        failed: run?.results?.failed ?? run?.failed ?? 0,
        skipped: run?.results?.skipped ?? run?.skipped ?? 0,
        total: run?.results?.total ?? run?.total ?? 0,
      },
      coverage: run?.coverage
        ? {
            lines: run.coverage?.percentage ?? 0,
            branches: run.coverage?.branches?.percentage ?? 0,
            functions: run.coverage?.functions?.percentage ?? 0,
            statements: run.coverage?.percentage ?? 0,
          }
        : undefined,
      suites,
    }
  }

  const buildSuites = (run: TestRun) => {
    if (!run.suites || run.suites.length === 0) {
      setTestSuites([])
      return
    }

    setTestSuites(run.suites.map((suite) => ({
      name: suite.name.split('/').pop() || suite.name,
      file: suite.file,
      tests: suite.tests,
      expanded: true,
    })))
  }

  const toggleSuite = (index: number) => {
    setTestSuites(prev => prev.map((s, i) => i === index ? { ...s, expanded: !s.expanded } : s))
  }

  const filteredSuites = testSuites.map(suite => ({
    ...suite,
    tests: suite.tests.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  })).filter(s => s.tests.length > 0)

  const coverage = currentRun?.coverage
  const results = currentRun?.results
  const watchSupported = capabilities.watchMode?.supported === true
  const watchReason = capabilities.watchMode?.reason || 'Watch mode is unavailable'

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">QA & Testing</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={toggleWatch}
              title={watchSupported ? (watchMode ? 'Stop watch mode' : 'Start watch mode') : watchReason}
              disabled={!watchSupported}
            >
              <Eye className={cn("w-3.5 h-3.5", watchMode && "text-green-400", !watchSupported && "opacity-40")} />
            </Button>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={fetchRecentRuns}>
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Framework + Run controls */}
        <div className="flex items-center gap-2">
          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="h-7 text-xs flex-1 bg-muted/30 border-border/40">
              <SelectValue placeholder="Select framework" />
            </SelectTrigger>
            <SelectContent>
              {frameworks.map(f => (
                <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isRunning ? (
            <Button size="sm" variant="destructive" className="h-7 text-xs px-3" onClick={cancelRun}>
              <Square className="w-3 h-3 mr-1" /> Stop
            </Button>
          ) : (
            <Button size="sm" className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700" onClick={runTests}>
              <Play className="w-3 h-3 mr-1" /> Run
            </Button>
          )}
        </div>
        {watchError && (
          <div className="mt-1 text-[10px] text-amber-400">{watchError}</div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-transparent h-8 px-2">
          <TabsTrigger value="runner" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">
            Tests
          </TabsTrigger>
          <TabsTrigger value="coverage" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">
            Coverage
          </TabsTrigger>
          <TabsTrigger value="history" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="runner" className="flex-1 m-0 overflow-hidden">
          {/* Filters */}
          <div className="px-3 py-1.5 flex items-center gap-2 border-b border-border/20">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter tests..."
                className="h-6 text-xs pl-7 bg-transparent border-border/30"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-6 w-24 text-[11px] border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="passed" className="text-xs">Passed</SelectItem>
                <SelectItem value="failed" className="text-xs">Failed</SelectItem>
                <SelectItem value="skipped" className="text-xs">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results summary bar */}
          {results && (
            <div className="px-3 py-1.5 border-b border-border/20 flex items-center gap-3 text-[11px]">
              <span className="text-green-400 font-medium">✓ {results.passed}</span>
              <span className="text-red-400 font-medium">✗ {results.failed}</span>
              <span className="text-yellow-400 font-medium">⊘ {results.skipped}</span>
              <span className="text-muted-foreground ml-auto">{results.total} total</span>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-1">
              {filteredSuites.length === 0 && !isRunning && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FlaskConical className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">No test results</p>
                  <p className="text-[11px] opacity-60 mt-1">Run tests to see results here</p>
                </div>
              )}
              {filteredSuites.map((suite, si) => (
                <div key={si} className="mb-1">
                  <button
                    onClick={() => toggleSuite(si)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-muted/30 rounded text-xs"
                  >
                    {suite.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium truncate">{suite.name}</span>
                    <span className="text-muted-foreground ml-auto">{suite.tests.length}</span>
                  </button>
                  {suite.expanded && suite.tests.map(test => {
                    const cfg = STATUS_CONFIG[test.status] || STATUS_CONFIG.pending
                    const Icon = cfg.icon
                    return (
                      <div key={test.id} className="flex items-center gap-2 pl-8 pr-2 py-0.5 hover:bg-muted/20 rounded group">
                        <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", cfg.color, test.status === 'running' && "animate-spin")} />
                        <span className="text-xs truncate flex-1">{test.name}</span>
                        {test.duration !== undefined && (
                          <span className="text-[10px] text-muted-foreground tabular-nums">{test.duration.toFixed(0)}ms</span>
                        )}
                        <Button variant="ghost" size="icon" className="w-5 h-5 opacity-0 group-hover:opacity-100">
                          <Play className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="coverage" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {coverage ? (
                <>
                  <div className="text-xs font-semibold text-foreground/80 mb-3">Code Coverage Report</div>
                  {[
                    { label: 'Statements', value: coverage.statements },
                    { label: 'Branches', value: coverage.branches },
                    { label: 'Functions', value: coverage.functions },
                    { label: 'Lines', value: coverage.lines },
                  ].map(metric => (
                    <div key={metric.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{metric.label}</span>
                        <span className={cn(
                          "font-mono font-semibold",
                          metric.value >= 80 ? "text-green-400" : metric.value >= 50 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {metric.value.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={metric.value}
                        className="h-1.5"
                      />
                    </div>
                  ))}
                  <div className="mt-4 p-2 rounded-md bg-muted/20 border border-border/30">
                    <div className="text-[11px] text-muted-foreground">
                      Coverage threshold: 80% — {(coverage.lines >= 80 && coverage.branches >= 80) ? (
                        <span className="text-green-400 font-medium">PASSING</span>
                      ) : (
                        <span className="text-red-400 font-medium">BELOW THRESHOLD</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart3 className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">No coverage data</p>
                  <p className="text-[11px] opacity-60 mt-1">Run tests with coverage enabled</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-1">
              {testRuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">No test history</p>
                </div>
              ) : testRuns.map(run => {
                const cfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending
                const Icon = cfg.icon
                return (
                  <button
                    key={run.id}
                    onClick={() => { setCurrentRun(run); buildSuites(run); setTab('runner') }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 rounded text-left"
                  >
                    <Icon className={cn("w-4 h-4 flex-shrink-0", cfg.color, run.status === 'running' && "animate-spin")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{run.framework}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {run.results.passed}✓ {run.results.failed}✗ {run.results.skipped}⊘
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(run.startedAt).toLocaleTimeString()}
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

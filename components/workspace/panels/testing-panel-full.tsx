"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Square,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  FileCode,
  RefreshCw,
  Filter,
  BarChart2,
  AlertTriangle,
  Loader2,
  SkipForward,
  CircleDot,
} from "lucide-react"

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type TestStatus = "passed" | "failed" | "skipped" | "running" | "pending" | "error"

interface TestCase {
  id: string
  name: string
  status: TestStatus
  duration?: number
  errorMessage?: string
  errorStack?: string
  file: string
  line: number
}

interface TestSuite {
  id: string
  name: string
  file: string
  tests: TestCase[]
  status: TestStatus
  duration?: number
  expanded?: boolean
}

interface TestRun {
  id: string
  startedAt: number
  completedAt?: number
  suites: TestSuite[]
  totalTests: number
  passed: number
  failed: number
  skipped: number
  duration?: number
}

interface TestingPanelProps {
  projectId?: string
  activeFile?: string | null
  onNavigateToFile?: (file: string, line: number) => void
}

// ═══════════════════════════════════════════════════════════
// DEMO DATA GENERATOR
// ═══════════════════════════════════════════════════════════

function generateDemoTestRun(): TestRun {
  const suites: TestSuite[] = [
    {
      id: "suite_1",
      name: "UserAuthentication",
      file: "tests/auth.test.ts",
      status: "failed",
      duration: 342,
      expanded: true,
      tests: [
        { id: "t1", name: "should login with valid credentials", status: "passed", duration: 45, file: "tests/auth.test.ts", line: 12 },
        { id: "t2", name: "should reject invalid password", status: "passed", duration: 38, file: "tests/auth.test.ts", line: 28 },
        { id: "t3", name: "should handle OAuth2 callback", status: "failed", duration: 120, file: "tests/auth.test.ts", line: 44, errorMessage: "Expected status 200 but received 401", errorStack: "  at Object.<anonymous> (tests/auth.test.ts:52:14)" },
        { id: "t4", name: "should refresh expired tokens", status: "passed", duration: 89, file: "tests/auth.test.ts", line: 68 },
        { id: "t5", name: "should enforce rate limiting", status: "skipped", duration: 0, file: "tests/auth.test.ts", line: 85 },
      ],
    },
    {
      id: "suite_2",
      name: "WorkspaceService",
      file: "tests/workspace.test.ts",
      status: "passed",
      duration: 215,
      tests: [
        { id: "t6", name: "should create a new workspace", status: "passed", duration: 67, file: "tests/workspace.test.ts", line: 10 },
        { id: "t7", name: "should list user workspaces", status: "passed", duration: 42, file: "tests/workspace.test.ts", line: 30 },
        { id: "t8", name: "should delete workspace and cleanup", status: "passed", duration: 106, file: "tests/workspace.test.ts", line: 52 },
      ],
    },
    {
      id: "suite_3",
      name: "FileSystem",
      file: "tests/fs.test.ts",
      status: "passed",
      duration: 178,
      tests: [
        { id: "t9", name: "should read file contents", status: "passed", duration: 23, file: "tests/fs.test.ts", line: 8 },
        { id: "t10", name: "should write and verify file", status: "passed", duration: 54, file: "tests/fs.test.ts", line: 22 },
        { id: "t11", name: "should handle nested directory creation", status: "passed", duration: 31, file: "tests/fs.test.ts", line: 40 },
        { id: "t12", name: "should watch file changes", status: "passed", duration: 70, file: "tests/fs.test.ts", line: 58 },
      ],
    },
    {
      id: "suite_4",
      name: "CollaborationEngine",
      file: "tests/collab.test.ts",
      status: "failed",
      duration: 456,
      tests: [
        { id: "t13", name: "should sync document edits via CRDT", status: "passed", duration: 134, file: "tests/collab.test.ts", line: 12 },
        { id: "t14", name: "should handle concurrent edits", status: "passed", duration: 98, file: "tests/collab.test.ts", line: 35 },
        { id: "t15", name: "should broadcast cursor positions", status: "failed", duration: 200, file: "tests/collab.test.ts", line: 60, errorMessage: "Timeout: cursor position not received within 5000ms", errorStack: "  at Timeout._onTimeout (tests/collab.test.ts:72:10)" },
        { id: "t16", name: "should persist session state", status: "passed", duration: 24, file: "tests/collab.test.ts", line: 80 },
      ],
    },
  ]

  const allTests = suites.flatMap(s => s.tests)
  return {
    id: `run_${Date.now()}`,
    startedAt: Date.now() - 2000,
    completedAt: Date.now(),
    suites,
    totalTests: allTests.length,
    passed: allTests.filter(t => t.status === "passed").length,
    failed: allTests.filter(t => t.status === "failed").length,
    skipped: allTests.filter(t => t.status === "skipped").length,
    duration: suites.reduce((acc, s) => acc + (s.duration || 0), 0),
  }
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function TestingPanel({ projectId, activeFile, onNavigateToFile }: TestingPanelProps) {
  const [testRun, setTestRun] = useState<TestRun | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [filter, setFilter] = useState<"all" | "passed" | "failed" | "skipped">("all")
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set())

  const runTests = useCallback(() => {
    setIsRunning(true)
    setTestRun(null)

    // Simulate test execution
    setTimeout(() => {
      const result = generateDemoTestRun()
      setTestRun(result)
      setIsRunning(false)
      // Auto-expand suites with failures
      const failedSuites = result.suites.filter(s => s.status === "failed").map(s => s.id)
      setExpandedSuites(new Set(failedSuites))
    }, 2200)
  }, [])

  const runSingleFile = useCallback(() => {
    if (!activeFile) return
    runTests()
  }, [activeFile, runTests])

  const toggleSuite = (suiteId: string) => {
    setExpandedSuites(prev => {
      const next = new Set(prev)
      next.has(suiteId) ? next.delete(suiteId) : next.add(suiteId)
      return next
    })
  }

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "passed": return <CheckCircle className="w-3.5 h-3.5 text-green-500" />
      case "failed": return <XCircle className="w-3.5 h-3.5 text-red-500" />
      case "skipped": return <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />
      case "running": return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
      case "error": return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
      default: return <CircleDot className="w-3.5 h-3.5 text-muted-foreground" />
    }
  }

  const filteredSuites = testRun?.suites.map(suite => ({
    ...suite,
    tests: suite.tests.filter(t => filter === "all" || t.status === filter),
  })).filter(s => s.tests.length > 0) || []

  return (
    <div className="flex flex-col h-full bg-background text-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-1">
          <button onClick={runTests} disabled={isRunning} className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-green-500/20 text-green-500 disabled:opacity-40 transition-colors">
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run All
          </button>
          {activeFile && (
            <button onClick={runSingleFile} disabled={isRunning} className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-blue-500/20 text-blue-500 disabled:opacity-40 transition-colors">
              <FileCode className="w-3.5 h-3.5" />
              Run File
            </button>
          )}
          {isRunning && (
            <button onClick={() => setIsRunning(false)} className="p-1 rounded hover:bg-red-500/20 text-red-500 transition-colors">
              <Square className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(["all", "passed", "failed", "skipped"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Bar */}
      {testRun && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border text-xs bg-muted/10">
          <span className="text-green-500 font-medium">{testRun.passed} passed</span>
          <span className="text-red-500 font-medium">{testRun.failed} failed</span>
          <span className="text-muted-foreground">{testRun.skipped} skipped</span>
          <span className="ml-auto text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {testRun.duration}ms
          </span>
          {/* Coverage bar */}
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-3 h-3 text-muted-foreground" />
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.round((testRun.passed / testRun.totalTests) * 100)}%` }} />
            </div>
            <span className="text-muted-foreground">{Math.round((testRun.passed / testRun.totalTests) * 100)}%</span>
          </div>
        </div>
      )}

      {/* Test Suites */}
      <div className="flex-1 overflow-y-auto">
        {isRunning && !testRun && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-xs text-muted-foreground">Running tests...</p>
          </div>
        )}

        {!testRun && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <TestTube className="w-8 h-8 opacity-30" />
            <p className="text-xs">No test results yet</p>
            <button onClick={runTests} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/10 text-green-500 rounded-md hover:bg-green-500/20 transition-colors">
              <Play className="w-3 h-3" />
              Run Tests
            </button>
          </div>
        )}

        {filteredSuites.map(suite => (
          <div key={suite.id} className="border-b border-border last:border-0">
            {/* Suite Header */}
            <button onClick={() => toggleSuite(suite.id)} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 transition-colors">
              {expandedSuites.has(suite.id) ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              {getStatusIcon(suite.status)}
              <span className="text-xs font-medium flex-1 text-left">{suite.name}</span>
              <span className="text-[10px] text-muted-foreground">{suite.tests.length} tests</span>
              <span className="text-[10px] text-muted-foreground">{suite.duration}ms</span>
            </button>

            {/* Tests */}
            <AnimatePresence>
              {expandedSuites.has(suite.id) && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  {suite.tests.map(test => (
                    <div key={test.id}>
                      <button
                        onClick={() => onNavigateToFile?.(test.file, test.line)}
                        className="w-full flex items-center gap-2 pl-8 pr-2 py-1 text-xs hover:bg-muted/20 transition-colors"
                      >
                        {getStatusIcon(test.status)}
                        <span className="flex-1 text-left truncate text-foreground/80">{test.name}</span>
                        {test.duration !== undefined && (
                          <span className="text-[10px] text-muted-foreground">{test.duration}ms</span>
                        )}
                      </button>

                      {/* Error Details */}
                      {test.status === "failed" && test.errorMessage && (
                        <div className="ml-8 mr-2 mb-1 p-2 bg-red-500/5 border border-red-500/20 rounded text-[11px]">
                          <p className="text-red-400 font-mono">{test.errorMessage}</p>
                          {test.errorStack && (
                            <p className="text-red-400/60 font-mono mt-1 text-[10px]">{test.errorStack}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}

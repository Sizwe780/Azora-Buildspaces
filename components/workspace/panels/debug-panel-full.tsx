"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Play,
  Square,
  SkipForward,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  Bug,
  Circle,
  CircleDot,
  ChevronRight,
  ChevronDown,
  Terminal,
  Eye,
  Plus,
  X,
  FileCode,
  Variable,
  Layers,
  AlertTriangle,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useWorkbenchRuntimeStore } from "@/lib/stores/workbench-runtime-store"

interface DebugSession {
  id: string
  name: string
  type: string
  status: "running" | "paused" | "stopped" | "error"
  threadId?: number
}

interface StackFrame {
  id: number
  name: string
  source: string
  line: number
  column: number
}

interface DebugVariable {
  name: string
  value: string
  type: string
  children?: DebugVariable[]
  evaluateName?: string
}

interface DebugBreakpoint {
  id: string
  file: string
  line: number
  enabled: boolean
  condition?: string
  hitCount?: number
  verified: boolean
}

interface WatchExpression {
  id: string
  expression: string
  value?: string
  type?: string
  error?: string
}

interface DebugPanelProps {
  projectId?: string
  activeFile?: string
  onNavigateToFile?: (file: string, line: number) => void
}

export function DebugPanel({ projectId, activeFile, onNavigateToFile }: DebugPanelProps) {
  const addLog = useWorkbenchRuntimeStore((state) => state.addLog)
  const debugBackendEnabled = process.env.NEXT_PUBLIC_DAP_BACKEND_ENABLED === "true"
  const debugShell: "bash" | "powershell" = typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent)
    ? "powershell"
    : "bash"

  const [session, setSession] = useState<DebugSession | null>(null)
  const [callStack, setCallStack] = useState<StackFrame[]>([])
  const [variables, setVariables] = useState<{ local: DebugVariable[]; closure: DebugVariable[]; global: DebugVariable[] }>({
    local: [],
    closure: [],
    global: [],
  })
  const [breakpoints, setBreakpoints] = useState<DebugBreakpoint[]>([])
  const [watchExpressions, setWatchExpressions] = useState<WatchExpression[]>([])
  const [exceptionBreakpoints, setExceptionBreakpoints] = useState({ caught: false, uncaught: true })
  const [consoleOutput, setConsoleOutput] = useState<{ type: "log" | "error" | "warn" | "info"; text: string; timestamp: number }[]>([])
  const [consoleInput, setConsoleInput] = useState("")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["variables", "callstack", "breakpoints"]))
  const [expandedVarScopes, setExpandedVarScopes] = useState<Set<string>>(new Set(["local"]))
  const [selectedFrameId, setSelectedFrameId] = useState<number>(0)
  const [newWatchExpr, setNewWatchExpr] = useState("")
  const consoleEndRef = useRef<HTMLDivElement>(null)
  const lastInspectErrorRef = useRef<string>("")

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [consoleOutput])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
  }

  const toggleVarScope = (scope: string) => {
    setExpandedVarScopes((prev) => {
      const next = new Set(prev)
      next.has(scope) ? next.delete(scope) : next.add(scope)
      return next
    })
  }

  const syncInspection = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/workbench/debug?action=inspect&sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))

      if (data.session) {
        setSession({
          id: String(data.session.id || sessionId),
          name: String(data.session.name || activeFile || "Debug Session"),
          type: String(data.session.type || "node"),
          status: String(data.session.status || "running") as DebugSession["status"],
          threadId: Number.isFinite(Number(data.session.threadId)) ? Number(data.session.threadId) : undefined,
        })
      }

      setCallStack(Array.isArray(data.callStack) ? data.callStack.map((frame: any, index: number) => ({
        id: Number.isFinite(Number(frame?.id)) ? Number(frame.id) : index,
        name: String(frame?.name || "<frame>"),
        source: String(frame?.source || "unknown"),
        line: Number.isFinite(Number(frame?.line)) ? Number(frame.line) : 1,
        column: Number.isFinite(Number(frame?.column)) ? Number(frame.column) : 1,
      })) : [])

      setVariables({
        local: Array.isArray(data?.variables?.local) ? data.variables.local : [],
        closure: Array.isArray(data?.variables?.closure) ? data.variables.closure : [],
        global: Array.isArray(data?.variables?.global) ? data.variables.global : [],
      })

      // Dispatch inline debug values to editor
      if (session?.status === 'paused' && Array.isArray(data?.variables?.local)) {
        const topFrame = Array.isArray(data.callStack) && data.callStack[0]
        if (topFrame) {
          const inlineVars = data.variables.local
            .filter((v: any) => v.name && v.value)
            .map((v: any, i: number) => ({
              name: v.name,
              value: String(v.value).slice(0, 50),
              line: (topFrame.line || 1) + i,
            }))
          window.dispatchEvent(new CustomEvent('debug:inlineValues', { detail: { variables: inlineVars } }))
        }
      }

      if (Array.isArray(data.breakpoints)) {
        setBreakpoints(data.breakpoints.map((bp: any, index: number) => ({
          id: String(bp?.id || `bp-${index}`),
          file: String(bp?.file || "unknown"),
          line: Number.isFinite(Number(bp?.line)) ? Number(bp.line) : 1,
          enabled: Boolean(bp?.enabled),
          condition: bp?.condition ? String(bp.condition) : undefined,
          verified: bp?.verified !== false,
          hitCount: bp?.hitCount ? Number(bp.hitCount) : undefined,
        })))
      }

      if (Array.isArray(data.watchExpressions)) {
        setWatchExpressions(data.watchExpressions.map((watch: any, index: number) => ({
          id: String(watch?.id || `watch-${index}`),
          expression: String(watch?.expression || ""),
          value: watch?.value ? String(watch.value) : undefined,
          type: watch?.type ? String(watch.type) : undefined,
          error: watch?.error ? String(watch.error) : undefined,
        })))
      }

      const errorText = String(data?.error || "")
      if (errorText && errorText !== lastInspectErrorRef.current) {
        lastInspectErrorRef.current = errorText
        setConsoleOutput((prev) => [...prev, { type: "warn", text: `⚠ ${errorText}`, timestamp: Date.now() }])
      }
      if (!errorText) {
        lastInspectErrorRef.current = ""
      }

      if (!res.ok && !errorText) {
        setConsoleOutput((prev) => [...prev, { type: "warn", text: "⚠ Debug inspection unavailable", timestamp: Date.now() }])
      }
    } catch {
      if (lastInspectErrorRef.current !== "Inspection request failed") {
        lastInspectErrorRef.current = "Inspection request failed"
        setConsoleOutput((prev) => [...prev, { type: "warn", text: "⚠ Inspection request failed", timestamp: Date.now() }])
      }
    }
  }, [activeFile])

  useEffect(() => {
    if (!session?.id) return
    const interval = setInterval(() => {
      syncInspection(session.id)
    }, 2500)
    return () => clearInterval(interval)
  }, [session?.id, syncInspection])

  const controlDebug = useCallback(async (command: "continue" | "pause" | "stepOver" | "stepInto" | "stepOut" | "restart") => {
    if (!session) return false

    const res = await fetch("/api/workbench/debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "control", sessionId: session.id, command }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message = String(data?.error || `Failed to execute ${command}`)
      setConsoleOutput((prev) => [...prev, { type: "error", text: `← ${message}`, timestamp: Date.now() }])
      addLog({ source: "debug", level: "error", message })
      return false
    }

    if (data.session) {
      setSession({
        id: String(data.session.id || session.id),
        name: String(data.session.name || session.name),
        type: String(data.session.type || session.type),
        status: String(data.session.status || session.status) as DebugSession["status"],
        threadId: Number.isFinite(Number(data.session.threadId)) ? Number(data.session.threadId) : undefined,
      })
    }

    await syncInspection(session.id)
    return true
  }, [addLog, session, syncInspection])

  const mutateDebugState = useCallback(async (
    action: "breakpoint" | "watch",
    payload: Record<string, unknown>,
    failureLabel: string,
  ) => {
    if (!session?.id) return false

    const res = await fetch("/api/workbench/debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        sessionId: session.id,
        ...payload,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message = String(data?.error || failureLabel)
      setConsoleOutput((prev) => [...prev, { type: "error", text: `← ${message}`, timestamp: Date.now() }])
      addLog({ source: "debug", level: "error", message })
      return false
    }

    await syncInspection(session.id)
    return true
  }, [addLog, session?.id, syncInspection])

  const startDebug = useCallback(async () => {
    if (!debugBackendEnabled) {
      const message = "Debug backend is not configured. Set NEXT_PUBLIC_DAP_BACKEND_ENABLED=true and connect a DAP broker."
      setConsoleOutput((prev) => [...prev, { type: "warn", text: message, timestamp: Date.now() }])
      addLog({ source: "debug", level: "warn", message })
      return
    }

    const res = await fetch("/api/workbench/debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        activeFile,
        workspaceId: projectId || "default",
      }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data?.session?.id) {
      const message = String(data?.error || "Failed to start debug session")
      setConsoleOutput((prev) => [...prev, { type: "error", text: `← ${message}`, timestamp: Date.now() }])
      addLog({ source: "debug", level: "error", message })
      return
    }

    const newSession: DebugSession = {
      id: String(data.session.id),
      name: String(data.session.name || activeFile || "Debug Session"),
      type: String(data.session.type || "node"),
      status: String(data.session.status || "running") as DebugSession["status"],
      threadId: Number.isFinite(Number(data.session.threadId)) ? Number(data.session.threadId) : undefined,
    }
    setSession(newSession)
    setConsoleOutput((prev) => [...prev, { type: "info", text: `▶ Debug session started: ${newSession.name}`, timestamp: Date.now() }])
    await syncInspection(newSession.id)
  }, [activeFile, addLog, debugBackendEnabled, projectId, syncInspection])

  const continueExec = async () => {
    if (!session) return
    if (!debugBackendEnabled) {
      setConsoleOutput((prev) => [...prev, { type: "warn", text: "Continue requires DAP backend support (set NEXT_PUBLIC_DAP_BACKEND_ENABLED=true).", timestamp: Date.now() }])
      return
    }
    if (await controlDebug("continue")) {
      setConsoleOutput((prev) => [...prev, { type: "info", text: "▶ Continuing...", timestamp: Date.now() }])
    }
  }

  const stepOver = async () => {
    if (!debugBackendEnabled) {
      setConsoleOutput((prev) => [...prev, { type: "warn", text: "Step over requires DAP backend support (set NEXT_PUBLIC_DAP_BACKEND_ENABLED=true).", timestamp: Date.now() }])
      return
    }
    if (await controlDebug("stepOver")) {
      setConsoleOutput((prev) => [...prev, { type: "info", text: "⏭ Step over", timestamp: Date.now() }])
    }
  }

  const stepInto = async () => {
    if (!debugBackendEnabled) {
      setConsoleOutput((prev) => [...prev, { type: "warn", text: "Step into requires DAP backend support (set NEXT_PUBLIC_DAP_BACKEND_ENABLED=true).", timestamp: Date.now() }])
      return
    }
    if (await controlDebug("stepInto")) {
      setConsoleOutput((prev) => [...prev, { type: "info", text: "⬇ Step into", timestamp: Date.now() }])
    }
  }

  const stepOut = async () => {
    if (!debugBackendEnabled) {
      setConsoleOutput((prev) => [...prev, { type: "warn", text: "Step out requires DAP backend support (set NEXT_PUBLIC_DAP_BACKEND_ENABLED=true).", timestamp: Date.now() }])
      return
    }
    if (await controlDebug("stepOut")) {
      setConsoleOutput((prev) => [...prev, { type: "info", text: "⬆ Step out", timestamp: Date.now() }])
    }
  }

  const stopDebug = async () => {
    if (session?.id) {
      await fetch("/api/workbench/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", sessionId: session.id }),
      }).catch(() => undefined)
    }
    setSession(null)
    setCallStack([])
    setVariables({ local: [], closure: [], global: [] })
    setConsoleOutput((prev) => [...prev, { type: "info", text: "⏹ Debug session ended", timestamp: Date.now() }])
  }

  const restartDebug = async () => {
    await stopDebug()
    await startDebug()
  }

  const toggleBreakpoint = async (id: string) => {
    if (!debugBackendEnabled) {
      setConsoleOutput((prev) => [...prev, { type: "warn", text: "Breakpoint updates require DAP backend support (set NEXT_PUBLIC_DAP_BACKEND_ENABLED=true).", timestamp: Date.now() }])
      return
    }
    await mutateDebugState("breakpoint", { command: "toggle", breakpointId: id }, "Failed to toggle breakpoint")
  }

  const removeBreakpoint = async (id: string) => {
    if (!debugBackendEnabled) {
      setConsoleOutput((prev) => [...prev, { type: "warn", text: "Breakpoint updates require DAP backend support (set NEXT_PUBLIC_DAP_BACKEND_ENABLED=true).", timestamp: Date.now() }])
      return
    }
    await mutateDebugState("breakpoint", { command: "remove", breakpointId: id }, "Failed to remove breakpoint")
  }

  const addWatchExpression = async () => {
    if (!debugBackendEnabled) {
      setConsoleOutput((prev) => [...prev, { type: "warn", text: "Watch expressions require DAP backend support (set NEXT_PUBLIC_DAP_BACKEND_ENABLED=true).", timestamp: Date.now() }])
      return
    }
    const expression = newWatchExpr.trim()
    if (!expression) return

    const ok = await mutateDebugState("watch", { command: "add", expression }, "Failed to add watch expression")
    if (!ok) return
    setNewWatchExpr("")
  }

  const removeWatch = async (id: string) => {
    if (!debugBackendEnabled) {
      setConsoleOutput((prev) => [...prev, { type: "warn", text: "Watch expressions require DAP backend support (set NEXT_PUBLIC_DAP_BACKEND_ENABLED=true).", timestamp: Date.now() }])
      return
    }
    await mutateDebugState("watch", { command: "remove", watchId: id }, "Failed to remove watch expression")
  }

  const executeConsole = async () => {
    const expression = consoleInput.trim()
    if (!expression) return

    setConsoleOutput((prev) => [...prev, { type: "log", text: `> ${expression}`, timestamp: Date.now() }])
    addLog({ source: "debug", level: "log", message: `> ${expression}` })
    setConsoleInput("")

    try {
      const wrapped = `node -p ${JSON.stringify(expression)}`
      const res = await fetch("/api/workbench/runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exec",
          command: wrapped,
          workspaceId: projectId || "default",
          shell: debugShell,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errorText = String(data.error || "Debug console command failed")
        setConsoleOutput((prev) => [...prev, { type: "error", text: `← ${errorText}`, timestamp: Date.now() }])
        addLog({ source: "debug", level: "error", message: errorText })
        return
      }

      const out = String(data.stdout || "").trim()
      const err = String(data.stderr || "").trim()

      if (out) {
        setConsoleOutput((prev) => [...prev, { type: "log", text: `← ${out}`, timestamp: Date.now() }])
        addLog({ source: "debug", level: "log", message: out })
      }
      if (err) {
        setConsoleOutput((prev) => [...prev, { type: "error", text: `← ${err}`, timestamp: Date.now() }])
        addLog({ source: "debug", level: "error", message: err })
      }
      if (!out && !err) {
        setConsoleOutput((prev) => [...prev, { type: "info", text: "← (no output)", timestamp: Date.now() }])
      }
    } catch (error: any) {
      const message = error?.message || "Failed to execute debug console command"
      setConsoleOutput((prev) => [...prev, { type: "error", text: `← ${message}`, timestamp: Date.now() }])
      addLog({ source: "debug", level: "error", message })
    }
  }

  const isPaused = session?.status === "paused"
  const isRunning = session?.status === "running"

  return (
    <div className="flex flex-col h-full bg-background text-sm">
      <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/20">
        <div className="flex items-center gap-0.5">
          {!session ? (
            <button
              onClick={startDebug}
              className="p-1.5 rounded hover:bg-green-500/20 text-green-500 transition-colors disabled:opacity-40"
              title={debugBackendEnabled ? "Start Debugging (F5)" : "Requires DAP backend support"}
              disabled={!debugBackendEnabled}
            >
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={continueExec}
                disabled={!isPaused || !debugBackendEnabled}
                className="p-1.5 rounded hover:bg-green-500/20 text-green-500 disabled:opacity-30 transition-colors"
                title={debugBackendEnabled ? "Continue (F5)" : "Requires DAP backend support"}
              >
                <Play className="w-4 h-4" />
              </button>
              <button
                onClick={stepOver}
                disabled={!isPaused || !debugBackendEnabled}
                className="p-1.5 rounded hover:bg-blue-500/20 text-blue-500 disabled:opacity-30 transition-colors"
                title={debugBackendEnabled ? "Step Over (F10)" : "Requires DAP backend support"}
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={stepInto}
                disabled={!isPaused || !debugBackendEnabled}
                className="p-1.5 rounded hover:bg-blue-500/20 text-blue-500 disabled:opacity-30 transition-colors"
                title={debugBackendEnabled ? "Step Into (F11)" : "Requires DAP backend support"}
              >
                <ArrowDownToLine className="w-4 h-4" />
              </button>
              <button
                onClick={stepOut}
                disabled={!isPaused || !debugBackendEnabled}
                className="p-1.5 rounded hover:bg-blue-500/20 text-blue-500 disabled:opacity-30 transition-colors"
                title={debugBackendEnabled ? "Step Out (Shift+F11)" : "Requires DAP backend support"}
              >
                <ArrowUpFromLine className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={restartDebug} className="p-1.5 rounded hover:bg-amber-500/20 text-amber-500 transition-colors" title="Restart (Ctrl+Shift+F5)">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={stopDebug} className="p-1.5 rounded hover:bg-red-500/20 text-red-500 transition-colors" title="Stop (Shift+F5)">
                <Square className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {session && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${isPaused ? "bg-amber-500" : isRunning ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span>{session.name}</span>
            <span className="text-muted-foreground/50">({session.status})</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!session ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Bug className="w-8 h-8 opacity-30" />
            <p className="text-xs">No active debug session</p>
            {!debugBackendEnabled && (
              <p className="text-[11px] text-amber-400 text-center max-w-[260px]">
                Debug backend unavailable. Set NEXT_PUBLIC_DAP_BACKEND_ENABLED=true to enable debug sessions.
              </p>
            )}
            <button
              onClick={startDebug}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/10 text-green-500 rounded-md hover:bg-green-500/20 transition-colors disabled:opacity-40"
              disabled={!debugBackendEnabled}
              title={debugBackendEnabled ? "Start Debugging" : "Requires DAP backend support"}
            >
              <Play className="w-3 h-3" />
              Start Debugging
            </button>
          </div>
        ) : (
          <>
            <CollapsibleSection title="Variables" icon={<Variable className="w-3.5 h-3.5" />} isOpen={expandedSections.has("variables")} onToggle={() => toggleSection("variables")}>
              {(["local", "closure", "global"] as const).map((scope) => (
                <div key={scope}>
                  <button onClick={() => toggleVarScope(scope)} className="w-full flex items-center gap-1 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted/30">
                    {expandedVarScopes.has(scope) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {scope} ({variables[scope].length})
                  </button>
                  <AnimatePresence>
                    {expandedVarScopes.has(scope) && variables[scope].map((v, i) => (
                      <VariableNode key={`${scope}-${i}`} variable={v} depth={0} />
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </CollapsibleSection>

            <CollapsibleSection
              title="Watch"
              icon={<Eye className="w-3.5 h-3.5" />}
              isOpen={expandedSections.has("watch")}
              onToggle={() => toggleSection("watch")}
              action={
                <button
                  onClick={() => setExpandedSections((prev) => { const n = new Set(prev); n.add("watch"); return n })}
                  className="p-0.5 rounded hover:bg-muted/50 disabled:opacity-40"
                  disabled={!debugBackendEnabled}
                  title={debugBackendEnabled ? "Add watch expression" : "Requires DAP backend support"}
                >
                  <Plus className="w-3 h-3" />
                </button>
              }
            >
              {watchExpressions.map((w) => (
                <div key={w.id} className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-muted/30 group">
                  <span className="text-blue-400 font-mono">{w.expression}</span>
                  <span className="text-muted-foreground">=</span>
                  <span className={`font-mono ${w.error ? "text-red-400" : "text-foreground"}`}>{w.error || w.value}</span>
                  <button onClick={() => removeWatch(w.id)} className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted/50">
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1 px-3 py-1">
                <input
                  type="text"
                  value={newWatchExpr}
                  onChange={(e) => setNewWatchExpr(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addWatchExpression()}
                  placeholder={debugBackendEnabled ? "Add expression..." : "Watch expressions require DAP backend"}
                  disabled={!debugBackendEnabled}
                  className="flex-1 text-xs bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/50 font-mono"
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Call Stack" icon={<Layers className="w-3.5 h-3.5" />} isOpen={expandedSections.has("callstack")} onToggle={() => toggleSection("callstack")}>
              {callStack.map((frame) => (
                <button
                  key={frame.id}
                  onClick={() => {
                    setSelectedFrameId(frame.id)
                    onNavigateToFile?.(frame.source, frame.line)
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1 text-xs hover:bg-muted/30 text-left transition-colors ${selectedFrameId === frame.id ? "bg-primary/10 text-primary" : ""}`}
                >
                  <FileCode className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-mono text-blue-400 truncate">{frame.name}</span>
                  <span className="text-muted-foreground ml-auto flex-shrink-0">{frame.source.split("/").pop()}:{frame.line}</span>
                </button>
              ))}
            </CollapsibleSection>

            <CollapsibleSection title="Breakpoints" icon={<CircleDot className="w-3.5 h-3.5 text-red-400" />} isOpen={expandedSections.has("breakpoints")} onToggle={() => toggleSection("breakpoints")}>
              {breakpoints.map((bp) => (
                <div key={bp.id} className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-muted/30 group">
                  <button
                    onClick={() => toggleBreakpoint(bp.id)}
                    className="flex-shrink-0 disabled:opacity-40"
                    disabled={!debugBackendEnabled}
                    title={debugBackendEnabled ? "Toggle breakpoint" : "Requires DAP backend support"}
                  >
                    {bp.enabled ? <Circle className="w-3.5 h-3.5 fill-red-500 text-red-500" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => onNavigateToFile?.(bp.file, bp.line)} className="flex-1 text-left truncate hover:underline">
                    <span className="text-foreground">{bp.file.split("/").pop()}</span>
                    <span className="text-muted-foreground">:{bp.line}</span>
                  </button>
                  {bp.condition && (
                    <span className="text-amber-400 text-[10px] font-mono truncate max-w-[100px]" title={bp.condition}>
                      {bp.condition}
                    </span>
                  )}
                  <button
                    onClick={() => removeBreakpoint(bp.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted/50 flex-shrink-0 disabled:opacity-40"
                    disabled={!debugBackendEnabled}
                    title={debugBackendEnabled ? "Remove breakpoint" : "Requires DAP backend support"}
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </CollapsibleSection>

            {/* Exception Breakpoints */}
            <CollapsibleSection title="Exception Breakpoints" icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />} isOpen={expandedSections.has("exceptions")} onToggle={() => toggleSection("exceptions")}>
              <div className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={exceptionBreakpoints.caught}
                  onChange={(e) => setExceptionBreakpoints(prev => ({ ...prev, caught: e.target.checked }))}
                  className="w-3 h-3 accent-red-500"
                />
                <span className="text-foreground">Caught Exceptions</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={exceptionBreakpoints.uncaught}
                  onChange={(e) => setExceptionBreakpoints(prev => ({ ...prev, uncaught: e.target.checked }))}
                  className="w-3 h-3 accent-red-500"
                />
                <span className="text-foreground">Uncaught Exceptions</span>
              </div>
            </CollapsibleSection>
          </>
        )}
      </div>

      {session && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between px-3 py-1 bg-muted/20">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Terminal className="w-3 h-3" />
              <span>Debug Console</span>
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto px-3 py-1 bg-background/50 font-mono text-[11px]">
            {consoleOutput.map((entry, i) => (
              <div key={i} className={`py-0.5 ${entry.type === "error" ? "text-red-400" : entry.type === "warn" ? "text-amber-400" : entry.type === "info" ? "text-blue-400" : "text-foreground"}`}>
                {entry.text}
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
          <div className="flex items-center border-t border-border">
            <span className="px-2 text-xs text-muted-foreground">&gt;</span>
            <input
              type="text"
              value={consoleInput}
              onChange={(e) => setConsoleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeConsole()}
              placeholder="Evaluate expression..."
              className="flex-1 px-1 py-1.5 text-xs font-mono bg-transparent focus:outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  action,
  children,
}: {
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border">
      <button onClick={onToggle} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium hover:bg-muted/30 transition-colors">
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {icon}
        <span>{title}</span>
        {action && <span className="ml-auto" onClick={(e) => e.stopPropagation()}>{action}</span>}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function VariableNode({ variable, depth }: { variable: DebugVariable; depth: number }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = variable.children && variable.children.length > 0
  const paddingLeft = 12 + depth * 16

  const getTypeColor = (type: string) => {
    switch (type) {
      case "string": return "text-amber-400"
      case "number": return "text-blue-400"
      case "boolean": return "text-purple-400"
      case "function": return "text-green-400"
      case "undefined":
      case "null": return "text-muted-foreground"
      default: return "text-cyan-400"
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1 py-0.5 text-xs hover:bg-muted/30 transition-colors"
        style={{ paddingLeft }}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />
        ) : (
          <span className="w-3" />
        )}
        <span className="text-foreground font-mono">{variable.name}</span>
        <span className="text-muted-foreground mx-0.5">:</span>
        <span className={`font-mono truncate ${getTypeColor(variable.type)}`}>{variable.value}</span>
      </button>
      <AnimatePresence>
        {isExpanded && variable.children?.map((child, i) => (
          <VariableNode key={`${variable.name}-${i}`} variable={child} depth={depth + 1} />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

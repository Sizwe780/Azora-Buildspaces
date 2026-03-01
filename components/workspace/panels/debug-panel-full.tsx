"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Play,
  Pause,
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
  Braces,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// MAIN DEBUG PANEL
// ═══════════════════════════════════════════════════════════

interface DebugPanelProps {
  projectId?: string
  activeFile?: string
  onNavigateToFile?: (file: string, line: number) => void
}

export function DebugPanel({ projectId, activeFile, onNavigateToFile }: DebugPanelProps) {
  const [session, setSession] = useState<DebugSession | null>(null)
  const [callStack, setCallStack] = useState<StackFrame[]>([])
  const [variables, setVariables] = useState<{
    local: DebugVariable[]
    closure: DebugVariable[]
    global: DebugVariable[]
  }>({ local: [], closure: [], global: [] })
  const [breakpoints, setBreakpoints] = useState<DebugBreakpoint[]>([])
  const [watchExpressions, setWatchExpressions] = useState<WatchExpression[]>([])
  const [consoleOutput, setConsoleOutput] = useState<{ type: "log" | "error" | "warn" | "info"; text: string; timestamp: number }[]>([])
  const [consoleInput, setConsoleInput] = useState("")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["variables", "callstack", "breakpoints"]))
  const [expandedVarScopes, setExpandedVarScopes] = useState<Set<string>>(new Set(["local"]))
  const [selectedFrameId, setSelectedFrameId] = useState<number>(0)
  const [newWatchExpr, setNewWatchExpr] = useState("")
  const consoleEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [consoleOutput])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
  }

  const toggleVarScope = (scope: string) => {
    setExpandedVarScopes(prev => {
      const next = new Set(prev)
      next.has(scope) ? next.delete(scope) : next.add(scope)
      return next
    })
  }

  // Debug actions
  const startDebug = useCallback(async () => {
    const newSession: DebugSession = {
      id: `dbg_${Date.now()}`,
      name: activeFile || "Debug Session",
      type: "node",
      status: "running",
    }
    setSession(newSession)
    setConsoleOutput(prev => [...prev, {
      type: "info",
      text: `▶ Debug session started: ${newSession.name}`,
      timestamp: Date.now(),
    }])

    // Simulate hitting a breakpoint after a delay
    setTimeout(() => {
      setSession(s => s ? { ...s, status: "paused" } : null)
      setCallStack([
        { id: 0, name: "handleClick", source: "app/page.tsx", line: 42, column: 8 },
        { id: 1, name: "processEvent", source: "lib/events.ts", line: 18, column: 4 },
        { id: 2, name: "dispatch", source: "node_modules/react-dom/index.js", line: 2100, column: 12 },
      ])
      setVariables({
        local: [
          { name: "event", value: "MouseEvent {...}", type: "MouseEvent", children: [
            { name: "clientX", value: "245", type: "number" },
            { name: "clientY", value: "312", type: "number" },
            { name: "target", value: "<button>", type: "Element" },
          ]},
          { name: "count", value: "3", type: "number" },
          { name: "isActive", value: "true", type: "boolean" },
          { name: "items", value: "Array(5)", type: "Array", children: [
            { name: "[0]", value: '"item-1"', type: "string" },
            { name: "[1]", value: '"item-2"', type: "string" },
            { name: "[2]", value: '"item-3"', type: "string" },
            { name: "length", value: "5", type: "number" },
          ]},
        ],
        closure: [
          { name: "setState", value: "ƒ setState()", type: "function" },
          { name: "props", value: "{id: 'main', ...}", type: "Object" },
        ],
        global: [
          { name: "window", value: "Window {...}", type: "Window" },
          { name: "document", value: "#document", type: "Document" },
        ],
      })
      setConsoleOutput(prev => [...prev, {
        type: "info",
        text: "⏸ Paused at breakpoint: app/page.tsx:42",
        timestamp: Date.now(),
      }])
    }, 1200)
  }, [activeFile])

  const continueExec = () => {
    if (!session) return
    setSession(s => s ? { ...s, status: "running" } : null)
    setConsoleOutput(prev => [...prev, { type: "info", text: "▶ Continuing...", timestamp: Date.now() }])
  }

  const stepOver = () => {
    setConsoleOutput(prev => [...prev, { type: "info", text: "⏭ Step over", timestamp: Date.now() }])
  }

  const stepInto = () => {
    setConsoleOutput(prev => [...prev, { type: "info", text: "⬇ Step into", timestamp: Date.now() }])
  }

  const stepOut = () => {
    setConsoleOutput(prev => [...prev, { type: "info", text: "⬆ Step out", timestamp: Date.now() }])
  }

  const stopDebug = () => {
    setSession(null)
    setCallStack([])
    setVariables({ local: [], closure: [], global: [] })
    setConsoleOutput(prev => [...prev, { type: "info", text: "⏹ Debug session ended", timestamp: Date.now() }])
  }

  const restartDebug = () => {
    stopDebug()
    setTimeout(startDebug, 200)
  }

  const toggleBreakpoint = (id: string) => {
    setBreakpoints(prev => prev.map(bp => bp.id === id ? { ...bp, enabled: !bp.enabled } : bp))
  }

  const removeBreakpoint = (id: string) => {
    setBreakpoints(prev => prev.filter(bp => bp.id !== id))
  }

  const addWatchExpression = () => {
    if (!newWatchExpr.trim()) return
    setWatchExpressions(prev => [...prev, {
      id: `watch_${Date.now()}`,
      expression: newWatchExpr.trim(),
      value: "undefined",
      type: "undefined",
    }])
    setNewWatchExpr("")
  }

  const removeWatch = (id: string) => {
    setWatchExpressions(prev => prev.filter(w => w.id !== id))
  }

  const executeConsole = () => {
    if (!consoleInput.trim()) return
    setConsoleOutput(prev => [
      ...prev,
      { type: "log", text: `> ${consoleInput}`, timestamp: Date.now() },
      { type: "log", text: `← ${JSON.stringify(eval("undefined"))}`, timestamp: Date.now() },
    ])
    setConsoleInput("")
  }

  // Demo breakpoints
  useEffect(() => {
    setBreakpoints([
      { id: "bp_1", file: "app/page.tsx", line: 42, enabled: true, verified: true },
      { id: "bp_2", file: "app/page.tsx", line: 67, enabled: true, verified: true, condition: "count > 5" },
      { id: "bp_3", file: "lib/utils.ts", line: 15, enabled: false, verified: true },
    ])
  }, [])

  const isPaused = session?.status === "paused"
  const isRunning = session?.status === "running"

  return (
    <div className="flex flex-col h-full bg-background text-sm">
      {/* Debug Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/20">
        <div className="flex items-center gap-0.5">
          {!session ? (
            <button onClick={startDebug} className="p-1.5 rounded hover:bg-green-500/20 text-green-500 transition-colors" title="Start Debugging (F5)">
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button onClick={continueExec} disabled={!isPaused} className="p-1.5 rounded hover:bg-green-500/20 text-green-500 disabled:opacity-30 transition-colors" title="Continue (F5)">
                <Play className="w-4 h-4" />
              </button>
              <button onClick={stepOver} disabled={!isPaused} className="p-1.5 rounded hover:bg-blue-500/20 text-blue-500 disabled:opacity-30 transition-colors" title="Step Over (F10)">
                <SkipForward className="w-4 h-4" />
              </button>
              <button onClick={stepInto} disabled={!isPaused} className="p-1.5 rounded hover:bg-blue-500/20 text-blue-500 disabled:opacity-30 transition-colors" title="Step Into (F11)">
                <ArrowDownToLine className="w-4 h-4" />
              </button>
              <button onClick={stepOut} disabled={!isPaused} className="p-1.5 rounded hover:bg-blue-500/20 text-blue-500 disabled:opacity-30 transition-colors" title="Step Out (Shift+F11)">
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

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {!session ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Bug className="w-8 h-8 opacity-30" />
            <p className="text-xs">No active debug session</p>
            <button onClick={startDebug} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/10 text-green-500 rounded-md hover:bg-green-500/20 transition-colors">
              <Play className="w-3 h-3" />
              Start Debugging
            </button>
          </div>
        ) : (
          <>
            {/* Variables */}
            <CollapsibleSection title="Variables" icon={<Variable className="w-3.5 h-3.5" />} isOpen={expandedSections.has("variables")} onToggle={() => toggleSection("variables")}>
              {(["local", "closure", "global"] as const).map(scope => (
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

            {/* Watch */}
            <CollapsibleSection title="Watch" icon={<Eye className="w-3.5 h-3.5" />} isOpen={expandedSections.has("watch")} onToggle={() => toggleSection("watch")} action={
              <button onClick={() => setExpandedSections(prev => { const n = new Set(prev); n.add("watch"); return n })} className="p-0.5 rounded hover:bg-muted/50">
                <Plus className="w-3 h-3" />
              </button>
            }>
              {watchExpressions.map(w => (
                <div key={w.id} className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-muted/30 group">
                  <span className="text-blue-400 font-mono">{w.expression}</span>
                  <span className="text-muted-foreground">=</span>
                  <span className={`font-mono ${w.error ? "text-red-400" : "text-foreground"}`}>
                    {w.error || w.value}
                  </span>
                  <button onClick={() => removeWatch(w.id)} className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted/50">
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1 px-3 py-1">
                <input
                  type="text"
                  value={newWatchExpr}
                  onChange={e => setNewWatchExpr(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addWatchExpression()}
                  placeholder="Add expression..."
                  className="flex-1 text-xs bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/50 font-mono"
                />
              </div>
            </CollapsibleSection>

            {/* Call Stack */}
            <CollapsibleSection title="Call Stack" icon={<Layers className="w-3.5 h-3.5" />} isOpen={expandedSections.has("callstack")} onToggle={() => toggleSection("callstack")}>
              {callStack.map(frame => (
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

            {/* Breakpoints */}
            <CollapsibleSection title="Breakpoints" icon={<CircleDot className="w-3.5 h-3.5 text-red-400" />} isOpen={expandedSections.has("breakpoints")} onToggle={() => toggleSection("breakpoints")}>
              {breakpoints.map(bp => (
                <div key={bp.id} className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-muted/30 group">
                  <button onClick={() => toggleBreakpoint(bp.id)} className="flex-shrink-0">
                    {bp.enabled ? (
                      <Circle className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => onNavigateToFile?.(bp.file, bp.line)}
                    className="flex-1 text-left truncate hover:underline"
                  >
                    <span className="text-foreground">{bp.file.split("/").pop()}</span>
                    <span className="text-muted-foreground">:{bp.line}</span>
                  </button>
                  {bp.condition && (
                    <span className="text-amber-400 text-[10px] font-mono truncate max-w-[100px]" title={bp.condition}>
                      {bp.condition}
                    </span>
                  )}
                  <button onClick={() => removeBreakpoint(bp.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted/50 flex-shrink-0">
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </CollapsibleSection>
          </>
        )}
      </div>

      {/* Debug Console */}
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
              onChange={e => setConsoleInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && executeConsole()}
              placeholder="Evaluate expression..."
              className="flex-1 px-1 py-1.5 text-xs font-mono bg-transparent focus:outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION
// ═══════════════════════════════════════════════════════════

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
        {action && <span className="ml-auto" onClick={e => e.stopPropagation()}>{action}</span>}
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

// ═══════════════════════════════════════════════════════════
// VARIABLE NODE (recursive)
// ═══════════════════════════════════════════════════════════

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

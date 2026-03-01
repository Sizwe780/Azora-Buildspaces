"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Square,
  TrendingUp,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Flame,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart2,
  Gauge,
} from "lucide-react"

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface PerformanceMetric {
  label: string
  value: number
  unit: string
  max: number
  status: "good" | "warn" | "critical"
  trend?: "up" | "down" | "stable"
}

interface FlameNode {
  name: string
  selfTime: number
  totalTime: number
  percentage: number
  children: FlameNode[]
  depth: number
}

interface MemorySnapshot {
  timestamp: number
  heapUsed: number
  heapTotal: number
  rss: number
  external: number
}

interface NetworkRequest {
  id: string
  url: string
  method: string
  status: number
  duration: number
  size: number
  timestamp: number
}

interface PerformanceProfilerProps {
  projectId?: string
}

// ═══════════════════════════════════════════════════════════
// PERFORMANCE PROFILER
// ═══════════════════════════════════════════════════════════

export function PerformanceProfilerFull({ projectId }: PerformanceProfilerProps) {
  const [isProfiling, setIsProfiling] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "memory" | "network" | "flamegraph">("overview")
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [memoryHistory, setMemoryHistory] = useState<MemorySnapshot[]>([])
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([])
  const [flameGraph, setFlameGraph] = useState<FlameNode | null>(null)
  const [profileDuration, setProfileDuration] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startProfiling = useCallback(() => {
    setIsProfiling(true)
    setProfileDuration(0)
    setMemoryHistory([])

    // Simulate profiling data updates
    intervalRef.current = setInterval(() => {
      setProfileDuration(prev => prev + 1)

      setMetrics([
        { label: "CPU Usage", value: Math.round(15 + Math.random() * 40), unit: "%", max: 100, status: Math.random() > 0.8 ? "warn" : "good", trend: Math.random() > 0.5 ? "up" : "down" },
        { label: "Memory", value: Math.round(64 + Math.random() * 80), unit: "MB", max: 256, status: Math.random() > 0.9 ? "critical" : "good", trend: "up" },
        { label: "FPS", value: Math.round(45 + Math.random() * 20), unit: "fps", max: 60, status: Math.random() > 0.7 ? "warn" : "good", trend: "stable" },
        { label: "Event Loop", value: Math.round(2 + Math.random() * 15), unit: "ms", max: 50, status: Math.random() > 0.85 ? "warn" : "good", trend: "stable" },
        { label: "DOM Nodes", value: Math.round(800 + Math.random() * 400), unit: "", max: 2000, status: "good", trend: "up" },
        { label: "Network", value: Math.round(10 + Math.random() * 50), unit: "req/s", max: 100, status: "good", trend: "stable" },
      ])

      setMemoryHistory(prev => {
        const snap: MemorySnapshot = {
          timestamp: Date.now(),
          heapUsed: Math.round(64 + Math.random() * 80),
          heapTotal: 256,
          rss: Math.round(120 + Math.random() * 60),
          external: Math.round(5 + Math.random() * 15),
        }
        const updated = [...prev, snap]
        return updated.slice(-60) // Keep last 60 data points
      })

      setNetworkRequests(prev => {
        if (Math.random() > 0.6) {
          const endpoints = ["/api/workspace", "/api/fs/read", "/api/code-chamber/ai", "/api/collaboration/chat", "/api/auth/session"]
          const methods = ["GET", "POST", "PUT"]
          const newReq: NetworkRequest = {
            id: `req_${Date.now()}`,
            url: endpoints[Math.floor(Math.random() * endpoints.length)],
            method: methods[Math.floor(Math.random() * methods.length)],
            status: Math.random() > 0.1 ? 200 : 500,
            duration: Math.round(20 + Math.random() * 300),
            size: Math.round(0.5 + Math.random() * 50),
            timestamp: Date.now(),
          }
          return [...prev, newReq].slice(-50)
        }
        return prev
      })
    }, 1000)
  }, [])

  const stopProfiling = useCallback(() => {
    setIsProfiling(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    // Generate flame graph on stop
    setFlameGraph({
      name: "(root)",
      selfTime: 0,
      totalTime: 1000,
      percentage: 100,
      depth: 0,
      children: [
        {
          name: "renderApp()",
          selfTime: 50,
          totalTime: 600,
          percentage: 60,
          depth: 1,
          children: [
            { name: "EditorPanel.render()", selfTime: 200, totalTime: 350, percentage: 35, depth: 2, children: [
              { name: "Monaco.updateModel()", selfTime: 150, totalTime: 150, percentage: 15, depth: 3, children: [] },
            ]},
            { name: "CollabSync.process()", selfTime: 120, totalTime: 200, percentage: 20, depth: 2, children: [
              { name: "Yjs.applyUpdate()", selfTime: 80, totalTime: 80, percentage: 8, depth: 3, children: [] },
            ]},
          ],
        },
        {
          name: "handleEvents()",
          selfTime: 100,
          totalTime: 300,
          percentage: 30,
          depth: 1,
          children: [
            { name: "dispatchAction()", selfTime: 100, totalTime: 200, percentage: 20, depth: 2, children: [
              { name: "zustand.setState()", selfTime: 50, totalTime: 100, percentage: 10, depth: 3, children: [] },
            ]},
          ],
        },
        {
          name: "GC", selfTime: 100, totalTime: 100, percentage: 10, depth: 1, children: [],
        },
      ],
    })
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good": return "text-green-500"
      case "warn": return "text-amber-500"
      case "critical": return "text-red-500"
      default: return "text-muted-foreground"
    }
  }

  const getBarColor = (status: string) => {
    switch (status) {
      case "good": return "bg-green-500"
      case "warn": return "bg-amber-500"
      case "critical": return "bg-red-500"
      default: return "bg-muted-foreground"
    }
  }

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: <Gauge className="w-3 h-3" /> },
    { id: "memory" as const, label: "Memory", icon: <MemoryStick className="w-3 h-3" /> },
    { id: "network" as const, label: "Network", icon: <Wifi className="w-3 h-3" /> },
    { id: "flamegraph" as const, label: "Flame Graph", icon: <Flame className="w-3 h-3" /> },
  ]

  return (
    <div className="flex flex-col h-full bg-background text-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-1">
          {!isProfiling ? (
            <button onClick={startProfiling} className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-green-500/20 text-green-500 transition-colors">
              <Play className="w-3.5 h-3.5" />
              Start Profiling
            </button>
          ) : (
            <button onClick={stopProfiling} className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-red-500/20 text-red-500 transition-colors">
              <Square className="w-3.5 h-3.5" />
              Stop ({profileDuration}s)
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors ${activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" && (
          <div className="p-3 space-y-2">
            {metrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <TrendingUp className="w-8 h-8 opacity-30" />
                <p className="text-xs">Start profiling to see metrics</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {metrics.map(m => (
                  <div key={m.label} className="p-2 rounded-md border border-border bg-muted/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</span>
                      {m.trend === "up" ? <ArrowUp className="w-3 h-3 text-red-400" /> : m.trend === "down" ? <ArrowDown className="w-3 h-3 text-green-400" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <div className="flex items-end gap-1">
                      <span className={`text-lg font-bold ${getStatusColor(m.status)}`}>{m.value}</span>
                      <span className="text-[10px] text-muted-foreground mb-0.5">{m.unit}</span>
                    </div>
                    <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${getBarColor(m.status)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(m.value / m.max) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "memory" && (
          <div className="p-3 space-y-3">
            {memoryHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <MemoryStick className="w-8 h-8 opacity-30" />
                <p className="text-xs">Start profiling to see memory usage</p>
              </div>
            ) : (
              <>
                {/* Memory Timeline - ASCII chart */}
                <div className="p-2 rounded-md border border-border bg-muted/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Heap Usage Over Time</span>
                    <span className="text-xs font-mono">{memoryHistory[memoryHistory.length - 1]?.heapUsed || 0} MB</span>
                  </div>
                  <div className="h-16 flex items-end gap-px">
                    {memoryHistory.slice(-40).map((snap, i) => (
                      <div key={i} className="flex-1 bg-blue-500/60 rounded-t-sm transition-all duration-300" style={{ height: `${(snap.heapUsed / snap.heapTotal) * 100}%` }} title={`${snap.heapUsed}MB`} />
                    ))}
                  </div>
                </div>
                {/* Memory breakdown */}
                <div className="space-y-1">
                  {(() => {
                    const latest = memoryHistory[memoryHistory.length - 1]
                    if (!latest) return null
                    return [
                      { label: "Heap Used", value: latest.heapUsed, max: latest.heapTotal, color: "bg-blue-500" },
                      { label: "RSS", value: latest.rss, max: 512, color: "bg-purple-500" },
                      { label: "External", value: latest.external, max: 64, color: "bg-amber-500" },
                    ].map(m => (
                      <div key={m.label} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-muted-foreground">{m.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${m.color} rounded-full`} style={{ width: `${(m.value / m.max) * 100}%` }} />
                        </div>
                        <span className="font-mono w-14 text-right">{m.value}MB</span>
                      </div>
                    ))
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "network" && (
          <div>
            {networkRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <Wifi className="w-8 h-8 opacity-30" />
                <p className="text-xs">No network activity captured</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {networkRequests.slice().reverse().map(req => (
                  <div key={req.id} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/20">
                    <span className={`font-mono text-[10px] px-1 rounded ${req.method === "GET" ? "bg-green-500/10 text-green-500" : req.method === "POST" ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"}`}>
                      {req.method}
                    </span>
                    <span className={`font-mono text-[10px] w-8 text-center rounded ${req.status < 400 ? "text-green-500" : "text-red-500"}`}>
                      {req.status}
                    </span>
                    <span className="flex-1 truncate font-mono text-foreground/70">{req.url}</span>
                    <span className={`font-mono ${req.duration > 200 ? "text-amber-500" : "text-muted-foreground"}`}>{req.duration}ms</span>
                    <span className="text-muted-foreground font-mono">{req.size}KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "flamegraph" && (
          <div className="p-3">
            {!flameGraph ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <Flame className="w-8 h-8 opacity-30" />
                <p className="text-xs">Stop profiling to generate flame graph</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <FlameGraphNode node={flameGraph} maxTime={flameGraph.totalTime} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// FLAME GRAPH NODE
// ═══════════════════════════════════════════════════════════

function FlameGraphNode({ node, maxTime }: { node: FlameNode; maxTime: number }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const widthPercent = Math.max((node.totalTime / maxTime) * 100, 5)

  const depthColors = [
    "bg-orange-500/80", "bg-amber-500/80", "bg-red-500/80", "bg-rose-500/80",
    "bg-pink-500/80", "bg-fuchsia-500/80",
  ]

  return (
    <div style={{ width: `${widthPercent}%`, minWidth: "40px" }}>
      <button
        onClick={() => node.children.length > 0 && setIsExpanded(!isExpanded)}
        className={`w-full text-left px-1.5 py-0.5 text-[10px] font-mono text-white rounded-sm mb-0.5 truncate ${depthColors[node.depth % depthColors.length]} hover:opacity-90 transition-opacity`}
        title={`${node.name} - ${node.selfTime}ms self, ${node.totalTime}ms total (${node.percentage}%)`}
      >
        {node.name} ({node.selfTime}ms)
      </button>
      <AnimatePresence>
        {isExpanded && node.children.length > 0 && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden flex flex-wrap gap-0.5 ml-0.5">
            {node.children.map((child, i) => (
              <FlameGraphNode key={i} node={child} maxTime={maxTime} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

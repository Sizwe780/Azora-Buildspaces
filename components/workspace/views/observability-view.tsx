"use client"

import { useState, useEffect } from "react"
import {
  Activity, HeartPulse, AlertTriangle, Bell, CheckCircle2, XCircle,
  Clock, Search, RefreshCw, Server, Cpu, BarChart3, ChevronRight,
  ChevronDown, Info, AlertCircle, Loader2, Eye, Layers, Zap,
  ArrowUpRight, Shield, Gauge
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  latency?: number
  uptime?: number
  lastCheck: number
  dependencies: string[]
  details?: Record<string, any>
}

interface LogEntry {
  id: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string
  service: string
  timestamp: number
  traceId?: string
  metadata?: Record<string, any>
}

interface Trace {
  id: string
  name: string
  service: string
  status: 'active' | 'completed' | 'error'
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

interface Alert {
  id: string
  name: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  service: string
  status: 'active' | 'acknowledged' | 'resolved'
  createdAt: number
}

interface DashboardData {
  overall: { status: string; healthyServices: number; totalServices: number; uptime: number }
  services: ServiceHealth[]
  recentAlerts: Alert[]
  activeTraces: number
}

const STATUS_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  healthy: { dot: 'bg-green-400', bg: 'bg-green-400/10', text: 'text-green-400', border: 'border-green-500/30' },
  degraded: { dot: 'bg-yellow-400', bg: 'bg-yellow-400/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  unhealthy: { dot: 'bg-red-400', bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-500/30' },
  unknown: { dot: 'bg-muted-foreground', bg: 'bg-muted/10', text: 'text-muted-foreground', border: 'border-border' },
}

const LOG_LEVEL_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  debug: { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted/20' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  warn: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  fatal: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/15' },
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-400/10 border-red-500/30',
  warning: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30',
  info: 'text-blue-400 bg-blue-400/10 border-blue-500/30',
}

export function ObservabilityView() {
  const [tab, setTab] = useState('health')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [traces, setTraces] = useState<Trace[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [logFilter, setLogFilter] = useState('all')
  const [logSearch, setLogSearch] = useState('')
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchDashboard()
    fetchAlerts()
  }, [])

  const fetchDashboard = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/observability?action=dashboard')
      const data = await res.json()
      setDashboard(data.dashboard || data)
    } catch (err) { console.error('Failed to fetch dashboard:', err) }
    finally { setIsLoading(false) }
  }

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({ action: 'logs', limit: '200' })
      if (logFilter !== 'all') params.set('level', logFilter)
      if (logSearch) params.set('service', logSearch)
      const res = await fetch(`/api/observability?${params}`)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (err) { console.error('Failed to fetch logs:', err) }
  }

  const fetchTraces = async () => {
    try {
      const res = await fetch('/api/observability?action=traces&limit=50')
      const data = await res.json()
      setTraces(data.traces || [])
    } catch (err) { console.error('Failed to fetch traces:', err) }
  }

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/observability?action=all-alerts')
      const data = await res.json()
      setAlerts(data.alerts || [])
    } catch (err) { console.error('Failed to fetch alerts:', err) }
  }

  const acknowledgeAlert = async (id: string) => {
    try {
      await fetch('/api/observability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge-alert', alertId: id })
      })
      fetchAlerts()
    } catch (err) { console.error('Failed to acknowledge alert:', err) }
  }

  const resolveAlert = async (id: string) => {
    try {
      await fetch('/api/observability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve-alert', alertId: id })
      })
      fetchAlerts()
    } catch (err) { console.error('Failed to resolve alert:', err) }
  }

  useEffect(() => {
    if (tab === 'logs') fetchLogs()
    if (tab === 'traces') fetchTraces()
    if (tab === 'alerts') fetchAlerts()
  }, [tab])

  useEffect(() => {
    if (tab === 'logs') fetchLogs()
  }, [logFilter, logSearch])

  const toggleService = (name: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const overallStatus = dashboard?.overall?.status || 'unknown'
  const overallColors = STATUS_COLORS[overallStatus] || STATUS_COLORS.unknown
  const activeAlertCount = alerts.filter(a => a.status === 'active').length

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Observability</span>
            <Badge variant="outline" className={cn("text-[10px] h-4", overallColors.text, overallColors.border)}>
              {overallStatus}
            </Badge>
            {activeAlertCount > 0 && (
              <Badge className="text-[10px] h-4 bg-red-500/20 text-red-400 border-red-500/30">
                {activeAlertCount} alert{activeAlertCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={fetchDashboard}>
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-transparent h-8 px-2">
          <TabsTrigger value="health" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">Health</TabsTrigger>
          <TabsTrigger value="logs" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">Logs</TabsTrigger>
          <TabsTrigger value="traces" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">Traces</TabsTrigger>
          <TabsTrigger value="alerts" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50 relative">
            Alerts
            {activeAlertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeAlertCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Health Tab */}
        <TabsContent value="health" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {/* Overall Status Card */}
              {dashboard?.overall && (
                <div className={cn("p-3 rounded-lg border", overallColors.bg, overallColors.border)}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", overallColors.dot)} />
                    <span className={cn("text-sm font-bold", overallColors.text)}>
                      System {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold">{dashboard.overall.healthyServices}/{dashboard.overall.totalServices}</div>
                      <div className="text-[10px] text-muted-foreground">Services</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{dashboard.overall.uptime.toFixed(1)}%</div>
                      <div className="text-[10px] text-muted-foreground">Uptime</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{dashboard?.activeTraces || 0}</div>
                      <div className="text-[10px] text-muted-foreground">Active Traces</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Services List */}
              <div className="text-xs font-semibold flex items-center gap-1.5 text-foreground/80">
                <Server className="w-3.5 h-3.5" /> Services
              </div>
              {(dashboard?.services || []).map(service => {
                const colors = STATUS_COLORS[service.status] || STATUS_COLORS.unknown
                const isExpanded = expandedServices.has(service.name)
                return (
                  <div key={service.name} className="rounded-lg border border-border/30 overflow-hidden">
                    <button
                      onClick={() => toggleService(service.name)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <div className={cn("w-2 h-2 rounded-full", colors.dot)} />
                      <span className="text-xs font-medium flex-1 text-left">{service.name}</span>
                      {service.latency !== undefined && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">{service.latency}ms</span>
                      )}
                      <Badge variant="outline" className={cn("text-[9px] h-3.5 px-1", colors.text, colors.border)}>
                        {service.status}
                      </Badge>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-2 pt-0 border-t border-border/20 bg-muted/5">
                        <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                          <div>
                            <span className="text-muted-foreground">Uptime:</span>{' '}
                            <span className="font-medium">{service.uptime?.toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last check:</span>{' '}
                            <span className="font-medium">{new Date(service.lastCheck).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        {service.dependencies.length > 0 && (
                          <div className="mt-1.5 text-[10px] text-muted-foreground">
                            Dependencies: {service.dependencies.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {!dashboard && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <HeartPulse className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">Loading health data...</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="flex-1 m-0 overflow-hidden flex flex-col">
          <div className="px-3 py-1.5 border-b border-border/20 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="Filter by service..."
                className="h-6 text-xs pl-7 bg-transparent border-border/30"
              />
            </div>
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="h-6 w-20 text-[11px] border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="debug" className="text-xs">Debug</SelectItem>
                <SelectItem value="info" className="text-xs">Info</SelectItem>
                <SelectItem value="warn" className="text-xs">Warn</SelectItem>
                <SelectItem value="error" className="text-xs">Error</SelectItem>
                <SelectItem value="fatal" className="text-xs">Fatal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1 font-mono text-[11px]">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Layers className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs font-sans">No logs found</p>
                </div>
              ) : logs.map((log, i) => {
                const cfg = LOG_LEVEL_CONFIG[log.level] || LOG_LEVEL_CONFIG.info
                const Icon = cfg.icon
                return (
                  <div key={i} className={cn("flex items-start gap-1.5 px-2 py-0.5 hover:bg-muted/20 rounded", i % 2 === 0 && "bg-muted/5")}>
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums w-16 flex-shrink-0 pt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant="outline" className={cn("text-[9px] h-3.5 px-1 flex-shrink-0", cfg.color)}>
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className="text-muted-foreground/70 w-16 truncate flex-shrink-0">[{log.service}]</span>
                    <span className="flex-1 break-all">{log.message}</span>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Traces Tab */}
        <TabsContent value="traces" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-1">
              {traces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ArrowUpRight className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">No traces recorded</p>
                </div>
              ) : traces.map(trace => {
                const isActive = trace.status === 'active'
                const isError = trace.status === 'error'
                return (
                  <div key={trace.id} className="px-3 py-2 hover:bg-muted/20 rounded border-b border-border/10">
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                      ) : isError ? (
                        <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      )}
                      <span className="text-xs font-medium truncate flex-1">{trace.name}</span>
                      {trace.duration !== undefined && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">{trace.duration}ms</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 pl-5.5 text-[10px] text-muted-foreground">
                      <span>{trace.service}</span>
                      <span>·</span>
                      <span>{new Date(trace.startTime).toLocaleTimeString()}</span>
                      <span>·</span>
                      <span className="font-mono">{trace.id.slice(0, 12)}...</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1.5">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">No alerts</p>
                  <p className="text-[11px] opacity-60 mt-1">All systems operating normally</p>
                </div>
              ) : alerts.map(alert => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-2.5 rounded-lg border",
                    alert.status === 'resolved' ? 'bg-muted/5 border-border/20 opacity-60' :
                    SEVERITY_COLORS[alert.severity] || 'border-border/30'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {alert.severity === 'critical' ? (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    ) : alert.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{alert.name}</span>
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                          {alert.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>{alert.service}</span>
                        <span>·</span>
                        <span>{new Date(alert.createdAt).toLocaleString()}</span>
                      </div>
                      {alert.status === 'active' && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] px-2"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <Eye className="w-3 h-3 mr-1" /> Acknowledge
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] px-2"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                          </Button>
                        </div>
                      )}
                      {alert.status === 'acknowledged' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] px-2 mt-2"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

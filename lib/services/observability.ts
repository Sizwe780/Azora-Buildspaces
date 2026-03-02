// ═══════════════════════════════════════════════════════════════════════
// TASK 22: OBSERVABILITY & MONITORING SERVICE
// ═══════════════════════════════════════════════════════════════════════

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface ServiceHealth {
  name: string
  status: HealthStatus
  latency: number   // ms
  uptime: number     // percentage
  lastCheck: number
  details?: Record<string, any>
  dependencies: string[]
}

export interface LogEntry {
  id: string
  level: LogLevel
  message: string
  timestamp: number
  service: string
  traceId?: string
  spanId?: string
  metadata: Record<string, any>
}

export interface Trace {
  id: string
  name: string
  service: string
  startTime: number
  endTime?: number
  duration?: number
  status: 'ok' | 'error'
  spans: Span[]
  metadata: Record<string, any>
}

export interface Span {
  id: string
  traceId: string
  parentSpanId?: string
  name: string
  service: string
  startTime: number
  endTime: number
  duration: number
  status: 'ok' | 'error'
  attributes: Record<string, any>
  events: SpanEvent[]
}

export interface SpanEvent {
  name: string
  timestamp: number
  attributes: Record<string, any>
}

export interface Alert {
  id: string
  name: string
  severity: AlertSeverity
  message: string
  service: string
  triggeredAt: number
  resolvedAt?: number
  acknowledged: boolean
  metadata: Record<string, any>
}

export interface DashboardMetric {
  name: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  change: number // percentage
  sparkline: number[]
}

export interface ObservabilityDashboard {
  overallHealth: HealthStatus
  services: ServiceHealth[]
  activeAlerts: Alert[]
  metrics: DashboardMetric[]
  recentLogs: LogEntry[]
  recentTraces: Trace[]
  resourceUsage: {
    cpu: number
    memory: number
    disk: number
    network: { in: number; out: number }
  }
}

class ObservabilityService {
  private services = new Map<string, ServiceHealth>()
  private logs: LogEntry[] = []
  private traces = new Map<string, Trace>()
  private alerts = new Map<string, Alert>()
  private maxLogs = 10000
  private maxTraces = 1000

  constructor() {
    this.registerDefaultServices()
    this.startHealthChecks()
  }

  // ─── Service Health ─────────────────────────────────────────
  registerService(name: string, dependencies: string[] = []): void {
    this.services.set(name, {
      name,
      status: 'healthy',
      latency: 0,
      uptime: 100,
      lastCheck: Date.now(),
      dependencies,
    })
  }

  updateServiceHealth(name: string, status: HealthStatus, latency?: number, details?: Record<string, any>): void {
    const service = this.services.get(name)
    if (service) {
      service.status = status
      if (latency !== undefined) service.latency = latency
      if (details) service.details = details
      service.lastCheck = Date.now()

      if (status === 'unhealthy') {
        this.createAlert(`${name}-down`, `Service ${name} is unhealthy`, 'critical', name)
      }
    }
  }

  getServiceHealth(name: string): ServiceHealth | undefined {
    return this.services.get(name)
  }

  getAllServices(): ServiceHealth[] {
    return Array.from(this.services.values())
  }

  getOverallHealth(): HealthStatus {
    const all = this.getAllServices()
    if (all.some(s => s.status === 'unhealthy')) return 'unhealthy'
    if (all.some(s => s.status === 'degraded')) return 'degraded'
    return 'healthy'
  }

  // ─── Logging ────────────────────────────────────────────────
  log(level: LogLevel, message: string, service: string, metadata: Record<string, any> = {}, traceId?: string): LogEntry {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      level,
      message,
      timestamp: Date.now(),
      service,
      traceId,
      metadata,
    }

    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    if (level === 'error' || level === 'fatal') {
      this.createAlert(`log-${entry.id}`, message, level === 'fatal' ? 'critical' : 'warning', service)
    }

    return entry
  }

  getLogs(filters?: { level?: LogLevel; service?: string; since?: number; search?: string; limit?: number }): LogEntry[] {
    let result = [...this.logs]
    if (filters?.level) result = result.filter(l => l.level === filters.level)
    if (filters?.service) result = result.filter(l => l.service === filters.service)
    if (filters?.since) result = result.filter(l => l.timestamp >= filters.since!)
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(l => l.message.toLowerCase().includes(q))
    }
    return result.sort((a, b) => b.timestamp - a.timestamp).slice(0, filters?.limit || 100)
  }

  // ─── Tracing ────────────────────────────────────────────────
  startTrace(name: string, service: string, metadata: Record<string, any> = {}): Trace {
    const trace: Trace = {
      id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      name,
      service,
      startTime: Date.now(),
      status: 'ok',
      spans: [],
      metadata,
    }
    this.traces.set(trace.id, trace)

    if (this.traces.size > this.maxTraces) {
      const oldest = Array.from(this.traces.keys())[0]
      this.traces.delete(oldest)
    }

    return trace
  }

  endTrace(traceId: string, status: 'ok' | 'error' = 'ok'): void {
    const trace = this.traces.get(traceId)
    if (trace) {
      trace.endTime = Date.now()
      trace.duration = trace.endTime - trace.startTime
      trace.status = status
    }
  }

  addSpan(traceId: string, span: Omit<Span, 'id' | 'traceId'>): Span | null {
    const trace = this.traces.get(traceId)
    if (!trace) return null

    const fullSpan: Span = {
      ...span,
      id: `span-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      traceId,
    }
    trace.spans.push(fullSpan)
    return fullSpan
  }

  getTrace(id: string): Trace | undefined {
    return this.traces.get(id)
  }

  getRecentTraces(limit = 20): Trace[] {
    return Array.from(this.traces.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit)
  }

  // ─── Alerts ─────────────────────────────────────────────────
  createAlert(name: string, message: string, severity: AlertSeverity, service: string, metadata: Record<string, any> = {}): Alert {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name,
      severity,
      message,
      service,
      triggeredAt: Date.now(),
      acknowledged: false,
      metadata,
    }
    this.alerts.set(alert.id, alert)
    return alert
  }

  acknowledgeAlert(id: string): void {
    const alert = this.alerts.get(id)
    if (alert) alert.acknowledged = true
  }

  resolveAlert(id: string): void {
    const alert = this.alerts.get(id)
    if (alert) {
      alert.resolvedAt = Date.now()
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(a => !a.resolvedAt)
      .sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })
  }

  getAllAlerts(limit = 50): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.triggeredAt - a.triggeredAt)
      .slice(0, limit)
  }

  // ─── Dashboard ──────────────────────────────────────────────
  getDashboard(): ObservabilityDashboard {
    const services = this.getAllServices()
    const now = Date.now()

    const generateSparkline = () =>
      Array.from({ length: 20 }, () => Math.floor(Math.random() * 100))

    return {
      overallHealth: this.getOverallHealth(),
      services,
      activeAlerts: this.getActiveAlerts(),
      metrics: [
        { name: 'Requests/min', value: 342, unit: 'req/min', trend: 'up', change: 12, sparkline: generateSparkline() },
        { name: 'Avg Latency', value: 45, unit: 'ms', trend: 'down', change: -8, sparkline: generateSparkline() },
        { name: 'Error Rate', value: 0.3, unit: '%', trend: 'stable', change: 0, sparkline: generateSparkline() },
        { name: 'Active Users', value: 128, unit: 'users', trend: 'up', change: 5, sparkline: generateSparkline() },
        { name: 'CPU Usage', value: 42, unit: '%', trend: 'stable', change: 2, sparkline: generateSparkline() },
        { name: 'Memory', value: 68, unit: '%', trend: 'up', change: 3, sparkline: generateSparkline() },
      ],
      recentLogs: this.getLogs({ limit: 20 }),
      recentTraces: this.getRecentTraces(10),
      resourceUsage: {
        cpu: 42 + Math.floor(Math.random() * 10),
        memory: 68 + Math.floor(Math.random() * 8),
        disk: 35 + Math.floor(Math.random() * 5),
        network: { in: 1250 + Math.floor(Math.random() * 200), out: 890 + Math.floor(Math.random() * 150) },
      },
    }
  }

  private registerDefaultServices(): void {
    this.registerService('editor', [])
    this.registerService('terminal', ['editor'])
    this.registerService('language-server', ['editor'])
    this.registerService('collaboration', ['editor'])
    this.registerService('ai-assistant', [])
    this.registerService('git', [])
    this.registerService('container', [])
    this.registerService('database', [])
    this.registerService('file-system', [])
    this.registerService('build', ['container', 'file-system'])
  }

  private startHealthChecks(): void {
    // Simulate periodic health checks
    setInterval(() => {
      for (const service of this.services.values()) {
        service.latency = Math.floor(Math.random() * 50) + 5
        service.lastCheck = Date.now()
        // Random degradation for simulation
        const rand = Math.random()
        if (rand > 0.98) service.status = 'unhealthy'
        else if (rand > 0.93) service.status = 'degraded'
        else service.status = 'healthy'
      }
    }, 10000)
  }
}

export const observability = new ObservabilityService()

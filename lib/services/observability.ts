import { randomUUID } from 'node:crypto'
import os from 'node:os'

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
  private metricHistory = new Map<string, number[]>()
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
      id: `log-${randomUUID()}`,
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
      id: `trace-${randomUUID()}`,
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
      id: `span-${randomUUID()}`,
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
      id: `alert-${randomUUID()}`,
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

    const oneMinuteAgo = Date.now() - 60_000
    const fiveMinutesAgo = Date.now() - 5 * 60_000
    const recentLogs = this.logs.filter((entry) => entry.timestamp >= oneMinuteAgo)
    const recentLogs5m = this.logs.filter((entry) => entry.timestamp >= fiveMinutesAgo)

    const requestsPerMinute = recentLogs.length
    const latencySamples = recentLogs
      .map((entry) => Number(entry.metadata?.latencyMs))
      .filter((value) => Number.isFinite(value) && value >= 0)
    const avgLatency = latencySamples.length
      ? Math.round(latencySamples.reduce((sum, value) => sum + value, 0) / latencySamples.length)
      : Math.round(
          services.reduce((sum, service) => sum + service.latency, 0) / Math.max(1, services.length)
        )

    const errorLogs = recentLogs.filter((entry) => entry.level === 'error' || entry.level === 'fatal')
    const errorRate = requestsPerMinute > 0
      ? Number(((errorLogs.length / requestsPerMinute) * 100).toFixed(2))
      : 0

    const activeUsers = new Set(
      recentLogs5m
        .map((entry) => entry.metadata?.userId)
        .filter((userId) => typeof userId === 'string' && userId.length > 0)
    ).size

    const activeSpans = this.getRecentTraces(50)
      .flatMap((trace) => trace.spans)
      .filter((span) => span.endTime >= fiveMinutesAgo)
    const recentCpuSpans = activeSpans
      .map((span) => Number(span.attributes?.cpuPercent))
      .filter((value) => Number.isFinite(value) && value >= 0)

    const loadAvg = os.loadavg()[0]
    const cpuFromLoad = Math.round((loadAvg / Math.max(1, os.cpus().length)) * 100)
    const cpuUsage = Math.max(0, Math.min(100, recentCpuSpans[recentCpuSpans.length - 1] ?? cpuFromLoad))

    const memoryUsage = process.memoryUsage()
    const totalMem = os.totalmem()
    const memoryPercent = totalMem > 0 ? Math.round((memoryUsage.rss / totalMem) * 100) : 0

    const networkIn = recentLogs5m.reduce((sum, entry) => sum + Number(entry.metadata?.bytesIn || 0), 0)
    const networkOut = recentLogs5m.reduce((sum, entry) => sum + Number(entry.metadata?.bytesOut || 0), 0)

    const traceDurations = this.getRecentTraces(20)
      .map((trace) => trace.duration)
      .filter((duration): duration is number => typeof duration === 'number' && duration >= 0)
    const trend = (current: number, previous: number) => {
      if (current > previous) return 'up' as const
      if (current < previous) return 'down' as const
      return 'stable' as const
    }

    const previousRequests = this.peekPreviousMetric('Requests/min')
    const previousLatency = this.peekPreviousMetric('Avg Latency')
    const previousErrorRate = this.peekPreviousMetric('Error Rate')
    const previousUsers = this.peekPreviousMetric('Active Users')
    const previousCpu = this.peekPreviousMetric('CPU Usage')
    const previousMemory = this.peekPreviousMetric('Memory')

    return {
      overallHealth: this.getOverallHealth(),
      services,
      activeAlerts: this.getActiveAlerts(),
      metrics: [
        {
          name: 'Requests/min',
          value: requestsPerMinute,
          unit: 'req/min',
          trend: trend(requestsPerMinute, previousRequests),
          change: this.percentDelta(requestsPerMinute, previousRequests),
          sparkline: this.recordMetric('Requests/min', requestsPerMinute),
        },
        {
          name: 'Avg Latency',
          value: avgLatency,
          unit: 'ms',
          trend: trend(avgLatency, previousLatency),
          change: this.percentDelta(avgLatency, previousLatency),
          sparkline: this.recordMetric('Avg Latency', avgLatency),
        },
        {
          name: 'Error Rate',
          value: errorRate,
          unit: '%',
          trend: trend(errorRate, previousErrorRate),
          change: this.percentDelta(errorRate, previousErrorRate),
          sparkline: this.recordMetric('Error Rate', errorRate),
        },
        {
          name: 'Active Users',
          value: activeUsers,
          unit: 'users',
          trend: trend(activeUsers, previousUsers),
          change: this.percentDelta(activeUsers, previousUsers),
          sparkline: this.recordMetric('Active Users', activeUsers),
        },
        {
          name: 'CPU Usage',
          value: cpuUsage,
          unit: '%',
          trend: trend(cpuUsage, previousCpu),
          change: this.percentDelta(cpuUsage, previousCpu),
          sparkline: this.recordMetric('CPU Usage', cpuUsage),
        },
        {
          name: 'Memory',
          value: memoryPercent,
          unit: '%',
          trend: trend(memoryPercent, previousMemory),
          change: this.percentDelta(memoryPercent, previousMemory),
          sparkline: this.recordMetric('Memory', memoryPercent),
        },
      ],
      recentLogs: this.getLogs({ limit: 20 }),
      recentTraces: this.getRecentTraces(10),
      resourceUsage: {
        cpu: cpuUsage,
        memory: memoryPercent,
        disk: 0,
        network: { in: networkIn, out: networkOut },
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
    setInterval(() => {
      for (const service of this.services.values()) {
        const dependencyStatuses = service.dependencies
          .map((dependencyName) => this.services.get(dependencyName)?.status)
          .filter((status): status is HealthStatus => typeof status === 'string')

        if (dependencyStatuses.some((status) => status === 'unhealthy')) {
          service.status = 'degraded'
        } else if (dependencyStatuses.some((status) => status === 'degraded')) {
          service.status = 'degraded'
        } else if (service.status === 'unhealthy') {
          service.status = 'degraded'
        } else {
          service.status = 'healthy'
        }

        const recentLatencySamples = this.logs
          .filter((entry) => entry.service === service.name && entry.timestamp >= Date.now() - 5 * 60_000)
          .map((entry) => Number(entry.metadata?.latencyMs))
          .filter((value) => Number.isFinite(value) && value >= 0)

        if (recentLatencySamples.length > 0) {
          service.latency = Math.round(
            recentLatencySamples.reduce((sum, value) => sum + value, 0) / recentLatencySamples.length
          )
        }

        const unresolvedCriticalAlerts = this.getActiveAlerts().filter(
          (alert) => alert.service === service.name && alert.severity === 'critical'
        ).length
        service.uptime = unresolvedCriticalAlerts > 0 ? 99 : 100
        service.lastCheck = Date.now()
      }
    }, 10000)
  }

  private recordMetric(name: string, value: number): number[] {
    const current = this.metricHistory.get(name) || []
    current.push(value)
    const normalized = current.slice(-20)
    this.metricHistory.set(name, normalized)
    return normalized
  }

  private peekPreviousMetric(name: string): number {
    const current = this.metricHistory.get(name) || []
    if (current.length === 0) return 0
    return current[current.length - 1]
  }

  private percentDelta(current: number, previous: number): number {
    if (previous === 0) return current === 0 ? 0 : 100
    return Math.round(((current - previous) / Math.abs(previous)) * 100)
  }
}

export const observability = new ObservabilityService()

// ═══════════════════════════════════════════════════════════════════════
// TASK 21: TELEMETRY & ANALYTICS SERVICE
// ═══════════════════════════════════════════════════════════════════════

export type TelemetryEventType =
  | 'session.start' | 'session.end'
  | 'editor.open' | 'editor.save' | 'editor.close'
  | 'terminal.command' | 'terminal.output'
  | 'build.start' | 'build.end' | 'build.error'
  | 'test.run' | 'test.pass' | 'test.fail'
  | 'git.commit' | 'git.push' | 'git.pull'
  | 'ai.prompt' | 'ai.completion' | 'ai.accept' | 'ai.reject'
  | 'extension.install' | 'extension.activate'
  | 'debug.start' | 'debug.breakpoint'
  | 'collaboration.join' | 'collaboration.leave'
  | 'error.runtime' | 'error.unhandled'
  | 'performance.metric'

export interface TelemetryEvent {
  id: string
  type: TelemetryEventType
  timestamp: number
  sessionId: string
  userId?: string
  data: Record<string, any>
  tags: string[]
  duration?: number
}

export interface TelemetrySession {
  id: string
  userId?: string
  startedAt: number
  endedAt?: number
  events: number
  language?: string
  framework?: string
  browser?: string
  os?: string
}

export interface MetricPoint {
  name: string
  value: number
  timestamp: number
  unit: string
  tags: Record<string, string>
}

export interface AnalyticsDashboard {
  activeSessions: number
  totalEvents: number
  eventsPerMinute: number
  topEvents: { type: string; count: number }[]
  topLanguages: { language: string; percentage: number }[]
  errorRate: number
  avgSessionDuration: number
  aiAcceptanceRate: number
  buildSuccessRate: number
  testPassRate: number
}

export interface TelemetryConfig {
  enabled: boolean
  anonymize: boolean
  sampleRate: number // 0-1
  batchSize: number
  flushInterval: number // ms
  excludeEvents: TelemetryEventType[]
  retentionDays: number
}

class TelemetryService {
  private events: TelemetryEvent[] = []
  private sessions = new Map<string, TelemetrySession>()
  private metrics: MetricPoint[] = []
  private config: TelemetryConfig = {
    enabled: true,
    anonymize: true,
    sampleRate: 1.0,
    batchSize: 100,
    flushInterval: 30000,
    excludeEvents: [],
    retentionDays: 90,
  }
  private batchQueue: TelemetryEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null

  constructor() {
    this.startFlushTimer()
  }

  getConfig(): TelemetryConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<TelemetryConfig>): TelemetryConfig {
    Object.assign(this.config, updates)
    if (updates.flushInterval) {
      this.startFlushTimer()
    }
    return this.getConfig()
  }

  startSession(userId?: string, metadata?: Record<string, string>): TelemetrySession {
    const session: TelemetrySession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: this.config.anonymize ? undefined : userId,
      startedAt: Date.now(),
      events: 0,
      ...metadata,
    }
    this.sessions.set(session.id, session)
    this.track('session.start', session.id, { userId: session.userId })
    return session
  }

  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.endedAt = Date.now()
      this.track('session.end', sessionId, { duration: session.endedAt - session.startedAt })
    }
  }

  track(type: TelemetryEventType, sessionId: string, data: Record<string, any> = {}, tags: string[] = []): TelemetryEvent | null {
    if (!this.config.enabled) return null
    if (this.config.excludeEvents.includes(type)) return null
    if (Math.random() > this.config.sampleRate) return null

    const event: TelemetryEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      timestamp: Date.now(),
      sessionId,
      data: this.config.anonymize ? this.anonymizeData(data) : data,
      tags,
    }

    this.events.push(event)
    this.batchQueue.push(event)

    const session = this.sessions.get(sessionId)
    if (session) session.events++

    // Auto-flush if batch is full
    if (this.batchQueue.length >= this.config.batchSize) {
      this.flush()
    }

    return event
  }

  recordMetric(name: string, value: number, unit: string, tags: Record<string, string> = {}): MetricPoint {
    const point: MetricPoint = {
      name,
      value,
      timestamp: Date.now(),
      unit,
      tags,
    }
    this.metrics.push(point)
    return point
  }

  getDashboard(): AnalyticsDashboard {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const recentEvents = this.events.filter(e => e.timestamp > oneMinuteAgo)
    const activeSessions = Array.from(this.sessions.values()).filter(s => !s.endedAt)

    const eventCounts = new Map<string, number>()
    for (const e of this.events) {
      eventCounts.set(e.type, (eventCounts.get(e.type) || 0) + 1)
    }

    const topEvents = Array.from(eventCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const languageCounts = new Map<string, number>()
    for (const s of this.sessions.values()) {
      if (s.language) languageCounts.set(s.language, (languageCounts.get(s.language) || 0) + 1)
    }
    const totalLangSessions = Array.from(languageCounts.values()).reduce((s, v) => s + v, 0) || 1
    const topLanguages = Array.from(languageCounts.entries())
      .map(([language, count]) => ({ language, percentage: Math.round((count / totalLangSessions) * 100) }))
      .sort((a, b) => b.percentage - a.percentage)

    const errors = this.events.filter(e => e.type.startsWith('error.')).length
    const builds = this.events.filter(e => e.type === 'build.end')
    const buildSuccess = builds.filter(e => e.data.success).length

    const tests = this.events.filter(e => e.type === 'test.pass' || e.type === 'test.fail')
    const testPasses = this.events.filter(e => e.type === 'test.pass').length

    const aiEvents = this.events.filter(e => e.type === 'ai.accept' || e.type === 'ai.reject')
    const aiAccepts = this.events.filter(e => e.type === 'ai.accept').length

    const completedSessions = Array.from(this.sessions.values()).filter(s => s.endedAt)
    const avgDuration = completedSessions.length
      ? completedSessions.reduce((s, ses) => s + (ses.endedAt! - ses.startedAt), 0) / completedSessions.length
      : 0

    return {
      activeSessions: activeSessions.length,
      totalEvents: this.events.length,
      eventsPerMinute: recentEvents.length,
      topEvents,
      topLanguages,
      errorRate: this.events.length ? (errors / this.events.length) * 100 : 0,
      avgSessionDuration: avgDuration,
      aiAcceptanceRate: aiEvents.length ? (aiAccepts / aiEvents.length) * 100 : 0,
      buildSuccessRate: builds.length ? (buildSuccess / builds.length) * 100 : 0,
      testPassRate: tests.length ? (testPasses / tests.length) * 100 : 0,
    }
  }

  getEvents(filters?: { type?: TelemetryEventType; sessionId?: string; since?: number; limit?: number }): TelemetryEvent[] {
    let result = [...this.events]
    if (filters?.type) result = result.filter(e => e.type === filters.type)
    if (filters?.sessionId) result = result.filter(e => e.sessionId === filters.sessionId)
    if (filters?.since) result = result.filter(e => e.timestamp >= filters.since!)
    return result.sort((a, b) => b.timestamp - a.timestamp).slice(0, filters?.limit || 100)
  }

  getMetrics(name?: string, since?: number): MetricPoint[] {
    let result = [...this.metrics]
    if (name) result = result.filter(m => m.name === name)
    if (since) result = result.filter(m => m.timestamp >= since)
    return result
  }

  getActiveSessions(): TelemetrySession[] {
    return Array.from(this.sessions.values()).filter(s => !s.endedAt)
  }

  getSession(id: string): TelemetrySession | undefined {
    return this.sessions.get(id)
  }

  private flush(): void {
    if (this.batchQueue.length === 0) return
    // In production, send to telemetry endpoint
    this.batchQueue = []
  }

  private startFlushTimer(): void {
    if (this.flushTimer) clearInterval(this.flushTimer)
    this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval)
  }

  private anonymizeData(data: Record<string, any>): Record<string, any> {
    const anonymized: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      if (['email', 'ip', 'userId', 'userName', 'password', 'token', 'secret'].includes(key)) {
        anonymized[key] = '[redacted]'
      } else {
        anonymized[key] = value
      }
    }
    return anonymized
  }

  clearData(): void {
    this.events = []
    this.metrics = []
    this.sessions.clear()
  }
}

export const telemetry = new TelemetryService()

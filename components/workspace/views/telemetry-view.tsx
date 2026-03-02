"use client"

import { useState, useEffect } from "react"
import {
  LineChart, BarChart3, Activity, Users, Clock, Zap, ArrowUp, ArrowDown,
  Settings2, Eye, EyeOff, RefreshCw, Download, Filter, Cpu, HardDrive,
  Globe, MousePointer, Timer, TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface DashboardData {
  totalEvents: number
  activeSessions: number
  avgSessionDuration: number
  eventsPerMinute: number
  topEvents: { type: string; count: number }[]
  recentEvents: TelemetryEvent[]
}

interface TelemetryEvent {
  id: string
  type: string
  sessionId: string
  timestamp: number
  data: Record<string, any>
  tags: string[]
}

interface TelemetryMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  tags: string[]
}

interface TelemetryConfig {
  enabled: boolean
  sampleRate: number
  maxEventsPerSession: number
  retentionDays: number
  anonymize: boolean
  excludePatterns: string[]
}

export function TelemetryView() {
  const [tab, setTab] = useState('dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [events, setEvents] = useState<TelemetryEvent[]>([])
  const [metrics, setMetrics] = useState<TelemetryMetric[]>([])
  const [config, setConfig] = useState<TelemetryConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [timeRange, setTimeRange] = useState('1h')

  useEffect(() => {
    fetchDashboard()
    fetchConfig()
  }, [])

  const fetchDashboard = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/telemetry?action=dashboard')
      const data = await res.json()
      setDashboard(data.dashboard || data)
    } catch (err) { console.error('Failed to fetch dashboard:', err) }
    finally { setIsLoading(false) }
  }

  const fetchEvents = async () => {
    try {
      const since = Date.now() - (timeRange === '1h' ? 3600000 : timeRange === '24h' ? 86400000 : 604800000)
      const res = await fetch(`/api/telemetry?action=events&since=${since}&limit=100`)
      const data = await res.json()
      setEvents(data.events || [])
    } catch (err) { console.error('Failed to fetch events:', err) }
  }

  const fetchMetrics = async () => {
    try {
      const since = Date.now() - 3600000
      const res = await fetch(`/api/telemetry?action=metrics&since=${since}`)
      const data = await res.json()
      setMetrics(data.metrics || [])
    } catch (err) { console.error('Failed to fetch metrics:', err) }
  }

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/telemetry?action=config')
      const data = await res.json()
      setConfig(data.config || data)
    } catch (err) { console.error('Failed to fetch config:', err) }
  }

  const updateConfig = async (updates: Partial<TelemetryConfig>) => {
    try {
      const res = await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-config', ...updates })
      })
      const data = await res.json()
      setConfig(data.config || data)
    } catch (err) { console.error('Failed to update config:', err) }
  }

  useEffect(() => {
    if (tab === 'events') fetchEvents()
    if (tab === 'metrics') fetchMetrics()
  }, [tab, timeRange])

  const StatCard = ({ icon: Icon, label, value, subtitle, color, trend }: {
    icon: any; label: string; value: string | number; subtitle?: string; color: string; trend?: 'up' | 'down'
  }) => (
    <div className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-1.5">
      <div className="flex items-center justify-between">
        <Icon className={cn("w-4 h-4", color)} />
        {trend && (
          <div className={cn("flex items-center gap-0.5 text-[10px] font-medium",
            trend === 'up' ? 'text-green-400' : 'text-red-400'
          )}>
            {trend === 'up' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
            {trend === 'up' ? '+12%' : '-3%'}
          </div>
        )}
      </div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      {subtitle && <div className="text-[10px] text-muted-foreground/60">{subtitle}</div>}
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Telemetry</span>
            {config?.enabled ? (
              <Badge variant="outline" className="text-[10px] h-4 border-green-500/30 text-green-400">Active</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-4 border-muted text-muted-foreground">Paused</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={fetchDashboard}>
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-transparent h-8 px-2">
          <TabsTrigger value="dashboard" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">Overview</TabsTrigger>
          <TabsTrigger value="events" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">Events</TabsTrigger>
          <TabsTrigger value="metrics" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">Metrics</TabsTrigger>
          <TabsTrigger value="settings" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {dashboard ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard icon={Zap} label="Total Events" value={dashboard.totalEvents.toLocaleString()} color="text-indigo-400" trend="up" />
                    <StatCard icon={Users} label="Active Sessions" value={dashboard.activeSessions} color="text-blue-400" />
                    <StatCard icon={Timer} label="Avg Duration" value={`${(dashboard.avgSessionDuration / 1000).toFixed(0)}s`} color="text-amber-400" />
                    <StatCard icon={Activity} label="Events/min" value={dashboard.eventsPerMinute.toFixed(1)} color="text-emerald-400" trend="up" />
                  </div>

                  {/* Top Events */}
                  <div className="rounded-lg bg-muted/10 border border-border/30 p-3">
                    <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                      Top Events
                    </div>
                    <div className="space-y-2">
                      {(dashboard.topEvents || []).slice(0, 5).map((evt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-4 text-right">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs truncate font-mono">{evt.type}</span>
                              <span className="text-[10px] text-muted-foreground tabular-nums ml-2">{evt.count}</span>
                            </div>
                            <Progress value={Math.min(100, (evt.count / (dashboard.topEvents[0]?.count || 1)) * 100)} className="h-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent activity */}
                  <div className="rounded-lg bg-muted/10 border border-border/30 p-3">
                    <div className="text-xs font-semibold mb-2">Recent Activity</div>
                    {(dashboard.recentEvents || []).slice(0, 8).map((evt, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 text-[11px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                        <span className="font-mono truncate flex-1">{evt.type}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <LineChart className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">Loading dashboard...</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="events" className="flex-1 m-0 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border/20 flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-6 w-20 text-[11px] border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h" className="text-xs">1 hour</SelectItem>
                <SelectItem value="24h" className="text-xs">24 hours</SelectItem>
                <SelectItem value="7d" className="text-xs">7 days</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[11px] text-muted-foreground">{events.length} events</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Activity className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">No events in this period</p>
                </div>
              ) : events.map((evt, i) => (
                <div key={i} className="px-3 py-1.5 hover:bg-muted/20 rounded flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium">{evt.type}</span>
                      {evt.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-[9px] h-3.5 px-1">{tag}</Badge>
                      ))}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(evt.timestamp).toLocaleString()} · Session: {evt.sessionId.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="metrics" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {metrics.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart3 className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">No metrics recorded</p>
                </div>
              ) : metrics.map((m, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-muted/15 border border-border/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono font-medium truncate">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground">{m.tags.join(', ')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums">{m.value.toFixed(1)}</div>
                    <div className="text-[10px] text-muted-foreground">{m.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {config ? (
                <>
                  <div className="text-xs font-semibold text-foreground/80">Telemetry Configuration</div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/15 border border-border/30">
                      <div>
                        <div className="text-xs font-medium">Telemetry Enabled</div>
                        <div className="text-[10px] text-muted-foreground">Collect usage data and analytics</div>
                      </div>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(enabled) => updateConfig({ enabled })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/15 border border-border/30">
                      <div>
                        <div className="text-xs font-medium">Anonymize Data</div>
                        <div className="text-[10px] text-muted-foreground">Strip PII from all events</div>
                      </div>
                      <Switch
                        checked={config.anonymize}
                        onCheckedChange={(anonymize) => updateConfig({ anonymize })}
                      />
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/15 border border-border/30 space-y-1.5">
                      <div className="text-xs font-medium">Sample Rate</div>
                      <div className="text-[10px] text-muted-foreground">Percentage of events to capture</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={config.sampleRate * 100}
                          onChange={(e) => updateConfig({ sampleRate: Number(e.target.value) / 100 })}
                          className="flex-1 h-1.5 accent-primary"
                        />
                        <span className="text-xs font-mono w-10 text-right">{(config.sampleRate * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/15 border border-border/30 space-y-1.5">
                      <div className="text-xs font-medium">Retention Period</div>
                      <div className="text-[10px] text-muted-foreground">Days to keep telemetry data</div>
                      <Select
                        value={String(config.retentionDays)}
                        onValueChange={(v) => updateConfig({ retentionDays: Number(v) })}
                      >
                        <SelectTrigger className="h-7 text-xs bg-transparent border-border/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7" className="text-xs">7 days</SelectItem>
                          <SelectItem value="30" className="text-xs">30 days</SelectItem>
                          <SelectItem value="90" className="text-xs">90 days</SelectItem>
                          <SelectItem value="365" className="text-xs">1 year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Settings2 className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">Loading configuration...</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

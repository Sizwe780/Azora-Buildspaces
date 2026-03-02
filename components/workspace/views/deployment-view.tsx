"use client"

import { useState, useEffect } from "react"
import {
  Rocket, Globe, Cloud, Server, Play, Square, RefreshCw, Trash2,
  ExternalLink, Download, CheckCircle2, XCircle, Loader2, Clock,
  ChevronRight, ChevronDown, Package, FileArchive, Settings2,
  Copy, Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface DeploymentTarget {
  id: string
  name: string
  provider: string
  status: 'idle' | 'building' | 'deploying' | 'live' | 'failed' | 'stopped'
  url?: string
  createdAt: number
  updatedAt: number
  buildLogs: string[]
}

interface DeploymentPreset {
  id: string
  name: string
  description: string
  provider: string
  icon: string
  popularity: number
}

interface Provider {
  id: string
  name: string
  icon: string
}

interface BuildStep {
  name: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  duration?: number
  logs: string[]
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  idle: { color: 'text-muted-foreground', bg: 'bg-muted/20', icon: Clock },
  building: { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Loader2 },
  deploying: { color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Loader2 },
  live: { color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle2 },
  failed: { color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle },
  stopped: { color: 'text-muted-foreground', bg: 'bg-muted/10', icon: Square },
  pending: { color: 'text-muted-foreground', bg: 'bg-muted/10', icon: Clock },
  running: { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Loader2 },
  success: { color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle2 },
  skipped: { color: 'text-muted-foreground/50', bg: 'bg-muted/5', icon: Clock },
}

export function DeploymentView() {
  const [tab, setTab] = useState('deploy')
  const [presets, setPresets] = useState<DeploymentPreset[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [deployments, setDeployments] = useState<DeploymentTarget[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([])
  const [activeDeployment, setActiveDeployment] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState('zip')
  const [isExporting, setIsExporting] = useState(false)
  const [providerFilter, setProviderFilter] = useState('all')

  useEffect(() => {
    fetchPresets()
    fetchProviders()
    fetchDeployments()
  }, [])

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/deployment?action=presets')
      const data = await res.json()
      setPresets(data.presets || [])
    } catch (err) { console.error('Failed to fetch presets:', err) }
  }

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/deployment?action=providers')
      const data = await res.json()
      setProviders(data.providers || [])
    } catch (err) { console.error('Failed to fetch providers:', err) }
  }

  const fetchDeployments = async () => {
    try {
      const res = await fetch('/api/deployment?action=deployments')
      const data = await res.json()
      setDeployments(data.deployments || [])
    } catch (err) { console.error('Failed to fetch deployments:', err) }
  }

  const deploy = async () => {
    if (!selectedPreset) return
    setIsDeploying(true)
    try {
      const res = await fetch('/api/deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deploy', presetId: selectedPreset })
      })
      const data = await res.json()
      if (data.deployment) {
        setActiveDeployment(data.deployment.id)
        setTab('history')
        fetchDeployments()
        // Poll for updates
        const interval = setInterval(async () => {
          const updated = await fetch(`/api/deployment?action=deployment&id=${data.deployment.id}`)
          const d = await updated.json()
          if (d.deployment) {
            setDeployments(prev => prev.map(dp => dp.id === d.deployment.id ? d.deployment : dp))
            if (['live', 'failed', 'stopped'].includes(d.deployment.status)) {
              clearInterval(interval)
              setIsDeploying(false)
            }
          }
        }, 2000)
        setTimeout(() => clearInterval(interval), 30000) // Safety timeout
      }
    } catch (err) {
      console.error('Failed to deploy:', err)
      setIsDeploying(false)
    }
  }

  const stopDeployment = async (id: string) => {
    await fetch('/api/deployment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', deploymentId: id })
    })
    fetchDeployments()
  }

  const deleteDeployment = async (id: string) => {
    await fetch('/api/deployment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', deploymentId: id })
    })
    fetchDeployments()
  }

  const exportProject = async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', format: exportFormat })
      })
      const data = await res.json()
      if (data.export) {
        // Trigger download in a real implementation
        alert(`Export ready: ${data.export.filename} (${(data.export.size / 1024 / 1024).toFixed(1)} MB)`)
      }
    } catch (err) { console.error('Failed to export:', err) }
    finally { setIsExporting(false) }
  }

  const filteredPresets = providerFilter === 'all'
    ? presets
    : presets.filter(p => p.provider === providerFilter)

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Deploy & Export</span>
          </div>
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={fetchDeployments}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-transparent h-8 px-2">
          <TabsTrigger value="deploy" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">Deploy</TabsTrigger>
          <TabsTrigger value="history" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">History</TabsTrigger>
          <TabsTrigger value="export" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">Export</TabsTrigger>
        </TabsList>

        {/* Deploy Tab */}
        <TabsContent value="deploy" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {/* Provider filter */}
              <div className="flex items-center gap-2">
                <Select value={providerFilter} onValueChange={setProviderFilter}>
                  <SelectTrigger className="h-7 text-xs bg-muted/30 border-border/40 flex-1">
                    <SelectValue placeholder="All providers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Providers</SelectItem>
                    {providers.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.icon} {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preset cards */}
              <div className="space-y-1.5">
                {filteredPresets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border transition-all",
                      selectedPreset === preset.id
                        ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/30 bg-muted/10 hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{preset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{preset.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{preset.description}</div>
                      </div>
                      {selectedPreset === preset.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Deploy button */}
              <Button
                className="w-full h-9 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold text-xs"
                disabled={!selectedPreset || isDeploying}
                onClick={deploy}
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="w-3.5 h-3.5 mr-2" />
                    Deploy Now
                  </>
                )}
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1.5">
              {deployments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Cloud className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">No deployments yet</p>
                  <p className="text-[11px] opacity-60 mt-1">Deploy your project to get started</p>
                </div>
              ) : deployments.map(dep => {
                const cfg = STATUS_CONFIG[dep.status] || STATUS_CONFIG.idle
                const Icon = cfg.icon
                return (
                  <div key={dep.id} className={cn("p-2.5 rounded-lg border border-border/30", cfg.bg)}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-4 h-4 flex-shrink-0", cfg.color, ['building', 'deploying'].includes(dep.status) && "animate-spin")} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{dep.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(dep.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5", cfg.color)}>
                        {dep.status}
                      </Badge>
                    </div>
                    {dep.url && (
                      <div className="flex items-center gap-1.5 mt-1.5 pl-6">
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        <a href={dep.url} target="_blank" rel="noopener" className="text-[11px] text-primary hover:underline truncate flex-1">
                          {dep.url}
                        </a>
                        <Button variant="ghost" size="icon" className="w-5 h-5" title="Copy URL">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-5 h-5" title="Open in browser">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 pl-6">
                      {dep.status === 'live' && (
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={() => stopDeployment(dep.id)}>
                          <Square className="w-2.5 h-2.5 mr-1" /> Stop
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2 text-destructive hover:text-destructive" onClick={() => deleteDeployment(dep.id)}>
                        <Trash2 className="w-2.5 h-2.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <div className="text-xs font-semibold text-foreground/80">Export Project</div>

              {[
                { id: 'zip', label: 'ZIP Archive', desc: 'Standard zip file with all project files', icon: '📦' },
                { id: 'tar.gz', label: 'Tar.gz', desc: 'Compressed tarball for Unix systems', icon: '🗜' },
                { id: 'docker', label: 'Docker Image', desc: 'Export as Docker container definition', icon: '🐋' },
                { id: 'git-bundle', label: 'Git Bundle', desc: 'Git bundle with full history', icon: '📚' },
                { id: 'static-site', label: 'Static Site', desc: 'Built static files ready to host', icon: '🌐' },
              ].map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => setExportFormat(fmt.id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg border transition-all",
                    exportFormat === fmt.id
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/30 bg-muted/10 hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{fmt.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs font-semibold">{fmt.label}</div>
                      <div className="text-[10px] text-muted-foreground">{fmt.desc}</div>
                    </div>
                    {exportFormat === fmt.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}

              <Button
                className="w-full h-9 text-xs font-semibold"
                disabled={isExporting}
                onClick={exportProject}
              >
                {isExporting ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Exporting...</>
                ) : (
                  <><Download className="w-3.5 h-3.5 mr-2" /> Export Project</>
                )}
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

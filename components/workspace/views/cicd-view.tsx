"use client"

import { useState, useEffect } from "react"
import { GitBranch, Play, Square, Clock, CheckCircle2, XCircle, AlertTriangle, Loader2, Plus, ExternalLink, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"

interface Pipeline {
  id: string
  name: string
  provider: 'github-actions' | 'gitlab-ci' | 'circleci' | 'jenkins'
  status: 'idle' | 'running' | 'success' | 'failed' | 'cancelled'
  lastRun?: number
  branch?: string
  duration?: number
  stages?: PipelineStage[]
}

interface PipelineStage {
  name: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  duration?: number
}

interface Template {
  id: string
  name: string
  description: string
  provider: string
}

const STATUS_ICONS: Record<string, { icon: any; color: string }> = {
  idle: { icon: Clock, color: 'text-muted-foreground' },
  running: { icon: Loader2, color: 'text-blue-400' },
  success: { icon: CheckCircle2, color: 'text-green-400' },
  failed: { icon: XCircle, color: 'text-red-400' },
  cancelled: { icon: AlertTriangle, color: 'text-yellow-400' },
  pending: { icon: Clock, color: 'text-muted-foreground' },
  skipped: { icon: Clock, color: 'text-muted-foreground/50' },
}

const PROVIDER_LABELS: Record<string, string> = {
  'github-actions': 'GitHub Actions',
  'gitlab-ci': 'GitLab CI',
  'circleci': 'CircleCI',
  'jenkins': 'Jenkins',
}

export function CICDView() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [tab, setTab] = useState('pipelines')
  const [newPipelineName, setNewPipelineName] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('github-actions')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchPipelines()
    fetchTemplates()
  }, [])

  const fetchPipelines = async () => {
    try {
      const res = await fetch('/api/cicd?action=pipelines')
      const data = await res.json()
      setPipelines(data.pipelines || [])
    } catch {
      setPipelines([
        { id: 'p1', name: 'Build & Test', provider: 'github-actions', status: 'success', lastRun: Date.now() - 3600000, branch: 'main', duration: 124,
          stages: [
            { name: 'Install', status: 'success', duration: 15 },
            { name: 'Lint', status: 'success', duration: 8 },
            { name: 'Test', status: 'success', duration: 67 },
            { name: 'Build', status: 'success', duration: 34 },
          ]},
        { id: 'p2', name: 'Deploy Preview', provider: 'github-actions', status: 'running', lastRun: Date.now() - 120000, branch: 'feat/new-ui', duration: 62,
          stages: [
            { name: 'Build', status: 'success', duration: 45 },
            { name: 'Deploy', status: 'running' },
            { name: 'E2E Tests', status: 'pending' },
          ]},
        { id: 'p3', name: 'Release', provider: 'github-actions', status: 'idle', branch: 'main' },
      ])
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/cicd?action=templates')
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch {
      setTemplates([
        { id: 'nextjs', name: 'Next.js CI/CD', description: 'Build, test, and deploy Next.js apps', provider: 'github-actions' },
        { id: 'python', name: 'Python CI', description: 'Lint, test, and publish Python packages', provider: 'github-actions' },
        { id: 'docker', name: 'Docker Build', description: 'Build and push Docker images', provider: 'github-actions' },
        { id: 'rust', name: 'Rust CI', description: 'Clippy, test, and release Rust crates', provider: 'github-actions' },
      ])
    }
  }

  const handleTrigger = async (pipelineId: string) => {
    setIsLoading(true)
    try {
      await fetch('/api/cicd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', pipelineId, branch: 'main' }),
      })
      await fetchPipelines()
    } catch { /* noop */ }
    setIsLoading(false)
  }

  const handleCancel = async (runId: string) => {
    try {
      await fetch('/api/cicd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', runId }),
      })
      await fetchPipelines()
    } catch { /* noop */ }
  }

  const handleCreateFromTemplate = async (templateId: string) => {
    setIsLoading(true)
    try {
      await fetch('/api/cicd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-from-template', templateId, name: `${templateId}-pipeline` }),
      })
      await fetchPipelines()
    } catch { /* noop */ }
    setIsLoading(false)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Rocket className="w-4 h-4 text-orange-400" />
        <span className="text-xs font-semibold uppercase tracking-wider">CI/CD Pipelines</span>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2 bg-muted/50">
          <TabsTrigger value="pipelines" className="text-xs">Pipelines</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="pipelines" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {pipelines.map(pipeline => {
                const StatusIcon = STATUS_ICONS[pipeline.status]?.icon || Clock
                const statusColor = STATUS_ICONS[pipeline.status]?.color || 'text-muted-foreground'
                return (
                  <div key={pipeline.id} className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${statusColor} ${pipeline.status === 'running' ? 'animate-spin' : ''}`} />
                        <span className="text-sm font-medium">{pipeline.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {pipeline.status === 'running' ? (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCancel(pipeline.id)}>
                            <Square className="w-3 h-3 text-red-400" />
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleTrigger(pipeline.id)} disabled={isLoading}>
                            <Play className="w-3 h-3 text-green-400" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                      {pipeline.branch && (
                        <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{pipeline.branch}</span>
                      )}
                      {pipeline.lastRun && <span>{formatTimeAgo(pipeline.lastRun)}</span>}
                      {pipeline.duration && <span>{formatDuration(pipeline.duration)}</span>}
                      <Badge variant="outline" className="text-[9px]">{PROVIDER_LABELS[pipeline.provider]}</Badge>
                    </div>

                    {/* Pipeline stages visualization */}
                    {pipeline.stages && (
                      <div className="flex items-center gap-1">
                        {pipeline.stages.map((stage, i) => {
                          const StageIcon = STATUS_ICONS[stage.status]?.icon || Clock
                          const stageColor = STATUS_ICONS[stage.status]?.color || 'text-muted-foreground'
                          return (
                            <div key={stage.name} className="flex items-center">
                              {i > 0 && <div className={`w-4 h-0.5 ${stage.status === 'success' ? 'bg-green-400' : stage.status === 'running' ? 'bg-blue-400' : 'bg-border'}`} />}
                              <div className="flex flex-col items-center gap-0.5">
                                <StageIcon className={`w-3 h-3 ${stageColor} ${stage.status === 'running' ? 'animate-spin' : ''}`} />
                                <span className="text-[9px] text-muted-foreground">{stage.name}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {templates.map(template => (
                <div key={template.id} className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{template.name}</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleCreateFromTemplate(template.id)} disabled={isLoading}>
                      <Plus className="w-3 h-3 mr-1" /> Use
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">{template.provider}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

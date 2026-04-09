"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRoomEvents } from "@/lib/hooks/use-room-events"
import { motion, AnimatePresence } from "framer-motion"
import { SpecValidator, SpecType } from "@/lib/spec-kit"
import { useSpecStore } from "@/lib/stores/spec-store"
import { useSession } from "next-auth/react"
import { useFileSystem } from "@/lib/stores/file-system"
import Editor, { type OnMount } from "@monaco-editor/react"
import * as Y from "yjs"
// Dynamic imports for browser-only modules (they access window at module level)
const getWebsocketProvider = () => import("y-websocket").then(m => m.WebsocketProvider)
const getMonacoBinding = () => import("y-monaco").then(m => m.MonacoBinding)
import {
  FileJson,
  CheckCircle2,
  AlertCircle,
  Play,
  Save,
  Wand2,
  LayoutTemplate,
  Code2,
  Settings,
  Download,
  Users,
  GitBranch,
  Search,
  Zap,
  Target,
  Clock,
  Eye,
  MessageSquare,
  Copy,
  Check,
  Plus,
  ChevronRight,
  Layers,
  Database,
  Globe,
  Sparkles,
  Brain,
  X,
  RefreshCw,
  Trash2,
  TestTube,
  FileUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { VisualBuilder } from "./visual-builder"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { Mermaid } from "@/components/shared/mermaid"
import { LangGraphOrchestrator } from "@/lib/agents/langgraph-orchestrator"
import yaml from "js-yaml"

/* ─── types ─── */
interface SpecDocument {
  id: string
  title: string
  type: SpecType
  content: string
  status: "draft" | "review" | "approved" | "archived"
  version: string
  lastModified: Date
  author: string
}

/* ─── template configs ─── */
const SPEC_TEMPLATES = [
  {
    type: "component" as SpecType,
    name: "React Component",
    description: "UI component with props, state & accessibility",
    icon: LayoutTemplate,
    complexity: "Medium",
    color: "text-blue-400",
  },
  {
    type: "api" as SpecType,
    name: "REST API Endpoint",
    description: "HTTP API with schemas, auth & rate limiting",
    icon: Globe,
    complexity: "High",
    color: "text-green-400",
  },
  {
    type: "database" as SpecType,
    name: "Database Schema",
    description: "Data model with relationships & migrations",
    icon: Database,
    complexity: "High",
    color: "text-orange-400",
  },
  {
    type: "workflow" as SpecType,
    name: "Business Workflow",
    description: "Process flow with decision points & triggers",
    icon: Zap,
    complexity: "High",
    color: "text-yellow-400",
  },
  {
    type: "feature" as SpecType,
    name: "Feature Specification",
    description: "Complete feature with acceptance criteria",
    icon: Target,
    complexity: "Expert",
    color: "text-purple-400",
  },
]

/* ─── code block renderer ─── */
function CodeOutput({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        className="absolute top-3 right-3 z-10 h-7 px-2 text-xs text-muted-foreground hover:text-white bg-muted/80"
      >
        {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
        {copied ? "Copied" : "Copy"}
      </Button>
      <Editor
        height="100%"
        language={language}
        value={code}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          readOnly: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          fontFamily: "'JetBrains Mono', monospace",
          padding: { top: 12 },
        }}
      />
    </div>
  )
}

/* ─── Rich Spec Preview ─── */
function SpecPreview({ content, activeType, acceptanceCriteria, stakeholders }: {
  content: string
  activeType: SpecType
  acceptanceCriteria: { id: string; text: string; checked: boolean }[]
  stakeholders: { id: string; name: string; status: string }[]
}) {
  let spec: any = null
  let parseError: string | null = null

  try {
    spec = yaml.load(content) as any
  } catch (e: any) {
    parseError = e.message || "Invalid YAML"
  }

  if (parseError || !spec) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-4 text-zinc-200">Specification Preview</h2>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          Cannot parse YAML: {parseError || "Empty content"}
        </div>
        <pre className="mt-4 bg-muted border border-border rounded-lg p-4 text-sm font-mono text-zinc-300 whitespace-pre-wrap">{content}</pre>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title & Meta */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs border-purple-600 text-purple-400">{spec.type || activeType}</Badge>
          {spec.version && <Badge variant="outline" className="text-xs border-border">{spec.version}</Badge>}
        </div>
        <h2 className="text-2xl font-bold text-foreground">{spec.name || spec.title || "Untitled Spec"}</h2>
        {spec.description && <p className="text-sm text-muted-foreground leading-relaxed">{spec.description}</p>}
      </div>

      {/* Requirements */}
      {spec.requirements && Array.isArray(spec.requirements) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" /> Requirements
          </h3>
          <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
            {spec.requirements.map((req: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <ChevronRight className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                <span>{req}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Props (for component specs) */}
      {spec.props && Array.isArray(spec.props) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" /> Props
          </h3>
          <div className="bg-muted/50 border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left p-3 font-medium">Name</th><th className="text-left p-3 font-medium">Type</th><th className="text-left p-3 font-medium">Required</th><th className="text-left p-3 font-medium">Default</th></tr></thead>
              <tbody>
                {spec.props.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-border/50"><td className="p-3 text-zinc-200 font-mono text-xs">{p.name}</td><td className="p-3 text-blue-400 font-mono text-xs">{p.type}</td><td className="p-3">{p.required ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-zinc-600">—</span>}</td><td className="p-3 text-muted-foreground font-mono text-xs">{p.default ?? "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Endpoints (for API specs) */}
      {spec.endpoints && Array.isArray(spec.endpoints) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-400" /> Endpoints
          </h3>
          <div className="space-y-3">
            {spec.endpoints.map((ep: any, i: number) => (
              <div key={i} className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="text-[10px] font-bold bg-green-600/20 text-green-400">{ep.method || "GET"}</Badge>
                  <code className="text-sm text-zinc-200 font-mono">{ep.path || ep.url}</code>
                </div>
                {ep.description && <p className="text-xs text-muted-foreground mt-1">{ep.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tables (for DB specs) */}
      {spec.tables && Array.isArray(spec.tables) && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-orange-400" /> Database Architecture
          </h3>

          <div className="bg-background border border-border rounded-xl p-4 overflow-hidden shadow-2xl">
            <Mermaid 
              chart={`erDiagram\n${spec.tables.map((table: any) => {
                const columns = table.columns?.map((col: any) => `    ${col.type.replace(/[{}]/g, '')} ${col.name} ${col.primary ? "PK" : ""}`).join('\n') || "";
                return `  ${table.name.replace(/\s+/g, '_')} {\n${columns}\n  }`;
              }).join('\n')}`}
              className="flex justify-center"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spec.tables.map((table: any, i: number) => (
              <div key={i} className="bg-muted/50 border border-border rounded-lg p-4 hover:border-orange-500/30 transition-colors">
                <h4 className="text-sm font-semibold text-zinc-200 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" /> {table.name}
                </h4>
                {table.columns && Array.isArray(table.columns) && (
                  <div className="space-y-1.5">
                    {table.columns.map((col: any, j: number) => (
                      <div key={j} className="flex items-center justify-between text-[11px] group/col">
                        <div className="flex items-center gap-2">
                          <code className="text-zinc-200 font-mono group-hover/col:text-orange-300 transition-colors">{col.name}</code>
                          {col.primary && <Badge className="text-[8px] h-3.5 px-1 bg-yellow-600/30 text-yellow-500 border-none">PK</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-mono">{col.type}</span>
                          {col.nullable === false && <span className="text-[10px] text-blue-400/60 font-medium">NOT NULL</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps (for workflow specs) */}
      {spec.steps && Array.isArray(spec.steps) && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" /> Workflow Architecture
          </h3>
          
          <div className="bg-background border border-border rounded-xl p-6 overflow-hidden shadow-2xl relative group">
            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
               <Badge variant="outline" className="bg-muted/80 text-[10px] border-yellow-500/30 text-yellow-500">
                 Auto-Synced
               </Badge>
            </div>
            <Mermaid 
              key={`workflow-${content.length}`} // Key for re-rendering on content change
              chart={`graph TD\n${spec.steps.map((step: any, i: number) => {
                const id = step.id || i;
                const currentName = (step.name || step.title || `Step ${i+1}`).replace(/"/g, "'");
                
                // Use explicit 'next' if defined, otherwise sequential
                const nextStepRef = step.next || (spec.steps[i+1] ? (spec.steps[i+1].id || i+1) : null);
                
                let line = `  ${id}["${currentName}"]`;
                if (nextStepRef !== null && nextStepRef !== undefined) {
                   line += ` --> ${nextStepRef}`;
                }
                return line;
              }).join('\n')}`}
              className="flex justify-center transition-all duration-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {spec.steps.map((step: any, i: number) => (
              <div key={i} className="flex flex-col gap-2 bg-muted/40 border border-border/60 rounded-xl p-4 hover:border-yellow-500/40 transition-all hover:shadow-lg group/step">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-yellow-500/10 text-yellow-500 text-xs flex items-center justify-center font-bold shrink-0 border border-yellow-500/20 group-hover/step:bg-yellow-500 group-hover/step:text-zinc-950 transition-colors">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{step.name || step.title || `Step ${i + 1}`}</div>
                    <div className="text-[10px] text-muted-foreground font-mono uppercase">{step.id || `step_${i}`}</div>
                  </div>
                </div>
                {step.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{step.description}</p>}
                
                {step.conditions && (
                   <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1.5">
                     {Object.entries(step.conditions).map(([key, val]: [string, any]) => (
                        <Badge key={key} variant="outline" className="text-[9px] bg-muted/30 border-border text-muted-foreground">
                          {key}: {String(val)}
                        </Badge>
                     ))}
                   </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acceptance Criteria */}
      {acceptanceCriteria.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Acceptance Criteria ({acceptanceCriteria.filter(c => c.checked).length}/{acceptanceCriteria.length})
          </h3>
          <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-1.5">
            {acceptanceCriteria.map(c => (
              <div key={c.id} className={`flex items-center gap-2 text-sm ${c.checked ? 'text-emerald-400 line-through' : 'text-zinc-300'}`}>
                {c.checked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5 text-zinc-600" />}
                {c.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stakeholder Sign-Off */}
      {stakeholders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> Sign-Off Status
          </h3>
          <div className="bg-muted/50 border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left p-3 font-medium">Stakeholder</th><th className="text-left p-3 font-medium">Status</th></tr></thead>
              <tbody>
                {stakeholders.map(s => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="p-3 text-zinc-200">{s.name}</td>
                    <td className="p-3">
                      <Badge className={`text-[10px] ${s.status === 'approved' ? 'bg-emerald-600/20 text-emerald-400' : s.status === 'rejected' ? 'bg-red-600/20 text-red-400' : 'bg-zinc-700/50 text-muted-foreground'}`}>
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw YAML fallback */}
      <details className="group">
        <summary className="text-xs text-zinc-600 cursor-pointer hover:text-muted-foreground transition-colors">
          Show raw YAML
        </summary>
        <pre className="mt-2 bg-muted border border-border rounded-lg p-4 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">{content}</pre>
      </details>
    </div>
  )
}

/* ═══════════════════════════════════════════════ */
/*               SPEC CHAMBER                      */
/* ═══════════════════════════════════════════════ */
export function SpecChamber() {
  const { emit, ROOM_EVENTS } = useRoomEvents('spec-chamber')
  // ── Zustand Store (persistent) ──
  const sessionResult = useSession()
  const session = sessionResult?.data ?? null
  const userName = session?.user?.name || session?.user?.email || 'Anonymous'

  const store = useSpecStore()
  const {
    activeSpecId,
    activeType,
    content,
    isSaved,
    generatedCode,
    specs,
    acceptanceCriteria: allCriteria,
    stakeholders: allStakeholders,
    versionHistory: allVersions,
    reviewComments: allComments,
    setActiveType: storeSetActiveType,
    setContent,
    setIsSaved,
    setGeneratedCode,
    setActiveSpecId,
    saveSpec,
    updateSpec,
    loadSpec,
    addCriterion,
    toggleCriterion,
    removeCriterion,
    addStakeholder,
    updateStakeholderStatus,
    removeStakeholder,
    createVersion,
    addReviewComment,
    editReviewComment,
    resolveReviewComment,
    deleteReviewComment,
    deleteSpec,
    migrateUnsavedData,
  } = store

  // Derived state for current spec
  const specId = activeSpecId || '_unsaved'
  const acceptanceCriteria = allCriteria[specId] || []
  const stakeholders = allStakeholders[specId] || []
  const versionHistory = allVersions[specId] || []
  const reviewComments = allComments[specId] || []

  // Initialize default stakeholders in the store so mutations work
  useEffect(() => {
    if (!allStakeholders[specId] || allStakeholders[specId].length === 0) {
      const defaults = [
        { id: 'sh-default-1', name: 'Tech Lead', role: 'Engineering', status: 'pending' as const },
        { id: 'sh-default-2', name: 'Product Manager', role: 'Product', status: 'pending' as const },
        { id: 'sh-default-3', name: 'QA Lead', role: 'Quality', status: 'pending' as const },
      ]
      for (const s of defaults) {
        addStakeholder(specId, s.name, s.role)
      }
    }
  }, [specId, allStakeholders, addStakeholder])

  // Local-only UI state
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors?: any[]; spec?: any } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [activeTab, setActiveTab] = useState("editor")
  const [showAI, setShowAI] = useState(false)
  const [aiQuery, setAiQuery] = useState("")
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [aiResponse, setAiResponse] = useState("")
  const [isAiCompleting, setIsAiCompleting] = useState(false)
  const [newCriteriaText, setNewCriteriaText] = useState("")
  const [newStakeholderName, setNewStakeholderName] = useState("")
  const [versionDescription, setVersionDescription] = useState("")
  const [newCommentText, setNewCommentText] = useState("")
  const [diffVersionId, setDiffVersionId] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState("")
  const [commentLineRef, setCommentLineRef] = useState("")
  const [specSearchQuery, setSpecSearchQuery] = useState("")
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isGeneratingTests, setIsGeneratingTests] = useState(false)
  const [generatedTests, setGeneratedTests] = useState("")
  const [completenessScore, setCompletenessScore] = useState<number | null>(null)
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false)

  // ─── Yjs Collaboration ─────────────────────────────────────────────────
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<any>(null)
  const bindingRef = useRef<any>(null)
  const editorRef = useRef<any>(null)
  const [collaborators, setCollaborators] = useState<{ id: number; name: string; color: string }[]>([])
  const [yjsConnected, setYjsConnected] = useState(false)

  // User colors for awareness
  const userColors = useMemo(() => {
    const colors = ['#f97316', '#06b6d4', '#8b5cf6', '#22c55e', '#ec4899', '#f59e0b']
    return colors[Math.floor(Math.random() * colors.length)]
  }, [])

  // Initialize Yjs doc + WebSocket provider
  useEffect(() => {
    const doc = new Y.Doc()
    ydocRef.current = doc

    const wsUrl = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_YJS_WS_URL || (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' ? `wss://${window.location.host}` : 'ws://localhost:1234'))
      : ''
    if (!wsUrl) return

    const roomName = `azora-spec-${specId}`
    let wsProvider: any = null
    getWebsocketProvider().then(WsProvider => {
      wsProvider = new WsProvider(wsUrl, roomName, doc)
      providerRef.current = wsProvider

      // Set local awareness
      wsProvider.awareness.setLocalStateField('user', {
        name: userName,
        color: userColors,
      })

      wsProvider.on('status', (event: any) => {
        setYjsConnected(event.status === 'connected')
      })

      // Track collaborators
      const updateCollaborators = () => {
        const states = wsProvider.awareness.getStates()
        const users: { id: number; name: string; color: string }[] = []
        states.forEach((state: any, clientId: number) => {
          if (state.user) {
            users.push({
              id: clientId,
              name: state.user.name || `User ${clientId}`,
              color: state.user.color || '#888',
            })
          }
        })
        setCollaborators(users)
      }
      wsProvider.awareness.on('change', updateCollaborators)
      updateCollaborators()

      // Initialize Y.Text with current content if empty
      const yText = doc.getText('spec-content')
      if (yText.length === 0 && content) {
        yText.insert(0, content)
      }

      // Sync Y.Text changes back to Zustand store
      yText.observe(() => {
        const newContent = yText.toString()
        if (newContent !== content) {
          setContent(newContent)
        }
      })
    })

    return () => {
      bindingRef.current?.destroy()
      bindingRef.current = null
      if (providerRef.current) {
        providerRef.current.destroy()
      }
      doc.destroy()
      ydocRef.current = null
      providerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specId])

  // Monaco editor mount handler — binds Y.Text to editor
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor

    if (ydocRef.current && providerRef.current) {
      const yText = ydocRef.current.getText('spec-content')

      // Clean up previous binding
      bindingRef.current?.destroy()

      // Create MonacoBinding for real-time collaborative editing
      getMonacoBinding().then(MBinding => {
        const binding = new MBinding(
          yText,
          editor.getModel()!,
          new Set([editor]),
          providerRef.current?.awareness,
        )
        bindingRef.current = binding
      })
    }
  }, [])

  // ─── User session and additional state ─────────────────────────────────
  const _specSession = useSession()
  const userSession = _specSession?.data ?? null
  const [specDiagnostics, setSpecDiagnostics] = useState<any[]>([])
  const [specSettings, setSpecSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spec-chamber-settings')
      return saved ? JSON.parse(saved) : { autoSave: true, showMinimap: false, theme: 'vs-dark' }
    }
    return { autoSave: true, showMinimap: false, theme: 'vs-dark' }
  })
  const [specVersions, setSpecVersions] = useState<any[]>([])

  // ─── Phase 1: API Integrations State ──────────────────────────────────
  type IntegrationType = 'github' | 'slack' | 'jira' | 'linear'
  interface Integration {
    id: string;
    type: IntegrationType;
    name: string;
    connected: boolean;
    config: Record<string, string>;
    lastSync?: string;
  }
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: 'gh-1', type: 'github', name: 'GitHub', connected: false, config: { repo: '', token: '' } },
    { id: 'sl-1', type: 'slack', name: 'Slack', connected: false, config: { webhook: '', channel: '' } },
    { id: 'jr-1', type: 'jira', name: 'Jira', connected: false, config: { baseUrl: '', project: '', token: '' } },
    { id: 'ln-1', type: 'linear', name: 'Linear', connected: false, config: { apiKey: '', teamId: '' } },
  ])
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [integrationConfigOpen, setIntegrationConfigOpen] = useState<string | null>(null)

  // ─── Phase 1: Custom Workflows State ──────────────────────────────────
  type WorkflowStatus = 'draft' | 'in-review' | 'approved' | 'in-progress' | 'testing' | 'done'
  interface WorkflowTransition {
    from: WorkflowStatus;
    to: WorkflowStatus;
    label: string;
    requiresApproval?: boolean;
  }
  const WORKFLOW_STATUSES: { status: WorkflowStatus; label: string; color: string }[] = [
    { status: 'draft', label: 'Draft', color: '#64748b' },
    { status: 'in-review', label: 'In Review', color: '#f59e0b' },
    { status: 'approved', label: 'Approved', color: '#22c55e' },
    { status: 'in-progress', label: 'In Progress', color: '#3b82f6' },
    { status: 'testing', label: 'Testing', color: '#8b5cf6' },
    { status: 'done', label: 'Done', color: '#10b981' },
  ]
  const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
    { from: 'draft', to: 'in-review', label: 'Submit for Review' },
    { from: 'in-review', to: 'approved', label: 'Approve', requiresApproval: true },
    { from: 'in-review', to: 'draft', label: 'Request Changes' },
    { from: 'approved', to: 'in-progress', label: 'Start Implementation' },
    { from: 'in-progress', to: 'testing', label: 'Submit for Testing' },
    { from: 'testing', to: 'done', label: 'Mark Complete' },
    { from: 'testing', to: 'in-progress', label: 'Return to Dev' },
  ]
  const [specStatus, setSpecStatus] = useState<WorkflowStatus>('draft')
  const [workflowHistory, setWorkflowHistory] = useState<{ status: WorkflowStatus; timestamp: string; actor: string }[]>([])
  const [approvalRequired, setApprovalRequired] = useState(false)

  const getAvailableTransitions = () => WORKFLOW_TRANSITIONS.filter(t => t.from === specStatus)

  const transitionSpec = (transition: WorkflowTransition) => {
    if (transition.requiresApproval) {
      setApprovalRequired(true)
    }
    setSpecStatus(transition.to)
    setWorkflowHistory(prev => [...prev, {
      status: transition.to,
      timestamp: new Date().toISOString(),
      actor: userSession?.user?.name || 'Anonymous',
    }])
    setSpecDiagnostics(prev => [...prev, {
      id: `workflow-${Date.now()}`,
      message: `Spec transitioned: ${transition.from} → ${transition.to}`,
      severity: 'info',
      source: 'workflow',
      timestamp: new Date().toISOString()
    }])
    // Notify integrations
    integrations.filter(i => i.connected).forEach(i => {
      if (i.type === 'slack' && i.config.webhook) {
        fetch(i.config.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `Spec "${activeType} spec" transitioned to ${transition.to}` }),
        }).catch(() => {})
      }
    })
  }

  const connectIntegration = async (integrationId: string) => {
    setIsConnecting(integrationId)
    try {
      // Real integration handshake via API
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Connection failed (${res.status})`)
      }
      setIntegrations(prev => prev.map(i =>
        i.id === integrationId
          ? { ...i, connected: true, lastSync: new Date().toISOString() }
          : i
      ))
      setSpecDiagnostics(prev => [...prev, {
        id: `int-${Date.now()}`,
        message: `Integration connected: ${integrations.find(i => i.id === integrationId)?.name}`,
        severity: 'info',
        source: 'integrations',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setIsConnecting(null)
    }
  }

  const disconnectIntegration = (integrationId: string) => {
    setIntegrations(prev => prev.map(i =>
      i.id === integrationId ? { ...i, connected: false, lastSync: undefined } : i
    ))
  }

  const updateIntegrationConfig = (integrationId: string, key: string, value: string) => {
    setIntegrations(prev => prev.map(i =>
      i.id === integrationId ? { ...i, config: { ...i.config, [key]: value } } : i
    ))
  }

  // ─── Phase 1: Reporting / Metrics ─────────────────────────────────────
  const getSpecMetrics = () => {
    const criteriaTotal = acceptanceCriteria.length
    const criteriaMet = acceptanceCriteria.filter(c => c.checked).length
    const stakeholderTotal = stakeholders.length
    const stakeholderApproved = stakeholders.filter(s => s.status === 'approved').length
    const reviewTotal = reviewComments.length
    const reviewResolved = reviewComments.filter(c => c.resolved).length
    const versionCount = specVersions.length
    const integrationCount = integrations.filter(i => i.connected).length
    const completeness = criteriaTotal > 0 ? Math.round((criteriaMet / criteriaTotal) * 100) : 0
    const approvalRate = stakeholderTotal > 0 ? Math.round((stakeholderApproved / stakeholderTotal) * 100) : 0
    const reviewRate = reviewTotal > 0 ? Math.round((reviewResolved / reviewTotal) * 100) : 0
    const overallScore = Math.round((completeness * 0.4 + approvalRate * 0.3 + reviewRate * 0.3))

    return {
      criteriaTotal, criteriaMet, completeness,
      stakeholderTotal, stakeholderApproved, approvalRate,
      reviewTotal, reviewResolved, reviewRate,
      versionCount, integrationCount, overallScore, specStatus,
    }
  }
  useEffect(() => {
    const handleSettingsChange = () => {
      const saved = localStorage.getItem('spec-chamber-settings')
      if (saved) {
        setSpecSettings(JSON.parse(saved))
      }
    }
    window.addEventListener('azora:settingsChanged', handleSettingsChange)
    return () => window.removeEventListener('azora:settingsChanged', handleSettingsChange)
  }, [])

  // ─── Version management ───────────────────────────────────────────────
  const createSpecVersion = () => {
    const version = {
      id: `v${Date.now()}`,
      timestamp: new Date().toISOString(),
      content: content,
      author: userSession?.user?.name || 'Anonymous',
      description: versionDescription.trim() || `Version created at ${new Date().toLocaleTimeString()}`
    }
    setSpecVersions(prev => [version, ...prev.slice(0, 49)]) // Keep max 50 versions
  }

  const restoreSpecVersion = (versionId: string) => {
    const version = specVersions.find(v => v.id === versionId)
    if (version) {
      setContent(version.content)
      setIsSaved(false)
      setSpecDiagnostics(prev => [...prev, {
        id: 'version-restored',
        message: `Restored version: ${versionId}`,
        severity: 'info',
        source: 'version-control',
        timestamp: new Date().toISOString()
      }])
    }
  }

  // ─── Settings update function ────────────────────────────────────────
  const updateSpecSettings = (newSettings: Partial<typeof specSettings>) => {
    const updated = { ...specSettings, ...newSettings }
    setSpecSettings(updated)
    localStorage.setItem('spec-chamber-settings', JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('azora:settingsChanged', { detail: updated }))
  }

  // Show toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // Initialize content from template on first load if empty
  useEffect(() => {
    if (!content) {
      setContent(SpecValidator.generateTemplate("component"))
      setIsSaved(true)
    }
  }, [])

  // Load specs from API on mount (sync with server)
  useEffect(() => {
    loadSpecsFromApi()
  }, [])

  const loadSpecsFromApi = useCallback(async () => {
    setIsLoadingSpecs(true)
    try {
      const resp = await fetch("/api/specs")
      if (resp.ok) {
        const data = await resp.json()
        // Merge API specs into store (avoid duplicates)
        const apiSpecs = (data.specs || []).map((s: any) => ({
          ...s,
          lastModified: s.lastModified || s.updatedAt || new Date().toISOString(),
        }))
        // Server specs supplement local store — store is source of truth
        const currentSpecs = useSpecStore.getState().specs
        if (apiSpecs.length > 0 && currentSpecs.length === 0) {
          // Only use API data if local store is empty (first load)
          apiSpecs.forEach((s: any) => {
            if (!currentSpecs.find((existing: any) => existing.id === s.id)) {
              store.saveSpec(s)
            }
          })
        }
      }
    } catch (error) {
      showToast("Failed to load specs from API", 'error')
    } finally {
      setIsLoadingSpecs(false)
    }
  }, [store, showToast])

  const handleTemplateChange = useCallback((type: SpecType) => {
    storeSetActiveType(type)
    setContent(SpecValidator.generateTemplate(type))
    setValidationResult(null)
    setGeneratedCode("")
    setIsSaved(false)
  }, [storeSetActiveType, setContent, setGeneratedCode, setIsSaved])

  const handleValidate = useCallback(async () => {
    setIsValidating(true)
    setValidationResult(null)
    setSpecDiagnostics([])
    
    try {
      // 1. Local base validation
      const result = await SpecValidator.validate(content, activeType)

      // 2. Real-time AJV Server Validation (Schema Enforcement)
      try {
        const resp = await fetch("/api/specs/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            content, 
            type: activeType,
            options: { strict: true }
          }),
        })
        
        if (resp.ok) {
          const serverResult = await resp.json()
          
          // Map schema diagnostics to UI
          if (serverResult.diagnostics && Array.isArray(serverResult.diagnostics)) {
            const formattedDiagnostics = serverResult.diagnostics.map((d: any) => ({
              id: `schema-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              message: `${d.path !== '/' ? `[${d.path}] ` : ''}${d.message}`,
              severity: d.severity || 'error',
              source: 'ajv-schema',
              timestamp: new Date().toISOString()
            }))
            
            setSpecDiagnostics(prev => [...prev, ...formattedDiagnostics])
            
            // Sync result object
            if (!serverResult.valid) {
              result.valid = false
              result.errors = [
                ...(result.errors || []),
                ...serverResult.diagnostics.map((d: any) => ({ message: d.message }))
              ]
            }
          }
          
          // Update completeness score
          if (serverResult.completeness?.score !== undefined) {
            setCompletenessScore(serverResult.completeness.score)
            
            // High completeness bonus info
            if (serverResult.completeness.score >= 90) {
               setSpecDiagnostics(prev => [...prev, {
                 id: 'completeness-90',
                 message: 'Spec reached 90%+ completeness. Metadata targets met.',
                 severity: 'info',
                 source: 'architect',
                 timestamp: new Date().toISOString()
               }])
            }
          }
        }
      } catch (serverErr) {
        console.warn("Server validation unreachable, using local shim.", serverErr)
      }

      setValidationResult(result)
      
      if (result.valid) {
        showToast('Specification validated successfully', 'success')
      } else {
        showToast('Validation failed — check diagnostics', 'error')
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: [{ message: error instanceof Error ? error.message : String(error) }],
      })
      showToast('Validation process encountered an error', 'error')
    } finally {
      setIsValidating(false)
    }
  }, [content, activeType, setSpecDiagnostics, showToast])

  const handleGenerateCode = useCallback(async () => {
    setIsGenerating(true)
    setGeneratedCode("")
    
    try {
      showToast('Engaging Architect Phase Reasoning...', 'success')
      
      // Integrate with the real Orchestrator API endpoint
      const resp = await fetch("/api/agents/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content,
          type: activeType,
          phase: 'architect',
          engine: 'gpt-4o', // Production reasoning model
          options: {
            deepReasoning: true,
            scaffoldStructure: true
          }
        }),
      })

      if (resp.ok) {
        const data = await resp.json()
        
        // Handle LangGraph trace if returned
        if (data.trace) {
          console.log('[LangGraph Trace] Spec Chamber Evolution:', data.trace)
        }
        
        const finalCode = data.result || data.code || data.output
        if (finalCode) {
          setGeneratedCode(finalCode)
          setActiveTab("generated")
          showToast('Code generated with LangGraph Architect', 'success')
        } else {
          throw new Error('No code output returned from orchestrator')
        }
      } else {
        // Fallback to simpler generate endpoint if orchestrator route is busy
        const fallbackResp = await fetch("/api/specs/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            content, 
            type: activeType,
            prompt: `Convert this ${activeType} spec to clean, production-ready code`
          }),
        })
        
        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json()
          setGeneratedCode(fallbackData.result || fallbackData.code || "// Scaffolded output")
          setActiveTab("generated")
          showToast('Generated via Standard AI Engine', 'success')
        } else {
          throw new Error('All generation services unavailable')
        }
      }
    } catch (error) {
      console.error('Generation Error:', error)
      // Final fallback to naive template system
      const localScaffold = `// Local scaffold for ${activeType} at ${new Date().toISOString()}\n` + content;
      setGeneratedCode(localScaffold)
      setActiveTab("generated")
      showToast('Generation failed — using local fallback', 'error')
    } finally {
      setIsGenerating(false)
    }
  }, [content, activeType, setGeneratedCode, showToast])

  
  const handleScaffoldProject = useCallback(async () => {
    try {
      setIsGenerating(true)
      const fsStore = useFileSystem.getState();
      if (!fsStore.rootId) {
        showToast('File system not initialized. Ensure a project is open.', 'error')
        return;
      }
      
      const fileName = activeType === 'api' ? 'api-spec-endpoint.ts' : 
                       activeType === 'component' ? 'UiComponent.tsx' : 
                       activeType === 'database' ? 'schema.prisma' : 'workflow.ts';
      
      showToast(`Scaffolding ${activeType} architecture...`, 'success')
                       
      // Try to generate
      let scaffoldCode = "";
      try {
        const resp = await fetch("/api/specs/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, type: activeType, context: 'scaffold' }),
        })
        if (resp.ok) {
          const data = await resp.json()
          scaffoldCode = data.result || data.code || generateFromSpec(content, activeType)
        } else {
          scaffoldCode = generateFromSpec(content, activeType)
        }
      } catch (err) {
        scaffoldCode = generateFromSpec(content, activeType)
      }
      
      // We create it in root for this demo
      await fsStore.createFile(fsStore.rootId, fileName, scaffoldCode);
      
      // Handoff Synergy: Notify Code Chamber and Design Studio
      emit(ROOM_EVENTS.SPEC_GENERATE_CODE, { 
        fileName, 
        specType: activeType,
        source: 'spec-chamber',
        target: 'code-chamber',
        timestamp: new Date().toISOString()
      });
      
      // Scaffold a basic package.json if it doesn't exist
      const pkgJson = JSON.stringify({
        "name": "azora-scaffolded-app",
        "version": "1.0.0",
        "private": true,
        "dependencies": {
          "react": "^18.2.0",
          "react-dom": "^18.2.0",
          "framer-motion": "^10.0.0",
          "lucide-react": "^0.292.0"
        }
      }, null, 2);
      
      try {
        await fsStore.createFile(fsStore.rootId, "package.json", pkgJson);
      } catch { /* file might exist */ }
      
      showToast(`Scaffolded ${fileName} to Code Chamber!`, 'success')
      
      // Trigger Code Chamber refresh and dependency install
      window.dispatchEvent(new CustomEvent('azora:file-created', { detail: { path: fileName } }));
      window.dispatchEvent(new CustomEvent('azora:run-command', { detail: { command: 'pnpm install' } }));
      
    } catch (error) {
      showToast('Scaffolding failed: ' + error, 'error')
    } finally {
      setIsGenerating(false)
    }
  }, [content, activeType, showToast, emit, ROOM_EVENTS]);

    const handleSave = useCallback(async () => {
    try {
      const specData = {
        type: activeType,
        content,
        title: `${activeType.charAt(0).toUpperCase() + activeType.slice(1)} Specification`,
        status: 'draft' as const,
        version: 'v1.0',
        author: userName,
      }

      if (activeSpecId) {
        // Update existing spec in store
        updateSpec(activeSpecId, { content, lastModified: new Date().toISOString() })
        // Auto-create version snapshot
        createVersion(activeSpecId, `Saved at ${new Date().toLocaleTimeString()}`, userName)

        // Sync update to API (best-effort)
        await fetch("/api/specs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeSpecId, content, lastModified: new Date().toISOString() }),
        }).catch(() => showToast('Saved locally — API sync failed', 'error'))
      } else {
        // Save new spec to store
        const newSpec = saveSpec(specData)
        // Migrate any data stored under '_unsaved' key to the real spec ID
        migrateUnsavedData(newSpec.id)
        // Auto-create initial version
        createVersion(newSpec.id, 'Initial version', userName)

        // Sync new spec to API (best-effort)
        await fetch("/api/specs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...specData, id: newSpec.id }),
        }).catch(() => showToast('Saved locally — API sync failed', 'error'))
      }

      setIsSaved(true)
      showToast('Specification saved', 'success')
    } catch (error) {
      showToast('Failed to save specification', 'error')
    }
  }, [content, activeType, activeSpecId, updateSpec, createVersion, saveSpec, setIsSaved, showToast])

  const handleExport = () => {
    const blob = new Blob([content], { type: "text/yaml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `spec-${activeType}-${Date.now()}.yaml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".yaml,.yml,.json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        setContent(text)
        setIsSaved(false)
        showToast(`Imported ${file.name}`, 'success')
      } catch {
        showToast('Failed to read file', 'error')
      }
    }
    input.click()
  }, [setContent, setIsSaved, showToast])

  const handleDeleteSpec = useCallback((specId: string) => {
    if (window.confirm("Delete this spec? This cannot be undone.")) {
      deleteSpec(specId)
      // Sync delete to API (best-effort)
      fetch("/api/specs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: specId }),
      }).catch(() => showToast('Deleted locally — API sync failed', 'error'))
      showToast('Spec deleted', 'success')
    }
  }, [deleteSpec, showToast])

  const handleGenerateTests = useCallback(async () => {
    setIsGeneratingTests(true)
    try {
      const resp = await fetch("/api/specs/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: activeType }),
      })
      if (resp.ok) {
        const data = await resp.json()
        setGeneratedTests(data.tests || data.code || "// No tests generated")
        showToast("Tests generated successfully", 'success')
      } else {
        showToast("Test generation failed", 'error')
      }
    } catch {
      showToast("Could not reach test generation service", 'error')
    } finally {
      setIsGeneratingTests(false)
    }
  }, [content, activeType, showToast])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault()
        handleValidate()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, handleValidate])

  const handleAiGenerate = useCallback(async () => {
    if (!aiQuery.trim() || isAiGenerating) return
    setIsAiGenerating(true)
    setAiResponse("")
    try {
      const resp = await fetch("/api/specs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: aiQuery,
          type: activeType,
          action: "ai-write",
          existingSpec: content,
        }),
      })
      if (resp.ok) {
        const data = await resp.json()
        if (data.spec) {
          setContent(data.spec)
          setAiResponse("Specification generated and loaded into editor \u2713")
          setIsSaved(false)
        } else if (data.suggestion) {
          setAiResponse(data.suggestion)
        } else {
          setAiResponse(data.result || "Spec generated successfully")
        }
      } else {
        setAiResponse("AI generation temporarily unavailable. Try the quick suggestions!")
      }
    } catch {
      setAiResponse("Could not reach AI service. Try again later.")
    } finally {
      setIsAiGenerating(false)
    }
  }, [aiQuery, isAiGenerating, activeType, content, setContent, setIsSaved])

  // AI-Powered Spec Completion
  const handleAiComplete = useCallback(async () => {
    setIsAiCompleting(true)
    try {
      const resp = await fetch("/api/specs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Complete and expand this specification:\n" + content,
          type: activeType,
          action: "ai-complete",
        }),
      })
      if (resp.ok) {
        const data = await resp.json()
        const completion = data.result || data.spec || data.output || ""
        if (completion) {
          setContent(content + "\n" + completion)
          setIsSaved(false)
        }
      }
    } catch (error) {
      showToast("AI completion failed", 'error')
    } finally {
      setIsAiCompleting(false)
    }
  }, [content, activeType, setContent, setIsSaved])

  // Export as Markdown
  const handleExportMarkdown = useCallback(() => {
    const title = `${activeType.charAt(0).toUpperCase() + activeType.slice(1)} Specification`
    const criteriaSection =
      acceptanceCriteria.length > 0
        ? `\n## Acceptance Criteria\n\n${acceptanceCriteria.map((c) => `- [${c.checked ? "x" : " "}] ${c.text}`).join("\n")}\n`
        : ""
    const signOffSection = `\n## Sign-Off\n\n| Stakeholder | Role | Status |\n|---|---|---|\n${stakeholders
      .map((s) => `| ${s.name} | ${s.role || '-'} | ${s.status.charAt(0).toUpperCase() + s.status.slice(1)} |`)
      .join("\n")}\n`
    const md = `# ${title}\n\n${content}\n${criteriaSection}${signOffSection}`
    const blob = new Blob([md], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `spec-${title.toLowerCase().replace(/\s+/g, "-")}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [activeType, content, acceptanceCriteria, stakeholders])

  // Acceptance Criteria helpers (use store)
  const handleAddCriteria = useCallback(() => {
    if (!newCriteriaText.trim()) return
    addCriterion(specId, newCriteriaText.trim())
    setNewCriteriaText("")
  }, [newCriteriaText, specId, addCriterion])

  const handleToggleCriteria = useCallback((id: string) => {
    toggleCriterion(specId, id)
  }, [specId, toggleCriterion])

  const handleRemoveCriteria = useCallback((id: string) => {
    removeCriterion(specId, id)
  }, [specId, removeCriterion])

  // Stakeholder sign-off helper (use store)
  const handleUpdateStakeholder = useCallback((id: string, status: "pending" | "approved" | "rejected") => {
    updateStakeholderStatus(specId, id, status)
  }, [specId, updateStakeholderStatus])

  const handleAddStakeholder = useCallback(() => {
    if (!newStakeholderName.trim()) return
    addStakeholder(specId, newStakeholderName.trim(), 'Custom')
    setNewStakeholderName("")
  }, [newStakeholderName, specId, addStakeholder])

  // Version history helper (use local state)
  const handleCreateVersion = useCallback(() => {
    if (!versionDescription.trim()) return
    createSpecVersion()
    setVersionDescription("")
  }, [versionDescription, createSpecVersion])

  // Review comment helpers (use store)
  const handleAddComment = useCallback(() => {
    if (!newCommentText.trim()) return
    addReviewComment(specId, newCommentText.trim(), commentLineRef ? parseInt(commentLineRef, 10) : undefined, userName)
    setNewCommentText("")
    setCommentLineRef("")
  }, [newCommentText, commentLineRef, specId, addReviewComment, userName])

  // Compute LCS-based line diff between version content and current content
  const diffLines = useMemo(() => {
    if (!diffVersionId) return null
    const ver = versionHistory.find(v => v.id === diffVersionId)
    if (!ver) return null
    const oldLines = ver.content.split('\n')
    const newLines = content.split('\n')

    // Build LCS table
    const m = oldLines.length
    const n = newLines.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }

    // Backtrack to produce diff
    const result: { type: 'same' | 'added' | 'removed'; text: string }[] = []
    let i = m, j = n
    const stack: { type: 'same' | 'added' | 'removed'; text: string }[] = []
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        stack.push({ type: 'same', text: oldLines[i - 1] })
        i--; j--
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        stack.push({ type: 'added', text: newLines[j - 1] })
        j--
      } else {
        stack.push({ type: 'removed', text: oldLines[i - 1] })
        i--
      }
    }
    while (stack.length) result.push(stack.pop()!)
    return result
  }, [diffVersionId, versionHistory, content])

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            role="alert"
            aria-live="polite"
            className={`fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-500/90 text-white'
                : 'bg-red-500/90 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X className="w-3 h-3" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <LayoutTemplate className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h1 className="font-semibold text-base">Spec Chamber</h1>
          </div>
          <div className="h-5 w-px bg-muted ml-2" />
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isSaved ? "bg-emerald-500" : "bg-yellow-500 animate-pulse"}`} />
            <span className="text-[11px] text-muted-foreground">{isSaved ? "Saved" : "Unsaved"}</span>
          </div>
          {/* Yjs Collaborators */}
          {collaborators.length > 1 && (
            <>
              <div className="h-5 w-px bg-muted" />
              <div className="flex items-center gap-1">
                {collaborators.map(c => (
                  <div
                    key={c.id}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-zinc-900"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  >
                    {c.name[0]?.toUpperCase()}
                  </div>
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">{collaborators.length} editing</span>
              </div>
            </>
          )}
          {yjsConnected && (
            <Badge variant="outline" className="text-[9px] h-4 border-emerald-500/30 text-emerald-400 ml-1">
              Sync
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={isValidating}
            className="gap-2 border-border hover:bg-muted text-zinc-300 h-8"
          >
            {isValidating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Validate
          </Button>
          <Button
            size="sm"
            onClick={handleGenerateCode}
            disabled={isGenerating}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white h-8"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            {isGenerating ? "Generating…" : "Generate Code"}
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-2 bg-muted hover:bg-zinc-700 h-8">
              <Save className="w-3.5 h-3.5" />
              Save
            </Button>
            <Button size="sm" onClick={handleScaffoldProject} disabled={isGenerating} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-8">
              <Wand2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scaffold to Project</span>
            </Button>
          <Button variant="ghost" size="sm" onClick={handleExportMarkdown} className="h-8 px-2 text-muted-foreground" title="Export as Markdown">
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleImport} className="h-8 px-2 text-muted-foreground" title="Import YAML/JSON file">
            <FileUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateTests}
            disabled={isGeneratingTests}
            className="h-8 px-2 text-muted-foreground"
            title="Generate Tests from Spec"
          >
            {isGeneratingTests ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAI(!showAI)}
            className={`h-8 px-2 ${showAI ? "text-purple-400 bg-purple-500/10" : "text-muted-foreground"}`}
          >
            <Brain className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Sidebar: Templates ── */}
        <div className="w-60 border-r border-border bg-muted/20 flex flex-col">
          <div className="p-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Spec Type
            </h3>
            <div className="space-y-1">
              {SPEC_TEMPLATES.map((template) => {
                const Icon = template.icon
                return (
                  <button
                    key={template.type}
                    onClick={() => handleTemplateChange(template.type)}
                    aria-label={`${template.name} spec type`}
                    aria-pressed={activeType === template.type}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      activeType === template.type
                        ? "bg-purple-500/10 border border-purple-500/20 text-zinc-200"
                        : "hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${template.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{template.name}</div>
                      <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{template.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className="px-4 pb-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg border ${
                  validationResult.valid
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {validationResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs font-medium text-zinc-200">
                    {validationResult.valid ? "Valid Specification" : "Validation Errors"}
                  </span>
                </div>
                {completenessScore != null && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Progress value={completenessScore} className="h-1 flex-1" />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{completenessScore}% complete</span>
                  </div>
                )}
                {!validationResult.valid && validationResult.errors && (
                  <div className="space-y-1 mt-2">
                    {validationResult.errors.slice(0, 5).map((error: any, i: number) => (
                      <div key={i} className="text-[11px] text-red-300 flex items-start gap-1.5">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{error.message || String(error)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {validationResult.valid && validationResult.spec?.requirements && (
                  <div className="space-y-1 mt-2">
                    {validationResult.spec.requirements.map((req: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-[11px] text-zinc-300">{req}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* Recent Specs */}
          <div className="flex-1 border-t border-border overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                <h3 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Recent Specs
                </h3>
                {specs.length > 3 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                    <input
                      type="text"
                      value={specSearchQuery}
                      onChange={e => setSpecSearchQuery(e.target.value)}
                      placeholder="Filter specs..."
                      aria-label="Filter specifications"
                      className="w-full bg-muted/50 border border-border rounded text-[11px] text-zinc-300 pl-7 pr-2 py-1 focus:border-purple-500 outline-none"
                    />
                  </div>
                )}
                {specs.length > 0 ? (
                  <div className="space-y-1">
                    {specs
                      .filter(s => !specSearchQuery || s.title.toLowerCase().includes(specSearchQuery.toLowerCase()) || s.type.toLowerCase().includes(specSearchQuery.toLowerCase()))
                      .slice(0, 15)
                      .map((spec) => (
                      <div
                        key={spec.id}
                        className={`group w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-2 ${
                          activeSpecId === spec.id ? "bg-purple-500/10 border border-purple-500/20" : ""
                        }`}
                      >
                        <button
                          onClick={() => loadSpec(spec.id)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="text-xs text-zinc-300 truncate">{spec.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] h-4 border-border">
                              {spec.type}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-[9px] h-4 ${
                                spec.status === "approved"
                                  ? "border-emerald-600 text-emerald-400"
                                  : spec.status === "review"
                                  ? "border-yellow-600 text-yellow-400"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {spec.status}
                            </Badge>
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSpec(spec.id) }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all shrink-0 mt-0.5"
                          title="Delete spec"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : isLoadingSpecs ? (
                  <div className="space-y-2 py-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="px-3 py-2 rounded-lg bg-muted/30 animate-pulse">
                        <div className="h-3 w-24 bg-zinc-700/50 rounded mb-1.5" />
                        <div className="h-2 w-14 bg-zinc-700/30 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-600 text-center py-4">No saved specs yet</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* ── Editor Area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b border-border px-4 py-1.5 flex items-center justify-between">
              <TabsList role="tablist" aria-label="Specification editor tabs" className="bg-muted/50 h-8">
                <TabsTrigger value="editor" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700">
                  <FileJson className="w-3.5 h-3.5" />
                  Spec Editor
                </TabsTrigger>
                <TabsTrigger
                  value="generated"
                  className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700"
                  disabled={!generatedCode}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Generated Code
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700">
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="visual" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700">
                  <Layers className="w-3.5 h-3.5" />
                  Visual Builder
                </TabsTrigger>
                <TabsTrigger value="criteria" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Criteria
                </TabsTrigger>
                <TabsTrigger value="diagnostics" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Diagnostics
                </TabsTrigger>
                <TabsTrigger value="signoff" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700">
                  <Users className="w-3.5 h-3.5" />
                  Sign-Off
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700">
                  <GitBranch className="w-3.5 h-3.5" />
                  History
                </TabsTrigger>
                <TabsTrigger value="reviews" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Reviews ({reviewComments.filter(c => !c.resolved).length})
                </TabsTrigger>
                <TabsTrigger value="tests" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700" disabled={!generatedTests}>
                  <TestTube className="w-3.5 h-3.5" />
                  Tests
                </TabsTrigger>
                <TabsTrigger value="integrations" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700">
                  <Globe className="w-3.5 h-3.5" />
                  Integrations
                </TabsTrigger>
                <TabsTrigger value="workflow" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700">
                  <Zap className="w-3.5 h-3.5" />
                  Workflow
                </TabsTrigger>
                <TabsTrigger value="reporting" className="gap-1.5 text-xs h-7 data-[state=active]:bg-zinc-700">
                  <Target className="w-3.5 h-3.5" />
                  Reporting
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {activeTab === "editor" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAiComplete}
                    disabled={isAiCompleting}
                    className="gap-1.5 text-xs h-7 border-border text-muted-foreground hover:text-purple-400 hover:border-purple-700"
                  >
                    {isAiCompleting ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    AI Complete
                  </Button>
                )}
                <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                  <span>YAML</span>
                  <span>•</span>
                  <span>{content.split("\n").length} lines</span>
                </div>
              </div>
            </div>

            <TabsContent value="editor" className="flex-1 m-0">
              <ErrorBoundary componentName="Spec Editor (Monaco)">
              <Editor
                height="100%"
                language="yaml"
                value={content}
                onChange={(value) => {
                  if (!bindingRef.current) {
                    setContent(value || "")
                  }
                }}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: { top: 12 },
                  wordWrap: "on",
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  smoothScrolling: true,
                  bracketPairColorization: { enabled: true },
                  renderWhitespace: "boundary",
                }}
              />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="generated" className="flex-1 m-0">
              {isGenerating ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <div className="text-sm text-muted-foreground">Generating code from spec…</div>
                    <Progress value={66} className="w-48 mx-auto" />
                  </div>
                </div>
              ) : (
                <CodeOutput code={generatedCode} language="typescript" />
              )}
            </TabsContent>

            <TabsContent value="preview" className="flex-1 m-0 p-6 overflow-y-auto">
              <SpecPreview content={content} activeType={activeType} acceptanceCriteria={acceptanceCriteria} stakeholders={stakeholders} />
            </TabsContent>

            <TabsContent value="visual" className="flex-1 m-0">
              <ErrorBoundary componentName="Visual Builder (ReactFlow)">
              <VisualBuilder content={content} />
              </ErrorBoundary>
            </TabsContent>

            {/* Upgrade 2: Acceptance Criteria Checklist */}
            <TabsContent value="criteria" className="flex-1 m-0 p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-200">Acceptance Criteria</h2>
                  {acceptanceCriteria.length > 0 && (
                    <Badge variant="outline" className="text-xs border-border">
                      {acceptanceCriteria.filter((c) => c.checked).length}/{acceptanceCriteria.length} complete
                    </Badge>
                  )}
                </div>
                {acceptanceCriteria.length > 0 && (
                  <Progress
                    value={acceptanceCriteria.length > 0 ? (acceptanceCriteria.filter((c) => c.checked).length / acceptanceCriteria.length) * 100 : 0}
                    className="h-1.5"
                  />
                )}
                <div className="flex gap-2">
                  <Input
                    value={newCriteriaText}
                    onChange={(e) => setNewCriteriaText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCriteria()}
                    placeholder="Add acceptance criterion…"
                    className="bg-muted border-border text-sm text-zinc-300"
                  />
                  <Button size="sm" onClick={handleAddCriteria} className="bg-zinc-700 hover:bg-zinc-600 gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {acceptanceCriteria.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted border border-border"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleCriteria(item.id)}
                        aria-label={`Mark criterion: ${item.text}`}
                        className="w-4 h-4 accent-purple-500 cursor-pointer flex-shrink-0"
                      />
                      <span
                        className={`flex-1 text-sm ${item.checked ? "line-through text-muted-foreground" : "text-zinc-300"}`}
                      >
                        {item.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCriteria(item.id)}
                        className="h-6 w-6 p-0 text-zinc-600 hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {acceptanceCriteria.length === 0 && (
                    <p className="text-[11px] text-zinc-600 text-center py-6">
                      No acceptance criteria added yet. Add your first criterion above.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Stakeholder Sign-Off */}
            <TabsContent value="signoff" className="flex-1 m-0 p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto space-y-4">
                <h2 className="text-lg font-semibold text-zinc-200">Stakeholder Sign-Off</h2>

                {/* Add stakeholder */}
                <div className="flex gap-2">
                  <Input
                    value={newStakeholderName}
                    onChange={(e) => setNewStakeholderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddStakeholder()}
                    placeholder="Add stakeholder name…"
                    className="bg-muted border-border text-sm text-zinc-300"
                  />
                  <Button size="sm" onClick={handleAddStakeholder} className="bg-zinc-700 hover:bg-zinc-600 gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </div>

                <div className="space-y-3">
                  {stakeholders.map((stakeholder) => (
                    <div
                      key={stakeholder.id}
                      className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm text-zinc-200">{stakeholder.name}</span>
                          {stakeholder.role && (
                            <span className="text-[10px] text-muted-foreground ml-2">({stakeholder.role})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            stakeholder.status === "approved"
                              ? "border-emerald-600 text-emerald-400"
                              : stakeholder.status === "rejected"
                              ? "border-red-600 text-red-400"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {stakeholder.status.charAt(0).toUpperCase() + stakeholder.status.slice(1)}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStakeholder(stakeholder.id, "approved")}
                          disabled={stakeholder.status === "approved"}
                          className="h-7 px-2 text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStakeholder(stakeholder.id, "rejected")}
                          disabled={stakeholder.status === "rejected"}
                          variant="outline"
                          className="h-7 px-2 text-xs border-border text-muted-foreground hover:text-red-400 hover:border-red-700"
                        >
                          Request Changes
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeStakeholder(specId, stakeholder.id)}
                          className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400"
                          title="Remove stakeholder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Diagnostics Panel */}
            <TabsContent value="diagnostics" className="flex-1 m-0 p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-200">System Diagnostics</h2>
                  <Button size="sm" variant="outline" onClick={() => setSpecDiagnostics([])} className="h-7 text-xs">Clear</Button>
                </div>
                {specDiagnostics.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                    <p className="text-sm text-muted-foreground">All systems operational</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {specDiagnostics.map((diag: any, i: number) => (
                      <div key={i} className={cn(
                        "flex items-start gap-3 p-3 rounded border",
                        diag.severity === 'error' ? 'border-red-500/20 bg-red-500/5' : 
                        diag.severity === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 
                        'border-blue-500/20 bg-blue-500/5'
                      )}>
                        <div className={cn("text-xs font-bold uppercase shrink-0 mt-0.5",
                          diag.severity === 'error' ? 'text-red-400' : 
                          diag.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                        )}>
                          {diag.severity === 'error' ? '●' : diag.severity === 'warning' ? '▲' : 'ℹ'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-zinc-200">{diag.message}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {diag.source} · {new Date(diag.timestamp || Date.now()).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Version History (persistent via store) */}
            <TabsContent value="history" className="flex-1 m-0 p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-200">Version History</h2>
                  <Badge variant="outline" className="text-xs border-border">
                    {specVersions.length} versions
                  </Badge>
                </div>

                {/* Create Version */}
                <div className="flex gap-2">
                  <Input
                    value={versionDescription}
                    onChange={(e) => setVersionDescription(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateVersion()}
                    placeholder="Version description (e.g. 'Added auth requirements')…"
                    className="bg-muted border-border text-sm text-zinc-300"
                  />
                  <Button size="sm" onClick={handleCreateVersion} className="bg-purple-700 hover:bg-purple-600 gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    Snapshot
                  </Button>
                </div>

                <div className="space-y-3">
                  {specVersions.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between px-4 py-3 rounded-lg bg-muted border border-border"
                    >
                      <div className="flex items-start gap-3">
                        <GitBranch className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-200">{entry.id}</span>
                            <Badge variant="outline" className="text-[10px] h-4 border-border text-muted-foreground">
                              {entry.author}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                          <p className="text-[10px] text-zinc-600 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDiffVersionId(diffVersionId === entry.id ? null : entry.id)}
                          className={`h-7 px-2 text-xs flex-shrink-0 ${
                            diffVersionId === entry.id 
                              ? 'border-purple-600 text-purple-400 bg-purple-500/10' 
                              : 'border-border text-muted-foreground hover:text-zinc-200'
                          }`}
                        >
                          {diffVersionId === entry.id ? 'Hide Diff' : 'Diff'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreSpecVersion(entry.id)}
                          className="h-7 px-2 text-xs border-border text-muted-foreground hover:text-zinc-200 flex-shrink-0"
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Inline diff viewer */}
                  {diffLines && (
                    <div className="rounded-lg border border-purple-800/50 bg-muted/80 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted">
                        <span className="text-[10px] text-purple-400 font-medium">
                          Diff: {versionHistory.find(v => v.id === diffVersionId)?.version} → current
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setDiffVersionId(null)} className="h-5 w-5 p-0 text-muted-foreground">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <ScrollArea className="max-h-64">
                        <pre className="text-[11px] font-mono p-2 leading-relaxed">
                          {diffLines.map((line, i) => (
                            <div
                              key={i}
                              className={
                                line.type === 'added' ? 'bg-emerald-500/10 text-emerald-400'
                                : line.type === 'removed' ? 'bg-red-500/10 text-red-400 line-through'
                                : 'text-muted-foreground'
                              }
                            >
                              <span className="select-none mr-2 text-zinc-700">
                                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                              </span>
                              {line.text}
                            </div>
                          ))}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}

                  {versionHistory.length === 0 && (
                    <p className="text-[11px] text-zinc-600 text-center py-6">
                      No versions yet. Save your spec or click Snapshot to create the first version.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Review Comments (persistent via store) */}
            <TabsContent value="reviews" className="flex-1 m-0 p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-200">Review Comments</h2>
                  <Badge variant="outline" className="text-xs border-border">
                    {reviewComments.filter(c => !c.resolved).length} open
                  </Badge>
                </div>

                {/* Add comment with optional line ref */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                      placeholder="Add a review comment…"
                      className="bg-muted border-border text-sm text-zinc-300"
                    />
                    <Input
                      value={commentLineRef}
                      onChange={(e) => setCommentLineRef(e.target.value.replace(/\D/g, ''))}
                      placeholder="Line #"
                      className="bg-muted border-border text-sm text-zinc-300 w-20"
                    />
                    <Button size="sm" onClick={handleAddComment} className="bg-zinc-700 hover:bg-zinc-600 gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Comment
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {reviewComments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`px-4 py-3 rounded-lg border ${
                        comment.resolved
                          ? "bg-muted/50 border-border/50 opacity-60"
                          : "bg-muted border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-300">{comment.author}</span>
                          {comment.lineRef && (
                            <Badge variant="outline" className="text-[9px] h-4 border-blue-700 text-blue-400">
                              L{comment.lineRef}
                            </Badge>
                          )}
                          <span className="text-[10px] text-zinc-600">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {!comment.resolved && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingCommentId(comment.id)
                                  setEditingCommentText(comment.text)
                                }}
                                className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-zinc-200 hover:bg-muted"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resolveReviewComment(specId, comment.id)}
                                className="h-5 px-1.5 text-[10px] text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <Check className="w-3 h-3 mr-0.5" />
                                Resolve
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteReviewComment(specId, comment.id)}
                            className="h-5 px-1 text-zinc-600 hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                editReviewComment(specId, comment.id, editingCommentText)
                                setEditingCommentId(null)
                              }
                              if (e.key === "Escape") setEditingCommentId(null)
                            }}
                            className="bg-muted border-border text-sm text-zinc-300 flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              editReviewComment(specId, comment.id, editingCommentText)
                              setEditingCommentId(null)
                            }}
                            className="h-8 px-2 text-xs bg-zinc-700 hover:bg-zinc-600"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCommentId(null)}
                            className="h-8 px-2 text-xs text-muted-foreground"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <p className={`text-sm ${comment.resolved ? "text-muted-foreground line-through" : "text-zinc-300"}`}>
                          {comment.text}
                        </p>
                      )}
                      {comment.resolved && (
                        <Badge variant="outline" className="text-[9px] h-4 border-emerald-700 text-emerald-500 mt-1">
                          Resolved
                        </Badge>
                      )}
                    </div>
                  ))}
                  {reviewComments.length === 0 && (
                    <p className="text-[11px] text-zinc-600 text-center py-6">
                      No review comments yet. Add feedback above.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tests" className="flex-1 m-0 flex flex-col overflow-hidden">
              {generatedTests ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Coverage Summary Header */}
                  <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <TestTube className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-zinc-200">Generated Tests</span>
                      </div>
                      <Badge variant="outline" className="text-xs border-emerald-700 text-emerald-400 bg-emerald-500/10">
                        {(generatedTests.match(/it\(|test\(/g) || []).length} test cases
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span>Coverage: {acceptanceCriteria.length > 0 ? Math.round((generatedTests.match(/it\(|test\(/g) || []).length / acceptanceCriteria.length * 100) : 100}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span>Criteria: {acceptanceCriteria.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <CodeOutput code={generatedTests} language="typescript" />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center space-y-3">
                    <TestTube className="w-8 h-8 mx-auto text-zinc-600" />
                    <p>Click the <TestTube className="w-3.5 h-3.5 inline" /> button in the header to generate tests from your spec.</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ─── Integrations Tab ──────────────────────────────────────── */}
            <TabsContent value="integrations" className="flex-1 m-0 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">API Integrations</h2>
                  <p className="text-sm text-muted-foreground">Connect external services to sync specs and receive notifications</p>
                </div>

                <div className="space-y-4">
                  {integrations.map(integration => {
                    const iconMap: Record<IntegrationType, string> = { github: '🐙', slack: '💬', jira: '📋', linear: '📐' }
                    const isOpen = integrationConfigOpen === integration.id
                    return (
                      <div key={integration.id} className="rounded-lg border border-border bg-muted/50 overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{iconMap[integration.type]}</span>
                            <div>
                              <div className="text-sm font-medium text-zinc-200">{integration.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {integration.connected
                                  ? `Connected · Last sync: ${integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Never'}`
                                  : 'Not connected'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIntegrationConfigOpen(isOpen ? null : integration.id)}
                              className="h-7 text-xs border-border"
                            >
                              <Settings className="w-3 h-3 mr-1" />
                              Configure
                            </Button>
                            {integration.connected ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => disconnectIntegration(integration.id)}
                                className="h-7 text-xs"
                              >
                                Disconnect
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => connectIntegration(integration.id)}
                                disabled={isConnecting === integration.id}
                                className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                              >
                                {isConnecting === integration.id ? (
                                  <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Connecting...</>
                                ) : 'Connect'}
                              </Button>
                            )}
                          </div>
                        </div>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                            {Object.entries(integration.config).map(([key, value]) => (
                              <div key={key} className="space-y-1">
                                <label className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                                <Input
                                  value={value}
                                  onChange={(e) => updateIntegrationConfig(integration.id, key, e.target.value)}
                                  type={key.toLowerCase().includes('token') || key.toLowerCase().includes('key') ? 'password' : 'text'}
                                  placeholder={`Enter ${key}`}
                                  className="h-8 text-xs bg-muted border-border"
                                />
                              </div>
                            ))}
                            <div className="text-[11px] text-zinc-600">
                              {integration.type === 'github' && 'Syncs specs as GitHub issues/PRs. Requires a personal access token with repo scope.'}
                              {integration.type === 'slack' && 'Sends notifications when specs change status. Use an incoming webhook URL.'}
                              {integration.type === 'jira' && 'Creates linked Jira tickets for specs. Requires an API token.'}
                              {integration.type === 'linear' && 'Syncs specs with Linear issues. Requires an API key.'}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Sync summary */}
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3">Sync Status</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {integrations.map(i => (
                      <div key={i.id} className="text-center">
                        <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${i.connected ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                        <span className="text-[10px] text-muted-foreground">{i.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─── Workflow Tab ───────────────────────────────────────────── */}
            <TabsContent value="workflow" className="flex-1 m-0 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Spec Workflow</h2>
                    <p className="text-sm text-muted-foreground">Track and manage the lifecycle of this specification</p>
                  </div>
                  <Badge
                    className="text-xs px-3 py-1"
                    style={{
                      backgroundColor: `${WORKFLOW_STATUSES.find(s => s.status === specStatus)?.color}20`,
                      color: WORKFLOW_STATUSES.find(s => s.status === specStatus)?.color,
                      borderColor: `${WORKFLOW_STATUSES.find(s => s.status === specStatus)?.color}40`,
                    }}
                  >
                    {WORKFLOW_STATUSES.find(s => s.status === specStatus)?.label}
                  </Badge>
                </div>

                {/* Status pipeline visualization */}
                <div className="flex items-center gap-1">
                  {WORKFLOW_STATUSES.map((ws, idx) => {
                    const isCurrent = ws.status === specStatus
                    const isPast = WORKFLOW_STATUSES.findIndex(s => s.status === specStatus) > idx
                    return (
                      <div key={ws.status} className="flex items-center flex-1">
                        <div
                          className={`flex-1 h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                            isPast && !isCurrent
                              ? 'opacity-60'
                              : !isCurrent && !isPast
                              ? 'opacity-30'
                              : ''
                          }`}
                          style={{
                            backgroundColor: isCurrent || isPast ? `${ws.color}25` : 'rgba(255,255,255,0.05)',
                            color: isCurrent || isPast ? ws.color : '#71717a',
                            outline: isCurrent ? `2px solid ${ws.color}` : undefined,
                            outlineOffset: isCurrent ? '2px' : undefined,
                          }}
                        >
                          {ws.label}
                        </div>
                        {idx < WORKFLOW_STATUSES.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-zinc-600 mx-0.5 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Available transitions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-300">Available Actions</h3>
                  {getAvailableTransitions().length === 0 ? (
                    <div className="text-center py-6 text-zinc-600 text-sm">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-2" />
                      <p>This spec has reached its final state</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getAvailableTransitions().map(t => (
                        <Button
                          key={`${t.from}-${t.to}`}
                          size="sm"
                          onClick={() => transitionSpec(t)}
                          className="h-8 text-xs gap-1.5"
                          style={{
                            backgroundColor: `${WORKFLOW_STATUSES.find(s => s.status === t.to)?.color}20`,
                            color: WORKFLOW_STATUSES.find(s => s.status === t.to)?.color,
                            borderColor: `${WORKFLOW_STATUSES.find(s => s.status === t.to)?.color}40`,
                          }}
                          variant="outline"
                        >
                          <ChevronRight className="w-3 h-3" />
                          {t.label}
                          {t.requiresApproval && <span className="text-[9px] opacity-70">(needs approval)</span>}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Workflow history */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-300">Transition History</h3>
                  {workflowHistory.length === 0 ? (
                    <div className="text-center py-6 text-zinc-600 text-sm">
                      <Clock className="w-6 h-6 mx-auto mb-2" />
                      <p>No transitions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workflowHistory.slice().reverse().map((entry, i) => {
                        const statusInfo = WORKFLOW_STATUSES.find(s => s.status === entry.status)
                        return (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusInfo?.color }} />
                            <div className="flex-1">
                              <span className="text-xs text-zinc-300">{statusInfo?.label}</span>
                              <div className="text-[10px] text-zinc-600">{entry.actor} · {new Date(entry.timestamp).toLocaleString()}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ─── Reporting Tab ──────────────────────────────────────────── */}
            <TabsContent value="reporting" className="flex-1 m-0 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Spec Report</h2>
                  <p className="text-sm text-muted-foreground">Progress metrics, coverage analytics, and health indicators</p>
                </div>

                {(() => {
                  const m = getSpecMetrics()
                  return (
                    <>
                      {/* Overall Health Score */}
                      <div className="text-center p-6 rounded-lg border border-border bg-muted/30">
                        <div className="text-4xl font-bold mb-2" style={{
                          color: m.overallScore >= 80 ? '#22c55e' : m.overallScore >= 50 ? '#f59e0b' : '#ef4444'
                        }}>
                          {m.overallScore}%
                        </div>
                        <p className="text-sm text-muted-foreground">Overall Health Score</p>
                        <Progress value={m.overallScore} className="mt-3 h-2 max-w-xs mx-auto" />
                      </div>

                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg border border-border bg-muted/30 text-center">
                          <div className="text-2xl font-bold text-purple-400">{m.completeness}%</div>
                          <p className="text-xs text-muted-foreground mt-1">Criteria Met</p>
                          <p className="text-[10px] text-zinc-600">{m.criteriaMet}/{m.criteriaTotal}</p>
                        </div>
                        <div className="p-4 rounded-lg border border-border bg-muted/30 text-center">
                          <div className="text-2xl font-bold text-blue-400">{m.approvalRate}%</div>
                          <p className="text-xs text-muted-foreground mt-1">Stakeholder Approval</p>
                          <p className="text-[10px] text-zinc-600">{m.stakeholderApproved}/{m.stakeholderTotal}</p>
                        </div>
                        <div className="p-4 rounded-lg border border-border bg-muted/30 text-center">
                          <div className="text-2xl font-bold text-amber-400">{m.reviewRate}%</div>
                          <p className="text-xs text-muted-foreground mt-1">Reviews Resolved</p>
                          <p className="text-[10px] text-zinc-600">{m.reviewResolved}/{m.reviewTotal}</p>
                        </div>
                        <div className="p-4 rounded-lg border border-border bg-muted/30 text-center">
                          <div className="text-2xl font-bold text-emerald-400">{m.versionCount}</div>
                          <p className="text-xs text-muted-foreground mt-1">Versions</p>
                          <p className="text-[10px] text-zinc-600">{m.integrationCount} integrations</p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="p-4 rounded-lg border border-border bg-muted/30">
                        <h3 className="text-sm font-medium text-zinc-300 mb-3">Current Status</h3>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: WORKFLOW_STATUSES.find(s => s.status === m.specStatus)?.color }}
                          />
                          <span className="text-sm font-medium" style={{ color: WORKFLOW_STATUSES.find(s => s.status === m.specStatus)?.color }}>
                            {WORKFLOW_STATUSES.find(s => s.status === m.specStatus)?.label}
                          </span>
                        </div>
                      </div>

                      {/* Breakdown bars */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-zinc-300">Detailed Breakdown</h3>
                        {[
                          { label: 'Acceptance Criteria', value: m.completeness, color: '#a855f7' },
                          { label: 'Stakeholder Approval', value: m.approvalRate, color: '#3b82f6' },
                          { label: 'Review Resolution', value: m.reviewRate, color: '#f59e0b' },
                        ].map(bar => (
                          <div key={bar.label} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{bar.label}</span>
                              <span style={{ color: bar.color }}>{bar.value}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${bar.value}%`, backgroundColor: bar.color }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Recommendations */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-zinc-300">Recommendations</h3>
                        <div className="space-y-2">
                          {m.completeness < 100 && (
                            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400">
                              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>{m.criteriaTotal - m.criteriaMet} acceptance criteria still unmet. Review and address them to improve spec quality.</span>
                            </div>
                          )}
                          {m.approvalRate < 100 && m.stakeholderTotal > 0 && (
                            <div className="flex items-start gap-2 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-blue-400">
                              <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>{m.stakeholderTotal - m.stakeholderApproved} stakeholders haven&apos;t approved yet. Follow up for sign-off.</span>
                            </div>
                          )}
                          {m.reviewTotal > 0 && m.reviewRate < 100 && (
                            <div className="flex items-start gap-2 p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 text-xs text-purple-400">
                              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>{m.reviewTotal - m.reviewResolved} unresolved review comments. Address them before moving forward.</span>
                            </div>
                          )}
                          {m.integrationCount === 0 && (
                            <div className="flex items-start gap-2 p-3 rounded-lg border border-zinc-500/20 bg-zinc-500/5 text-xs text-muted-foreground">
                              <Globe className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>No integrations connected. Connect GitHub, Slack, or Jira for better team visibility.</span>
                            </div>
                          )}
                          {m.overallScore >= 80 && (
                            <div className="flex items-start gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>Great job! This spec is in good health. Consider transitioning to the next workflow stage.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </TabsContent>

          </Tabs>
        </div>
        <AnimatePresence>
          {showAI && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-muted/30 flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-zinc-200">AI Assistant</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAI(false)} className="h-6 w-6 p-0 text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Ask the AI to help you write, improve, or validate your specifications.
                  </p>

                  {/* Quick suggestions */}
                  {[
                    "Add error handling requirements",
                    "Suggest performance benchmarks",
                    "Add security considerations",
                    "Generate test scenarios",
                    "Improve accessibility requirements",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setAiQuery(suggestion)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-border hover:bg-muted/30 text-xs text-muted-foreground hover:text-zinc-200 transition-all"
                    >
                      <Sparkles className="w-3 h-3 inline mr-2 text-purple-400" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border">
                {aiResponse && (
                  <div className="mb-3 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-zinc-300">
                    {aiResponse}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                    placeholder="Describe your spec in natural language…"
                    className="bg-muted border-border text-sm text-zinc-300"
                    disabled={isAiGenerating}
                  />
                  <Button
                    size="sm"
                    onClick={handleAiGenerate}
                    disabled={isAiGenerating || !aiQuery.trim()}
                    className="bg-purple-600 hover:bg-purple-700 px-3"
                  >
                    {isAiGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── local code generation fallback ─── */
function generateFromSpec(content: string, type: SpecType): string {
  // Parse YAML-like content
  const lines = content.split("\n")
  const nameMatch = lines.find((l) => l.startsWith("name:"))
  const name = nameMatch?.split(":")[1]?.trim() || "Generated"
  const requirements = lines
    .filter((l) => l.trim().startsWith("- "))
    .map((l) => l.trim().replace("- ", ""))

  switch (type) {
    case "component":
      return `import React, { useState, useEffect } from 'react'

interface ${name}Props {
  /** Component title */
  title?: string
  /** Whether the component is active */
  isActive?: boolean
  /** Callback when component state changes */
  onChange?: (value: any) => void
}

/**
 * ${name} Component
 * 
 * Requirements:
${requirements.map((r) => ` * - ${r}`).join("\n")}
 */
export function ${name}({ title, isActive = false, onChange }: ${name}Props) {
  const [state, setState] = useState<Record<string, any>>({})

  useEffect(() => {
    // Component initialization
    console.log('${name} mounted')
    return () => console.log('${name} unmounted')
  }, [])

  return (
    <div 
      className="${name.toLowerCase()}-container"
      role="region"
      aria-label={title || '${name}'}
      data-active={isActive}
    >
      <h2 className="text-lg font-semibold">{title || '${name}'}</h2>
      {/* Implementation based on spec requirements */}
    </div>
  )
}

export default ${name}`

    case "api":
      return `import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * ${name} API Endpoint
 * 
 * Requirements:
${requirements.map((r) => ` * - ${r}`).join("\n")}
 */

// Request validation schema
const ${name}Schema = z.object({
  // Define your request body schema here
})

// GET handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Implementation here
    
    return NextResponse.json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = ${name}Schema.parse(body)
    
    // Implementation here
    
    return NextResponse.json({
      success: true,
      data: validated,
      message: '${name} created successfully',
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}`

    case "database":
      return `import { pgTable, uuid, varchar, timestamp, boolean, text, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

/**
 * ${name} Database Schema
 * 
 * Requirements:
${requirements.map((r) => ` * - ${r}`).join("\n")}
 */

export const ${name.toLowerCase()}Table = pgTable('${name.toLowerCase()}', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete support
  
  // Add your columns here based on spec
})

// Relations
export const ${name.toLowerCase()}Relations = relations(${name.toLowerCase()}Table, ({ one, many }) => ({
  // Define relationships here
}))`

    case "workflow":
      return `/**
 * ${name} Workflow
 * 
 * Requirements:
${requirements.map((r) => ` * - ${r}`).join("\n")}
 */

interface WorkflowStep {
  id: string
  name: string
  action: (input: any) => Promise<any>
  onError?: (error: Error) => Promise<void>
}

export class ${name}Workflow {
  private steps: WorkflowStep[] = []
  
  constructor() {
    this.steps = [
${requirements
  .map(
    (r, i) =>
      `      { id: 'step-${i + 1}', name: '${r}', action: this.step${i + 1}.bind(this) },`
  )
  .join("\n")}
    ]
  }

  async execute(input: any) {
    let data = input
    for (const step of this.steps) {
      try {
        console.log(\`Executing: \${step.name}\`)
        data = await step.action(data)
      } catch (error) {
        console.error(\`Failed at step: \${step.name}\`, error)
        if (step.onError) await step.onError(error as Error)
        throw error
      }
    }
    return data
  }

${requirements
  .map(
    (r, i) => `  private async step${i + 1}(data: any) {
    // TODO: Implement — ${r}
    return data
  }`
  )
  .join("\n\n")}
}`

    default:
      return `// Feature specification: ${name}\n// Type: ${type}\n// Requirements:\n${requirements.map((r) => `// - ${r}`).join("\n")}\n\n// Implementation goes here`
  }
}

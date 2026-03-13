"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRoomEvents } from "@/lib/hooks/use-room-events"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Brain,
  Play,
  Pause,
  Square,
  Share2,
  Settings,
  Database,
  Network,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  Activity,
  GitBranch,
  BarChart3,
  Code2,
  Eye,
  Save,
  Upload,
  Download,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Layers,
  Terminal,
  FileText,
  Workflow,
  Copy,
  GitCompare,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { ProblemsView } from "@/components/workspace/panels/problems-view"
import NotebookInterface from "@/components/rooms/ai-studio/NotebookInterface"

/* ─── types ─── */
interface AgentNode {
  id: string
  name: string
  type: "llm" | "tool" | "condition" | "input" | "output" | "transform"
  status: "idle" | "running" | "success" | "error"
  config: Record<string, string>
}

interface WorkflowRun {
  id: string
  status: "running" | "completed" | "failed"
  startedAt: string
  duration: number | null
  steps: number
  stepsCompleted: number
}

interface MetricEntry {
  label: string
  value: string
  change?: string
  trend?: "up" | "down" | "flat"
}

/* ─── node type configs ─── */
const NODE_TYPES = [
  { type: "llm", label: "LLM Call", icon: Brain, color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
  { type: "tool", label: "Tool Use", icon: Terminal, color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  { type: "condition", label: "Condition", icon: GitBranch, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { type: "input", label: "Input", icon: ArrowRight, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { type: "output", label: "Output", icon: FileText, color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
  { type: "transform", label: "Transform", icon: Layers, color: "text-pink-400 border-pink-500/30 bg-pink-500/10" },
] as const

/* ─── prompt template library ─── */
const PROMPT_TEMPLATES = [
  { id: "code-review", name: "Code Review", category: "Engineering", icon: "🔍", prompt: "Review this code for bugs, security issues, and performance improvements:\n\n{code}" },
  { id: "refactor", name: "Refactor Code", category: "Engineering", icon: "♻️", prompt: "Refactor the following code for better readability, maintainability, and performance:\n\n{code}" },
  { id: "test-gen", name: "Generate Tests", category: "Engineering", icon: "🧪", prompt: "Generate comprehensive unit tests for this code with edge cases:\n\n{code}" },
  { id: "api-design", name: "Design API", category: "Architecture", icon: "🏗️", prompt: "Design a RESTful API for the following requirements:\n\n{description}" },
  { id: "explain", name: "Explain Code", category: "Learning", icon: "📖", prompt: "Explain this code step by step in plain English:\n\n{code}" },
  { id: "optimize", name: "Optimize SQL", category: "Database", icon: "⚡", prompt: "Optimize this SQL query for better performance:\n\n{query}" },
  { id: "security", name: "Security Audit", category: "Security", icon: "🔒", prompt: "Perform a security audit on this code and identify vulnerabilities:\n\n{code}" },
  { id: "docs", name: "Generate Docs", category: "Documentation", icon: "📝", prompt: "Generate comprehensive documentation for this code including JSDoc/TSDoc:\n\n{code}" },
] as const

/* ─── chain presets ─── */
const CHAIN_PRESETS = [
  { id: "full-review", name: "Full Code Review Pipeline", steps: ["Code Review", "Security Audit", "Generate Tests", "Generate Docs"], color: "text-emerald-400" },
  { id: "new-feature", name: "Feature Development Chain", steps: ["Design API", "Generate Code", "Generate Tests", "Code Review"], color: "text-blue-400" },
  { id: "legacy-refactor", name: "Legacy Code Modernization", steps: ["Explain Code", "Refactor Code", "Generate Tests", "Security Audit"], color: "text-purple-400" },
] as const

/* ─── model comparison data ─── */
const MODEL_COMPARISON_DATA: Record<string, { latency: string; cost: string; context: string; strengths: string[] }> = {
  "GPT-4o":      { latency: "620ms", cost: "$0.005", context: "128K", strengths: ["Reasoning", "Code", "Vision"] },
  "Claude 3.5":  { latency: "580ms", cost: "$0.003", context: "200K", strengths: ["Writing", "Analysis", "Safety"] },
  "Gemini Pro":  { latency: "490ms", cost: "$0.002", context: "1M",   strengths: ["Multimodal", "Speed", "Long ctx"] },
  "Llama 3":     { latency: "310ms", cost: "$0.001", context: "128K", strengths: ["Open source", "Fast", "Cost"] },
  "Mistral":     { latency: "280ms", cost: "$0.0007", context: "32K", strengths: ["Speed", "Efficiency", "EU"] },
}
const MODEL_NAMES = Object.keys(MODEL_COMPARISON_DATA)

/* ─── log level helper ─── */
function getLogLevel(text: string): "ERROR" | "WARN" | "INFO" {
  const lower = text.toLowerCase()
  if (lower.includes("error") || lower.includes("failed") || lower.includes("fail")) return "ERROR"
  if (lower.includes("warn") || lower.includes("stopped") || lower.includes("retry")) return "WARN"
  return "INFO"
}

/* ═══════════════════════════════════════════════ */
/*                 AI STUDIO                       */
/* ═══════════════════════════════════════════════ */
export default function AIStudio() {
  const { emit, ROOM_EVENTS } = useRoomEvents('ai-studio')
  const sessionResult = useSession()
  const session = sessionResult?.data ?? null
  const [workflowName, setWorkflowName] = useState("Agent Workflow")
  const [nodes, setNodes] = useState<AgentNode[]>([])
  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState("workflow")
  const [rightTab, setRightTab] = useState("properties")
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [metrics, setMetrics] = useState<MetricEntry[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [naturalPrompt, setNaturalPrompt] = useState("")
  const [isBuildingFromPrompt, setIsBuildingFromPrompt] = useState(false)
  const [compareModel1, setCompareModel1] = useState("GPT-4o")
  const [compareModel2, setCompareModel2] = useState("Claude 3.5")
  const [liveMetrics, setLiveMetrics] = useState({ successRate: 0, avgLatency: 0, tokensPerMin: 0 })
  const [availableTools, setAvailableTools] = useState<{name:string;description?:string}[]>([])
  /* ── Phase 1: Context Awareness ── */
  const [workspaceContext, setWorkspaceContext] = useState<{
    activeFile: string | null;
    openFiles: string[];
    recentFiles: string[];
    projectName: string;
    language: string;
    framework: string;
  }>({
    activeFile: null,
    openFiles: [],
    recentFiles: [],
    projectName: 'BuildSpaces',
    language: 'TypeScript',
    framework: 'Next.js',
  })
  /* ── Phase 1: Code Generation ── */
  const [codeGenPrompt, setCodeGenPrompt] = useState("")
  const [codeGenResult, setCodeGenResult] = useState("")
  const [codeGenLanguage, setCodeGenLanguage] = useState("typescript")
  const [isCodeGenerating, setIsCodeGenerating] = useState(false)
  const [codeGenModel, setCodeGenModel] = useState("elara-code")
  /* ── Phase 1: Prompt Templates ── */
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [templateInput, setTemplateInput] = useState("")
  const [templateResult, setTemplateResult] = useState("")
  const [isTemplateRunning, setIsTemplateRunning] = useState(false)
  /* ── Phase 1: Chain Execution ── */
  const [activeChain, setActiveChain] = useState<string | null>(null)
  const [chainProgress, setChainProgress] = useState(0)
  const [chainResults, setChainResults] = useState<{step: string; result: string; status: 'pending' | 'running' | 'done' | 'error'}[]>([])
  const [isChainRunning, setIsChainRunning] = useState(false)
  const [diagnostics, setDiagnostics] = useState<any[]>([])
  const [settings, setSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-studio-settings')
      return saved ? JSON.parse(saved) : { autoSave: true, showMetrics: true }
    }
    return { autoSave: true, showMetrics: true }
  })
  const updateSettings = (newSettings: Partial<typeof settings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    localStorage.setItem('ai-studio-settings', JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('azora:settingsChanged', { detail: updated }))
  }
  const [workflowVersions, setWorkflowVersions] = useState<any[]>([])

  /* ── version management ── */
  const createWorkflowVersion = () => {
    const version = {
      id: `v${Date.now()}`,
      timestamp: new Date().toISOString(),
      name: workflowName,
      nodes: [...nodes],
      author: session?.user?.name || 'Anonymous',
      description: `Version created at ${new Date().toLocaleString()}`
    }
    setWorkflowVersions(prev => [version, ...prev.slice(0, 49)]) // Keep max 50 versions
  }

  const restoreWorkflowVersion = (versionId: string) => {
    const version = workflowVersions.find(v => v.id === versionId)
    if (version) {
      setWorkflowName(version.name)
      setNodes(version.nodes)
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Restored version: ${versionId}`])
    }
  }
  const logsEndRef = useRef<HTMLDivElement>(null)
  const importFileRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /* ── Phase 1: Fetch workspace context ── */
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const resp = await fetch('/api/workspace/context')
        if (resp.ok) {
          const data = await resp.json()
          setWorkspaceContext(prev => ({
            ...prev,
            activeFile: data.activeFile || prev.activeFile,
            openFiles: data.openFiles || prev.openFiles,
            recentFiles: data.recentFiles || prev.recentFiles,
            projectName: data.projectName || prev.projectName,
            language: data.language || prev.language,
            framework: data.framework || prev.framework,
          }))
        }
      } catch { /* workspace context is supplementary */ }
    }
    fetchContext()
    const id = setInterval(fetchContext, 15_000)
    return () => clearInterval(id)
  }, [])

  /* ── Phase 1: Code Generation ── */
  const generateCode = async () => {
    if (!codeGenPrompt.trim() || isCodeGenerating) return
    setIsCodeGenerating(true)
    setCodeGenResult('')
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Code generation started: ${codeGenModel}`])
    try {
      const resp = await fetch('/api/ai-studio/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: codeGenPrompt,
          language: codeGenLanguage,
          model: codeGenModel,
          context: workspaceContext,
        }),
      })
      if (resp.ok) {
        const data = await resp.json()
        setCodeGenResult(data.code || data.result || '// No code generated')
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Code generated successfully (${codeGenLanguage})`])
      } else {
        setCodeGenResult(`// Generation failed: ${resp.status}`)
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Code generation failed: ${resp.status}`])
      }
    } catch (error) {
      setCodeGenResult(`// Error: ${error}`)
      setDiagnostics(prev => [...prev, { id: 'codegen-error', message: `Code generation failed: ${error}`, severity: 'error', source: 'codegen', line: 0, column: 0 }])
    } finally {
      setIsCodeGenerating(false)
    }
  }

  /* ── Phase 1: Run prompt template ── */
  const runTemplate = async (templateId: string) => {
    const tpl = PROMPT_TEMPLATES.find(t => t.id === templateId)
    if (!tpl || isTemplateRunning) return
    setIsTemplateRunning(true)
    setTemplateResult('')
    const finalPrompt = tpl.prompt.replace(/\{(code|description|query)\}/g, templateInput || '// No input provided')
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Running template: ${tpl.name}`])
    try {
      const resp = await fetch('/api/ai-studio/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, language: 'typescript', model: codeGenModel, context: workspaceContext }),
      })
      if (resp.ok) {
        const data = await resp.json()
        setTemplateResult(data.code || data.result || 'No output')
      } else {
        setTemplateResult('Template execution failed')
      }
    } catch (error) {
      setTemplateResult(`Error: ${error}`)
    } finally {
      setIsTemplateRunning(false)
    }
  }

  /* ── Phase 1: Run chain preset ── */
  const runChain = async (chainId: string) => {
    const chain = CHAIN_PRESETS.find(c => c.id === chainId)
    if (!chain || isChainRunning) return
    setIsChainRunning(true)
    setActiveChain(chainId)
    setChainProgress(0)
    const results = chain.steps.map(step => ({ step, result: '', status: 'pending' as const }))
    setChainResults(results)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting chain: ${chain.name} (${chain.steps.length} steps)`])

    let previousOutput = templateInput || codeGenPrompt || ''
    for (let i = 0; i < chain.steps.length; i++) {
      setChainResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'running' } : r))
      setChainProgress(((i) / chain.steps.length) * 100)
      try {
        const tpl = PROMPT_TEMPLATES.find(t => t.name === chain.steps[i])
        const prompt = tpl ? tpl.prompt.replace(/\{(code|description|query)\}/g, previousOutput) : `${chain.steps[i]}: ${previousOutput}`
        const resp = await fetch('/api/ai-studio/generate-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, language: 'typescript', model: codeGenModel }),
        })
        const data = resp.ok ? await resp.json() : { result: 'Step failed' }
        const output = data.code || data.result || 'No output'
        previousOutput = output
        setChainResults(prev => prev.map((r, idx) => idx === i ? { ...r, result: output, status: 'done' } : r))
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Chain step ${i + 1}/${chain.steps.length}: ${chain.steps[i]} ✓`])
      } catch {
        setChainResults(prev => prev.map((r, idx) => idx === i ? { ...r, result: 'Error', status: 'error' } : r))
      }
    }
    setChainProgress(100)
    setIsChainRunning(false)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Chain completed: ${chain.name}`])
  }

  /* ── settings event listener ── */
  useEffect(() => {
    const handleSettingsChange = () => {
      const saved = localStorage.getItem('ai-studio-settings')
      if (saved) {
        setSettings(JSON.parse(saved))
      }
    }
    window.addEventListener('azora:settingsChanged', handleSettingsChange)
    return () => window.removeEventListener('azora:settingsChanged', handleSettingsChange)
  }, [])

  /* ── load workflow ── */
  useEffect(() => {
    const loadWorkflow = async () => {
      setIsLoading(true)
      try {
        const resp = await fetch("/api/ai-studio/workflows")
        if (resp.ok) {
          const data = await resp.json()
          if (data.workflow) {
            setWorkflowName(data.workflow.name || "Agent Workflow")
            setNodes(data.workflow.nodes || [])
          }
          if (data.runs) setRuns(data.runs)
          if (data.metrics) setMetrics(data.metrics)
        } else {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Failed to load workflow: ${resp.status}`])
          setDiagnostics(prev => [...prev, {
            id: 'load-workflow-error',
            message: `Failed to load workflow: ${resp.status}`,
            severity: 'error',
            source: 'api',
            line: 0,
            column: 0
          }])
        }
      } catch (error) {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error loading workflow: ${error}`])
        setDiagnostics(prev => [...prev, {
          id: 'load-workflow-exception',
          message: `Error loading workflow: ${error}`,
          severity: 'error',
          source: 'network',
          line: 0,
          column: 0
        }])
      } finally {
        setIsLoading(false)
      }
    }
    loadWorkflow()
  }, [])

  /* ── fetch tool list for skill discovery ── */
  useEffect(() => {
    fetch('/api/tools')
      .then(res => res.json())
      .then(data => {
        if (data.tools) setAvailableTools(data.tools)
      })
      .catch((error) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Failed to load tools: ${error}`])
        setDiagnostics(prev => [...prev, {
          id: 'load-tools-error',
          message: `Failed to load available tools: ${error}`,
          severity: 'warning',
          source: 'api',
          line: 0,
          column: 0
        }])
      })
  }, [])

  /* ── auto-scroll logs ── */
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  /* ── metrics polling every 10s ── */
  useEffect(() => {
    const fetchLiveMetrics = async () => {
      try {
        const resp = await fetch("/api/agents/metrics")
        if (resp.ok) {
          const data = await resp.json()
          setLiveMetrics({
            successRate: data.successRate ?? liveMetrics.successRate,
            avgLatency: data.avgLatency ?? liveMetrics.avgLatency,
            tokensPerMin: data.tokensPerMin ?? liveMetrics.tokensPerMin,
          })
        } else {
          setDiagnostics(prev => [...prev, {
            id: 'metrics-poll-error',
            message: `Failed to fetch metrics: ${resp.status}`,
            severity: 'warning',
            source: 'api',
            line: 0,
            column: 0
          }])
        }
      } catch (error) {
        setDiagnostics(prev => [...prev, {
          id: 'metrics-poll-exception',
          message: `Error fetching metrics: ${error}`,
          severity: 'warning',
          source: 'network',
          line: 0,
          column: 0
        }])
      }
    }
    fetchLiveMetrics()
    const id = setInterval(fetchLiveMetrics, 10_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── keyboard shortcut: Delete key ── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNode) {
        const active = document.activeElement
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return
        removeNode(selectedNode.id)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode])

  /* ── run workflow ── */
  const runWorkflow = async () => {
    if (nodes.length === 0) return
    setIsRunning(true)
    const controller = new AbortController()
    abortControllerRef.current = controller
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Starting workflow: ${workflowName}`])

    try {
      const resp = await fetch("/api/ai-studio/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowName, nodes }),
        signal: controller.signal,
      })

      if (!resp.ok || !resp.body) {
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Workflow failed: ${resp.status}`])
        return
      }

      // Read SSE stream from the backend
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalNodeResults: Record<string, { status: string; output?: string }> = {}
      let finalRun: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'start') {
              setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${evt.message || 'Workflow started'}`])
            } else if (evt.type === 'node_start') {
              setNodes((prev) => prev.map((n) => n.id === evt.nodeId ? { ...n, status: 'running' } : n))
            } else if (evt.type === 'node_update') {
              setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${evt.message}`])
            } else if (evt.type === 'node_end') {
              setNodes((prev) => prev.map((n) => n.id === evt.nodeId ? { ...n, status: evt.status } : n))
              if (evt.result) finalNodeResults[evt.nodeId] = evt.result
            } else if (evt.type === 'complete') {
              finalRun = evt.run
              if (evt.nodeResults) finalNodeResults = evt.nodeResults
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }

      if (finalRun) {
        setRuns((prev) => [finalRun, ...prev])
      }
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Workflow completed`])

      // ── AI Studio → Code Chamber bridge ──
      // If any output node produced code, offer to inject it into the workspace VFS
      const outputNodes = Object.entries(finalNodeResults).filter(
        ([id, r]) => r.status === 'success' && r.output && nodes.find(n => n.id === id && n.type === 'output')
      )
      if (outputNodes.length > 0) {
        const outputText = outputNodes.map(([, r]) => r.output).join('\n')
        window.dispatchEvent(new CustomEvent('azora:inject-file', {
          detail: {
            path: `ai-output/${workflowName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.txt`,
            content: outputText,
            source: 'ai-studio',
          },
        }))
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Output sent to Code Chamber workspace`])
      }

    } catch (err) {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${err}`])
    } finally {
      setIsRunning(false)
    }
  }

  const stopWorkflow = async () => {
    // Abort the in-flight SSE stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsRunning(false)
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Workflow stopped`])
    try {
      await fetch("/api/ai-studio/stop", { method: "POST" })
    } catch (error) {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Error stopping workflow: ${error}`])
      setDiagnostics(prev => [...prev, {
        id: 'stop-workflow-error',
        message: `Error stopping workflow: ${error}`,
        severity: 'warning',
        source: 'api',
        line: 0,
        column: 0
      }])
    }
  }

  /* ── node management ── */
  const addNode = (type: AgentNode["type"]) => {
    const nodeType = NODE_TYPES.find((t) => t.type === type)
    const newNode: AgentNode = {
      id: `node-${Date.now()}`,
      name: `${nodeType?.label || "Node"} ${nodes.length + 1}`,
      type,
      status: "idle",
      config: {},
    }
    setNodes((prev) => [...prev, newNode])
    setSelectedNode(newNode)
  }

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    if (selectedNode?.id === id) setSelectedNode(null)
  }

  const duplicateNode = (node: AgentNode) => {
    const copy: AgentNode = {
      ...node,
      id: `node-${Date.now()}`,
      name: `${node.name} (copy)`,
      status: "idle",
      config: { ...node.config, _offsetX: String((parseInt(node.config._offsetX || "0") + 20)), _offsetY: String((parseInt(node.config._offsetY || "0") + 20)) },
    }
    setNodes((prev) => [...prev, copy])
    setSelectedNode(copy)
  }

  const updateNodeConfig = (id: string, key: string, value: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, config: { ...n.config, [key]: value } } : n)))
  }

  /* ── save workflow ── */
  const saveWorkflow = async () => {
    try {
      await fetch("/api/ai-studio/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workflowName, nodes }),
      })
      if (settings.autoSave) {
        createWorkflowVersion()
      }
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Workflow saved`])
    } catch (error) {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Save failed: ${error}`])
      setDiagnostics(prev => [...prev, {
        id: 'save-workflow-error',
        message: `Failed to save workflow: ${error}`,
        severity: 'error',
        source: 'api',
        line: 0,
        column: 0
      }])
    }
  }

  /* ── AI workflow builder from natural language ── */
  const buildFromPrompt = async () => {
    if (!naturalPrompt.trim() || isBuildingFromPrompt) return
    setIsBuildingFromPrompt(true)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] AI building workflow from: "${naturalPrompt}"`])
    try {
      const resp = await fetch("/api/ai-studio/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: naturalPrompt }),
      })
      if (resp.ok) {
        const data = await resp.json()
        if (data.nodes && data.nodes.length > 0) {
          const builtNodes: AgentNode[] = data.nodes.map((n: any, i: number) => ({
            id: `ai-${Date.now()}-${i}`,
            name: n.name || `Step ${i + 1}`,
            type: n.type || "llm",
            status: "idle" as const,
            config: n.config || {},
          }))
          setNodes(builtNodes)
          if (data.name) setWorkflowName(data.name)
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] AI built ${builtNodes.length} nodes`])
        }
      } else {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] AI build failed`])
      }
    } catch (error) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] AI build error: ${error}`])
      setDiagnostics(prev => [...prev, {
        id: 'ai-build-error',
        message: `AI build failed: ${error}`,
        severity: 'error',
        source: 'api',
        line: 0,
        column: 0
      }])
    } finally {
      setIsBuildingFromPrompt(false)
      setNaturalPrompt("")
    }
  }

  const getStatusIcon = (status: AgentNode["status"]) => {
    switch (status) {
      case "running":
        return <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
      case "success":
        return <CheckCircle2 className="w-3 h-3 text-emerald-400" />
      case "error":
        return <XCircle className="w-3 h-3 text-red-400" />
      default:
        return <div className="w-3 h-3 rounded-full border border-zinc-700" />
    }
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* ── Toolbar ── */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-5 bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-purple-400">AI Studio</span>
          </div>
          <span className="text-zinc-700">/</span>
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="h-7 w-48 text-sm bg-transparent border-none px-1 focus-visible:ring-0 text-zinc-300"
          />

          {isRunning && (
            <div className="flex items-center gap-2 ml-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">Running…</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={saveWorkflow} className="gap-1.5 text-xs">
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>

          <div className="w-px h-6 bg-zinc-800 mx-1" />

          {isRunning ? (
            <Button size="sm" className="gap-2 bg-red-600 hover:bg-red-700 text-white" onClick={stopWorkflow}>
              <Square className="w-3.5 h-3.5" />
              Stop
            </Button>
          ) : (
            <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={runWorkflow}>
              <Play className="w-3.5 h-3.5" />
              Run Workflow
            </Button>
          )}

          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => {
            const data = JSON.stringify({ name: workflowName, nodes, exportedAt: new Date().toISOString() }, null, 2)
            const blob = new Blob([data], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${workflowName.replace(/\s+/g, "-").toLowerCase()}-workflow.json`
            a.click()
            URL.revokeObjectURL(url)
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Workflow exported as JSON`])
          }}>
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>

          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => importFileRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" />
            Import
          </Button>
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = (ev) => {
                try {
                  const parsed = JSON.parse(ev.target?.result as string)
                  if (parsed.nodes) setNodes(parsed.nodes)
                  if (parsed.name) setWorkflowName(parsed.name)
                  setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Workflow imported: ${parsed.name || file.name}`])
                } catch {
                  setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Import failed: invalid JSON`])
                }
              }
              reader.readAsText(file)
              e.target.value = ""
            }}
          />
        </div>
      </div>

      {/* ── AI Workflow Builder ── */}
      <div className="px-5 py-2 border-b border-zinc-800 bg-zinc-900/20 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        <Input
          value={naturalPrompt}
          onChange={(e) => setNaturalPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buildFromPrompt()}
          placeholder="Describe your agent pipeline in natural language, e.g. 'Fetch user data, analyze sentiment, route to support or marketing'"
          className="flex-1 h-7 text-xs bg-transparent border-zinc-800 focus-visible:ring-purple-500/30 text-zinc-300 placeholder:text-zinc-600"
          disabled={isBuildingFromPrompt}
        />
        <Button
          size="sm"
          onClick={buildFromPrompt}
          disabled={isBuildingFromPrompt || !naturalPrompt.trim()}
          className="h-7 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
        >
          {isBuildingFromPrompt ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Build
        </Button>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* ── Left: Node Palette ── */}
          <ResizablePanel defaultSize={16} minSize={12} maxSize={22}>
            <div className="h-full border-r border-zinc-800 flex flex-col bg-zinc-900/20">
              <div className="px-4 py-3 border-b border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Node Palette</span>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {NODE_TYPES.map((nt) => {
                    const Icon = nt.icon
                    return (
                      <button
                        key={nt.type}
                        onClick={() => addNode(nt.type as AgentNode["type"])}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all hover:scale-[1.02] ${nt.color}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-medium">{nt.label}</span>
                        <Plus className="w-3 h-3 ml-auto opacity-50" />
                      </button>
                    )
                  })}
                </div>

                <div className="mt-6 border-t border-zinc-800 pt-4">
                  <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Templates</span>
                  <div className="mt-2 space-y-2">
                    {[
                      { name: "RAG Pipeline", desc: "Retrieval-augmented generation", nodes: [
                        { type: 'input' as const, name: 'User Query' },
                        { type: 'tool' as const, name: 'Vector Search' },
                        { type: 'transform' as const, name: 'Context Builder' },
                        { type: 'llm' as const, name: 'LLM Generator' },
                        { type: 'output' as const, name: 'Response' },
                      ]},
                      { name: "Agent Loop", desc: "Autonomous agent with tools", nodes: [
                        { type: 'input' as const, name: 'Task Input' },
                        { type: 'llm' as const, name: 'Planner Agent' },
                        { type: 'condition' as const, name: 'Need Tool?' },
                        { type: 'tool' as const, name: 'Tool Executor' },
                        { type: 'llm' as const, name: 'Reflector' },
                        { type: 'output' as const, name: 'Final Answer' },
                      ]},
                      { name: "Classifier", desc: "Intent classification chain", nodes: [
                        { type: 'input' as const, name: 'Text Input' },
                        { type: 'transform' as const, name: 'Tokenizer' },
                        { type: 'llm' as const, name: 'Classifier LLM' },
                        { type: 'condition' as const, name: 'Confidence Check' },
                        { type: 'output' as const, name: 'Category Output' },
                      ]},
                    ].map((tpl) => (
                      <button
                        key={tpl.name}
                        onClick={() => {
                          const newNodes: AgentNode[] = tpl.nodes.map((n, i) => ({
                            id: `node-${Date.now()}-${i}`,
                            name: n.name,
                            type: n.type,
                            status: 'idle',
                            config: {},
                          }));
                          setNodes(newNodes);
                          setSelectedNode(newNodes[0]);
                        }}
                        className="w-full text-left p-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 transition-all hover:bg-zinc-800/50"
                      >
                        <p className="text-xs font-medium text-zinc-300">{tpl.name}</p>
                        <p className="text-[10px] text-zinc-600">{tpl.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── Center: Workflow Canvas ── */}
          <ResizablePanel defaultSize={52} minSize={35}>
            <div className="h-full flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-8 h-10 rounded-none border-b border-zinc-800 bg-zinc-900/30" role="tablist" aria-label="AI Studio workflow panels">
                  <TabsTrigger value="workflow" className="gap-1 text-xs">
                    <Workflow className="w-3.5 h-3.5" />
                    Workflow
                  </TabsTrigger>
                  <TabsTrigger value="notebook" className="gap-1 text-xs">
                    <Database className="w-3.5 h-3.5" />
                    Notebook
                  </TabsTrigger>
                  <TabsTrigger value="codegen" className="gap-1 text-xs">
                    <Code2 className="w-3.5 h-3.5" />
                    Code Gen
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="gap-1 text-xs">
                    <FileText className="w-3.5 h-3.5" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="chains" className="gap-1 text-xs">
                    <Layers className="w-3.5 h-3.5" />
                    Chains
                  </TabsTrigger>
                  <TabsTrigger value="runs" className="gap-1 text-xs">
                    <Activity className="w-3.5 h-3.5" />
                    Runs
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="gap-1 text-xs">
                    <Terminal className="w-3.5 h-3.5" />
                    Logs
                  </TabsTrigger>
                  <TabsTrigger value="compare" className="gap-1 text-xs">
                    <GitCompare className="w-3.5 h-3.5" />
                    Compare
                  </TabsTrigger>
                </TabsList>

                {/* Workflow Canvas — DAG-style positioned cards */}
                <TabsContent value="workflow" className="flex-1 m-0 relative overflow-auto bg-[#0a0a0f]"
                  style={{ backgroundImage: "radial-gradient(circle, #27272a 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
                  <ErrorBoundary componentName="AI Studio Workflow Canvas">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <RefreshCw className="w-6 h-6 animate-spin text-zinc-600" />
                      </div>
                    ) : nodes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64">
                        <Workflow className="w-14 h-14 text-zinc-800 mb-4" />
                        <p className="text-sm text-zinc-500 mb-1">No nodes in workflow</p>
                        <p className="text-xs text-zinc-700 mb-4">Click a node type in the palette to add it</p>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs border-zinc-700 text-zinc-400" onClick={() => addNode("input")}>
                          <Plus className="w-3 h-3" />
                          Add Input Node
                        </Button>
                      </div>
                    ) : (
                      <div className="relative min-h-full min-w-full p-8">
                        {/* SVG connector arrows */}
                        <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 0 }}>
                          {nodes.map((node, idx) => {
                            if (idx === 0) return null
                            const fromY = (idx - 1) * 110 + 80 + 28
                            const toY = idx * 110 + 80
                            const x = 160
                            return (
                              <g key={`arrow-${node.id}`}>
                                <line
                                  x1={x} y1={fromY} x2={x} y2={toY}
                                  stroke="#3f3f46" strokeWidth="2" markerEnd="url(#arrowhead)"
                                />
                              </g>
                            )
                          })}
                          <defs>
                            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
                              <polygon points="0 0, 8 3, 0 6" fill="#52525b" />
                            </marker>
                          </defs>
                        </svg>

                        {/* Node cards */}
                        <div className="relative space-y-6" style={{ zIndex: 1 }}>
                          {nodes.map((node, idx) => {
                            const nodeConfig = NODE_TYPES.find((t) => t.type === node.type)
                            const Icon = nodeConfig?.icon || Brain
                            const isSelected = selectedNode?.id === node.id
                            return (
                              <motion.div
                                key={node.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex justify-center"
                              >
                                <button
                                  onClick={() => setSelectedNode(node)}
                                  className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all w-80 bg-zinc-900/90 backdrop-blur-sm shadow-xl ${
                                    isSelected
                                      ? "border-blue-500 shadow-blue-500/20"
                                      : "border-zinc-800 hover:border-zinc-600"
                                  }`}
                                >
                                  {/* Input port */}
                                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-600" />
                                  {/* Output port */}
                                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-600" />

                                  <div className={`p-2 rounded-lg ${nodeConfig?.color || "text-zinc-400"}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="text-sm font-semibold text-zinc-200">{node.name}</p>
                                    <p className="text-[10px] text-zinc-500">{nodeConfig?.label}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {getStatusIcon(node.status)}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-zinc-700 hover:text-red-400"
                                      onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </button>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="notebook" className="flex-1 m-0 overflow-hidden">
                  <ErrorBoundary componentName="AI Studio Notebook">
                    <NotebookInterface />
                  </ErrorBoundary>
                </TabsContent>

                {/* ── Phase 1: Code Generation ── */}
                <TabsContent value="codegen" className="flex-1 m-0 overflow-auto">
                  <ErrorBoundary componentName="AI Studio Code Generation">
                    <div className="p-4 space-y-4">
                      {/* Context awareness banner */}
                      <Card className="border-purple-500/20 bg-purple-500/5">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Workspace Context</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div><span className="text-zinc-600">Project:</span> <span className="text-zinc-300">{workspaceContext.projectName}</span></div>
                            <div><span className="text-zinc-600">Language:</span> <span className="text-zinc-300">{workspaceContext.language}</span></div>
                            <div><span className="text-zinc-600">Framework:</span> <span className="text-zinc-300">{workspaceContext.framework}</span></div>
                          </div>
                          {workspaceContext.activeFile && (
                            <div className="mt-1 text-[10px]">
                              <span className="text-zinc-600">Active File:</span> <span className="text-zinc-300 font-mono">{workspaceContext.activeFile}</span>
                            </div>
                          )}
                          {workspaceContext.openFiles.length > 0 && (
                            <div className="mt-1 text-[10px] text-zinc-600">
                              {workspaceContext.openFiles.length} open files
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Model + Language selectors */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Model</label>
                          <select
                            className="w-full h-8 text-xs bg-zinc-900 border border-zinc-700/50 rounded-md px-2 mt-1 text-zinc-300"
                            value={codeGenModel}
                            onChange={(e) => setCodeGenModel(e.target.value)}
                          >
                            <option value="elara-code">Elara Code</option>
                            <option value="elara-pro">Elara Pro</option>
                            <option value="elara-reason">Elara Reason</option>
                            <option value="elara-fast">Elara Fast</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Language</label>
                          <select
                            className="w-full h-8 text-xs bg-zinc-900 border border-zinc-700/50 rounded-md px-2 mt-1 text-zinc-300"
                            value={codeGenLanguage}
                            onChange={(e) => setCodeGenLanguage(e.target.value)}
                          >
                            {["typescript","javascript","python","rust","go","java","c#","sql","html","css"].map(l => (
                              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Prompt input */}
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Prompt</label>
                        <textarea
                          className="w-full h-28 text-xs bg-zinc-900/60 border border-zinc-700/50 rounded-md p-3 mt-1 text-zinc-300 resize-none placeholder:text-zinc-700 font-mono"
                          placeholder="Describe what you want to generate, e.g.:\n• A React hook for debounced search with TypeScript generics\n• An Express middleware for rate limiting with Redis\n• A Prisma schema for a multi-tenant SaaS app"
                          value={codeGenPrompt}
                          onChange={(e) => setCodeGenPrompt(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generateCode() }}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={generateCode}
                          disabled={isCodeGenerating || !codeGenPrompt.trim()}
                          className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          {isCodeGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Code2 className="w-3.5 h-3.5" />}
                          {isCodeGenerating ? 'Generating…' : 'Generate Code'}
                        </Button>
                        {codeGenResult && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs border-zinc-700"
                            onClick={() => { navigator.clipboard.writeText(codeGenResult); setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Code copied to clipboard`]) }}
                          >
                            <Copy className="w-3 h-3" />
                            Copy
                          </Button>
                        )}
                      </div>

                      {/* Code output */}
                      {codeGenResult && (
                        <Card className="bg-zinc-900/80 border-zinc-700/50">
                          <CardContent className="p-0">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/60">
                              <div className="flex items-center gap-2">
                                <Code2 className="w-3 h-3 text-purple-400" />
                                <span className="text-[10px] font-semibold text-zinc-500 uppercase">{codeGenLanguage}</span>
                              </div>
                              <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400">{codeGenModel}</Badge>
                            </div>
                            <pre className="p-4 text-xs font-mono text-zinc-300 overflow-auto max-h-80 whitespace-pre-wrap">{codeGenResult}</pre>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </ErrorBoundary>
                </TabsContent>

                {/* ── Phase 1: Prompt Templates ── */}
                <TabsContent value="templates" className="flex-1 m-0 overflow-auto">
                  <ErrorBoundary componentName="AI Studio Prompt Templates">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-200">Prompt Templates</h3>
                          <p className="text-[10px] text-zinc-600 mt-0.5">Pre-built prompts for common engineering tasks</p>
                        </div>
                      </div>

                      {/* Template grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {PROMPT_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.id}
                            onClick={() => { setActiveTemplate(tpl.id); setTemplateResult('') }}
                            className={`text-left p-3 rounded-lg border transition-all ${
                              activeTemplate === tpl.id
                                ? 'border-purple-500/50 bg-purple-500/10'
                                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">{tpl.icon}</span>
                              <span className="text-xs font-medium text-zinc-200">{tpl.name}</span>
                            </div>
                            <p className="text-[10px] text-zinc-600">{tpl.category}</p>
                          </button>
                        ))}
                      </div>

                      {/* Template execution */}
                      {activeTemplate && (
                        <Card className="bg-zinc-900/60 border-zinc-700/50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{PROMPT_TEMPLATES.find(t => t.id === activeTemplate)?.icon}</span>
                              <span className="text-xs font-bold text-zinc-200">{PROMPT_TEMPLATES.find(t => t.id === activeTemplate)?.name}</span>
                            </div>
                            <textarea
                              className="w-full h-24 text-xs bg-zinc-950/50 border border-zinc-700/50 rounded-md p-3 text-zinc-300 resize-none font-mono placeholder:text-zinc-700"
                              placeholder="Paste your code, query, or description here…"
                              value={templateInput}
                              onChange={(e) => setTemplateInput(e.target.value)}
                            />
                            <Button
                              size="sm"
                              onClick={() => runTemplate(activeTemplate)}
                              disabled={isTemplateRunning || !templateInput.trim()}
                              className="gap-2 bg-purple-600 hover:bg-purple-700 w-full"
                            >
                              {isTemplateRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                              {isTemplateRunning ? 'Running…' : 'Run Template'}
                            </Button>
                            {templateResult && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-zinc-600 uppercase font-semibold">Result</span>
                                  <Button size="sm" variant="ghost" className="h-5 text-[10px]" onClick={() => navigator.clipboard.writeText(templateResult)}>
                                    <Copy className="w-3 h-3 mr-1" /> Copy
                                  </Button>
                                </div>
                                <pre className="bg-zinc-950/80 border border-zinc-800 rounded-md p-3 text-xs font-mono text-zinc-300 max-h-60 overflow-auto whitespace-pre-wrap">{templateResult}</pre>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </ErrorBoundary>
                </TabsContent>

                {/* ── Phase 1: Chain Presets ── */}
                <TabsContent value="chains" className="flex-1 m-0 overflow-auto">
                  <ErrorBoundary componentName="AI Studio Chain Presets">
                    <div className="p-4 space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-200">Chain Presets</h3>
                        <p className="text-[10px] text-zinc-600 mt-0.5">Multi-step AI pipelines that chain prompts together</p>
                      </div>

                      <div className="space-y-3">
                        {CHAIN_PRESETS.map((chain) => (
                          <Card key={chain.id} className={`border-zinc-800 ${activeChain === chain.id ? 'border-purple-500/30 bg-purple-500/5' : 'bg-zinc-900/40'}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h4 className={`text-xs font-bold ${chain.color}`}>{chain.name}</h4>
                                  <p className="text-[10px] text-zinc-600">{chain.steps.length} steps</p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => runChain(chain.id)}
                                  disabled={isChainRunning}
                                  className="h-7 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700"
                                >
                                  {isChainRunning && activeChain === chain.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                  Run
                                </Button>
                              </div>
                              {/* Step indicators */}
                              <div className="flex items-center gap-1">
                                {chain.steps.map((step, i) => {
                                  const chainResult = chainResults[i]
                                  const isActive = activeChain === chain.id
                                  return (
                                    <div key={i} className="flex items-center gap-1 flex-1">
                                      <div className={`flex-1 h-1.5 rounded-full transition-colors ${
                                        !isActive ? 'bg-zinc-800' :
                                        chainResult?.status === 'done' ? 'bg-emerald-500' :
                                        chainResult?.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                        chainResult?.status === 'error' ? 'bg-red-500' :
                                        'bg-zinc-800'
                                      }`} title={step} />
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {chain.steps.map((step, i) => (
                                  <Badge key={i} variant="outline" className="text-[9px] border-zinc-800 text-zinc-600">{step}</Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Chain results */}
                      {chainResults.length > 0 && chainResults.some(r => r.result) && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-zinc-400">Chain Results</h4>
                          {chainResults.filter(r => r.result).map((result, i) => (
                            <Card key={i} className={`border ${result.status === 'done' ? 'border-emerald-500/20 bg-emerald-500/5' : result.status === 'error' ? 'border-red-500/20 bg-red-500/5' : 'border-zinc-800'}`}>
                              <CardContent className="p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  {result.status === 'done' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                                  <span className="text-xs font-medium text-zinc-200">{result.step}</span>
                                </div>
                                <pre className="text-[10px] font-mono text-zinc-400 max-h-32 overflow-auto whitespace-pre-wrap">{result.result}</pre>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Chain input */}
                      <Card className="bg-zinc-900/40 border-zinc-800">
                        <CardContent className="p-3">
                          <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Chain Input</label>
                          <textarea
                            className="w-full h-20 text-xs bg-zinc-950/50 border border-zinc-700/50 rounded-md p-2 mt-1 text-zinc-300 resize-none font-mono placeholder:text-zinc-700"
                            placeholder="Paste code or describe what to process through the chain…"
                            value={templateInput}
                            onChange={(e) => setTemplateInput(e.target.value)}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </ErrorBoundary>
                </TabsContent>

                {/* Runs */}
                <TabsContent value="runs" className="flex-1 m-0 p-4 overflow-auto">
                  {runs.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600 text-xs">No runs yet</div>
                  ) : (
                    <div className="space-y-3">
                      {runs.map((run) => (
                        <Card key={run.id} className="bg-zinc-900/50 border-zinc-800">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    run.status === "completed"
                                      ? "border-emerald-500/30 text-emerald-400"
                                      : run.status === "failed"
                                      ? "border-red-500/30 text-red-400"
                                      : "border-blue-500/30 text-blue-400"
                                  }`}
                                >
                                  {run.status}
                                </Badge>
                                <span className="text-xs text-zinc-500 font-mono">{run.id.slice(0, 8)}</span>
                              </div>
                              <span className="text-[10px] text-zinc-600">{run.startedAt}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span>{run.stepsCompleted}/{run.steps} steps</span>
                              {run.duration && <span>{run.duration}ms</span>}
                            </div>
                            {run.status === "running" && (
                              <Progress value={(run.stepsCompleted / run.steps) * 100} className="h-1 mt-2" />
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Logs */}
                <TabsContent value="logs" className="flex-1 m-0 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/30">
                    <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{logs.length} entries</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] gap-1 text-zinc-600 hover:text-red-400"
                      onClick={() => setLogs([])}
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-4 font-mono text-xs space-y-1.5">
                      {logs.length === 0 ? (
                        <p className="text-zinc-700">No logs yet. Run a workflow to see output.</p>
                      ) : (
                        logs.map((log, i) => {
                          const level = getLogLevel(log)
                          return (
                            <div key={i} className="flex items-start gap-2">
                              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                level === "ERROR" ? "bg-red-500/20 text-red-400" :
                                level === "WARN"  ? "bg-amber-500/20 text-amber-400" :
                                "bg-blue-500/20 text-blue-400"
                              }`}>{level}</span>
                              <span className={`${
                                level === "ERROR" ? "text-red-400" :
                                level === "WARN"  ? "text-amber-400" :
                                "text-zinc-400"
                              }`}>{log}</span>
                            </div>
                          )
                        })
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Model Compare */}
                <TabsContent value="compare" className="flex-1 m-0 overflow-auto">
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Model A</label>
                        <select
                          className="w-full h-8 text-xs bg-zinc-900 border border-zinc-700/50 rounded-md px-2 mt-1 text-zinc-300"
                          value={compareModel1}
                          onChange={(e) => setCompareModel1(e.target.value)}
                        >
                          {MODEL_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Model B</label>
                        <select
                          className="w-full h-8 text-xs bg-zinc-900 border border-zinc-700/50 rounded-md px-2 mt-1 text-zinc-300"
                          value={compareModel2}
                          onChange={(e) => setCompareModel2(e.target.value)}
                        >
                          {MODEL_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[compareModel1, compareModel2].map((modelName, idx) => {
                        const m = MODEL_COMPARISON_DATA[modelName]
                        return (
                          <Card key={idx} className={`border ${idx === 0 ? "border-blue-500/30 bg-blue-500/5" : "border-purple-500/30 bg-purple-500/5"}`}>
                            <CardHeader className="p-3 pb-1">
                              <CardTitle className="text-xs font-bold text-zinc-200">{modelName}</CardTitle>
                              <Badge variant="outline" className={`text-[9px] w-fit ${idx === 0 ? "border-blue-500/30 text-blue-400" : "border-purple-500/30 text-purple-400"}`}>
                                Model {idx === 0 ? "A" : "B"}
                              </Badge>
                            </CardHeader>
                            <CardContent className="p-3 pt-2 space-y-2">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-zinc-600">Latency</span>
                                <span className="text-zinc-300 font-mono">{m.latency}</span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-zinc-600">Cost/1K</span>
                                <span className="text-zinc-300 font-mono">{m.cost}</span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-zinc-600">Context</span>
                                <span className="text-zinc-300 font-mono">{m.context}</span>
                              </div>
                              <div className="pt-1">
                                <span className="text-[10px] text-zinc-600">Strengths</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {m.strengths.map((s) => (
                                    <Badge key={s} variant="outline" className="text-[9px] border-zinc-700 text-zinc-500">{s}</Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── Right: Properties & Metrics ── */}
          <ResizablePanel defaultSize={32} minSize={22}>
            <div className="h-full flex flex-col border-l border-zinc-800">
              <Tabs value={rightTab} onValueChange={setRightTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-6 h-10 rounded-none border-b border-zinc-800 bg-zinc-900/30" role="tablist" aria-label="AI Studio configuration panels">
                  <TabsTrigger value="properties" className="gap-1 text-xs">
                    <Settings className="w-3 h-3" />
                    Config
                  </TabsTrigger>
                  <TabsTrigger value="metrics" className="gap-1 text-xs">
                    <BarChart3 className="w-3 h-3" />
                    Metrics
                  </TabsTrigger>
                  <TabsTrigger value="diagnostics" className="gap-1 text-xs">
                    <Activity className="w-3 h-3" />
                    Issues
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-1 text-xs">
                    <GitBranch className="w-3 h-3" />
                    History
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="gap-1 text-xs">
                    <Settings className="w-3 h-3" />
                    Settings
                  </TabsTrigger>
                  <TabsTrigger value="graph" className="gap-1 text-xs">
                    <Network className="w-3 h-3" />
                    Graph
                  </TabsTrigger>
                </TabsList>

                {/* Node Properties */}
                <TabsContent value="properties" className="flex-1 m-0 overflow-auto">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      {selectedNode ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Node Name</label>
                            <Input
                              value={selectedNode.name}
                              onChange={(e) =>
                                setNodes((prev) =>
                                  prev.map((n) => (n.id === selectedNode.id ? { ...n, name: e.target.value } : n))
                                )
                              }
                              className="h-8 text-xs bg-zinc-900/60 border-zinc-700/50 mt-1"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Type</label>
                            <p className="text-xs text-zinc-400 mt-1 capitalize">{selectedNode.type}</p>
                          </div>

                          {selectedNode.type === "llm" && (
                            <>
                              <div>
                                <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Model</label>
                                <select
                                  className="w-full h-8 text-xs bg-zinc-900 border border-zinc-700/50 rounded-md px-2 mt-1 text-zinc-300"
                                  value={selectedNode.config.model || ""}
                                  onChange={(e) => updateNodeConfig(selectedNode.id, "model", e.target.value)}
                                >
                                  <option value="">Select model</option>
                                  <option value="elara-pro">Elara Pro</option>
                                  <option value="elara-fast">Elara Fast</option>
                                  <option value="elara-reason">Elara Reason</option>
                                  <option value="elara-code">Elara Code</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">System Prompt</label>
                                <textarea
                                  className="w-full h-24 text-xs bg-zinc-900/60 border border-zinc-700/50 rounded-md p-2 mt-1 text-zinc-300 resize-none"
                                  placeholder="Enter system prompt…"
                                  value={selectedNode.config.systemPrompt || ""}
                                  onChange={(e) => updateNodeConfig(selectedNode.id, "systemPrompt", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Temperature</label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="2"
                                  step="0.1"
                                  className="h-8 text-xs bg-zinc-900/60 border-zinc-700/50 mt-1"
                                  value={selectedNode.config.temperature || "0.7"}
                                  onChange={(e) => updateNodeConfig(selectedNode.id, "temperature", e.target.value)}
                                />
                              </div>
                            </>
                          )}

                          {selectedNode.type === "tool" && (
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Tool Name</label>
                              {availableTools.length > 0 ? (
                                <select
                                  className="w-full h-8 text-xs bg-zinc-900 border border-zinc-700/50 rounded-md px-2 mt-1 text-zinc-300"
                                  value={selectedNode.config.toolName || ""}
                                  onChange={(e) => updateNodeConfig(selectedNode.id, "toolName", e.target.value)}
                                >
                                  <option value="">Select tool</option>
                                  {availableTools.map((t) => (
                                    <option key={t.name} value={t.name} title={t.description || ''}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <Input
                                  className="h-8 text-xs bg-zinc-900/60 border-zinc-700/50 mt-1"
                                  placeholder="e.g. web_search, code_interpreter"
                                  value={selectedNode.config.toolName || ""}
                                  onChange={(e) => updateNodeConfig(selectedNode.id, "toolName", e.target.value)}
                                />
                              )}
                            </div>
                          )}

                          {selectedNode.type === "condition" && (
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Condition Expression</label>
                              <Input
                                className="h-8 text-xs bg-zinc-900/60 border-zinc-700/50 mt-1"
                                placeholder="e.g. output.confidence > 0.8"
                                value={selectedNode.config.expression || ""}
                                onChange={(e) => updateNodeConfig(selectedNode.id, "expression", e.target.value)}
                              />
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                              onClick={() => duplicateNode(selectedNode)}
                            >
                              <Copy className="w-3 h-3 mr-1.5" />
                              Duplicate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs text-red-400 border-red-500/20 hover:bg-red-500/10"
                              onClick={() => removeNode(selectedNode.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-1.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Settings className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                          <p className="text-xs text-zinc-600">Select a node to configure</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Metrics */}
                <TabsContent value="metrics" className="flex-1 m-0 overflow-auto">
                  <ErrorBoundary componentName="AI Studio Metrics Dashboard">
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-4">
                        {/* Live metrics sparkline bars */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Live Metrics</span>
                            <span className="text-[9px] text-zinc-700">polls every 10s</span>
                          </div>
                          <div className="space-y-3">
                            {[
                              { label: "Success Rate", value: liveMetrics.successRate, max: 100, unit: "%", color: "bg-emerald-500" },
                              { label: "Avg Latency (ms)", value: Math.min(liveMetrics.avgLatency, 2000), max: 2000, unit: "ms", color: "bg-blue-500" },
                              { label: "Tokens/min", value: Math.min(liveMetrics.tokensPerMin, 10000), max: 10000, unit: "", color: "bg-purple-500" },
                            ].map((stat) => (
                              <div key={stat.label}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] text-zinc-500">{stat.label}</span>
                                  <span className="text-[10px] font-mono text-zinc-300">{stat.label === "Avg Latency (ms)" ? liveMetrics.avgLatency : stat.label === "Tokens/min" ? liveMetrics.tokensPerMin : liveMetrics.successRate}{stat.unit}</span>
                                </div>
                                <Progress value={(stat.value / stat.max) * 100} className="h-1.5" />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Performance</span>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            {metrics.length > 0 ? (
                              metrics.map((m, i) => (
                                <Card key={i} className="bg-zinc-900/50 border-zinc-800">
                                  <CardContent className="p-3">
                                    <p className="text-[10px] text-zinc-600">{m.label}</p>
                                    <p className="text-lg font-bold text-zinc-200 mt-0.5">{m.value}</p>
                                    {m.change && (
                                      <p className={`text-[10px] mt-0.5 ${m.trend === "up" ? "text-emerald-400" : m.trend === "down" ? "text-red-400" : "text-zinc-500"}`}>
                                        {m.change}
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              ))
                            ) : (
                              <>
                                <Card className="bg-zinc-900/50 border-zinc-800">
                                  <CardContent className="p-3">
                                    <p className="text-[10px] text-zinc-600">Total Runs</p>
                                    <p className="text-lg font-bold text-zinc-200 mt-0.5">{runs.length}</p>
                                  </CardContent>
                                </Card>
                                <Card className="bg-zinc-900/50 border-zinc-800">
                                  <CardContent className="p-3">
                                    <p className="text-[10px] text-zinc-600">Nodes</p>
                                    <p className="text-lg font-bold text-zinc-200 mt-0.5">{nodes.length}</p>
                                  </CardContent>
                                </Card>
                                <Card className="bg-zinc-900/50 border-zinc-800">
                                  <CardContent className="p-3">
                                    <p className="text-[10px] text-zinc-600">Success Rate</p>
                                    <p className="text-lg font-bold text-zinc-200 mt-0.5">
                                      {runs.length > 0 ? `${Math.round((runs.filter((r) => r.status === "completed").length / runs.length) * 100)}%` : "—"}
                                    </p>
                                  </CardContent>
                                </Card>
                                <Card className="bg-zinc-900/50 border-zinc-800">
                                  <CardContent className="p-3">
                                    <p className="text-[10px] text-zinc-600">Avg Duration</p>
                                    <p className="text-lg font-bold text-zinc-200 mt-0.5">
                                      {runs.length > 0
                                        ? `${Math.round(runs.filter((r) => r.duration).reduce((s, r) => s + (r.duration || 0), 0) / Math.max(runs.filter((r) => r.duration).length, 1))}ms`
                                        : "—"}
                                    </p>
                                  </CardContent>
                                </Card>
                              </>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Node Status</span>
                          <div className="mt-2 space-y-2">
                            {nodes.map((node) => (
                              <div key={node.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-zinc-900/30 border border-zinc-800">
                                {getStatusIcon(node.status)}
                                <span className="text-xs text-zinc-400 flex-1">{node.name}</span>
                                <Badge variant="outline" className="text-[9px] border-zinc-800 text-zinc-600">
                                  {node.status}
                                </Badge>
                              </div>
                            ))}
                            {nodes.length === 0 && <p className="text-xs text-zinc-700">No nodes</p>}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </ErrorBoundary>
                </TabsContent>

                {/* Diagnostics */}
                <TabsContent value="diagnostics" className="flex-1 m-0 overflow-auto">
                  <ErrorBoundary componentName="AI Studio Diagnostics Panel">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-zinc-200">Workflow Diagnostics</h3>
                        <Button size="sm" onClick={() => setDiagnostics([])} className="text-xs">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                      <ScrollArea className="h-96">
                        <div className="space-y-2">
                          {diagnostics.length === 0 ? (
                            <p className="text-xs text-zinc-600">No diagnostics. Workflow is running smoothly.</p>
                          ) : (
                            diagnostics.map((diag, i) => (
                              <Card key={i} className={`border ${diag.severity === 'error' ? 'border-red-500/30 bg-red-500/5' : diag.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-2">
                                    <div className={`w-2 h-2 rounded-full mt-1 ${diag.severity === 'error' ? 'bg-red-400' : diag.severity === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                                    <div className="flex-1">
                                      <p className="text-xs font-semibold text-zinc-200">{diag.message}</p>
                                      <p className="text-[10px] text-zinc-500">{diag.source} • Line {diag.line}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </ErrorBoundary>
                </TabsContent>

                {/* Version History */}
                <TabsContent value="history" className="flex-1 m-0 overflow-auto">
                  <ErrorBoundary componentName="AI Studio Version History">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-zinc-200">Workflow Versions</h3>
                        <Button size="sm" onClick={createWorkflowVersion} className="text-xs">
                          <GitBranch className="w-3 h-3 mr-1" />
                          Create Version
                        </Button>
                      </div>
                      <ScrollArea className="h-96">
                        <div className="space-y-2">
                          {workflowVersions.length === 0 ? (
                            <p className="text-xs text-zinc-600">No versions yet. Save the workflow to create versions.</p>
                          ) : (
                            workflowVersions.map((version) => (
                              <Card key={version.id} className="bg-zinc-900/50 border-zinc-800">
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-xs font-semibold text-zinc-200">{version.name}</p>
                                      <p className="text-[10px] text-zinc-500">{version.author} • {new Date(version.timestamp).toLocaleString()}</p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => restoreWorkflowVersion(version.id)}
                                      className="text-[10px] h-6"
                                    >
                                      Restore
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </ErrorBoundary>
                </TabsContent>

                {/* Settings */}
                <TabsContent value="settings" className="flex-1 m-0 overflow-auto">
                  <ErrorBoundary componentName="AI Studio Settings Panel">
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-200 mb-3">AI Studio Settings</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-zinc-400">Auto-save workflows</label>
                              <input
                                type="checkbox"
                                checked={settings.autoSave}
                                onChange={(e) => updateSettings({ autoSave: e.target.checked })}
                                className="rounded border-zinc-600"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-zinc-400">Show live metrics</label>
                              <input
                                type="checkbox"
                                checked={settings.showMetrics}
                                onChange={(e) => updateSettings({ showMetrics: e.target.checked })}
                                className="rounded border-zinc-600"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </ErrorBoundary>
                </TabsContent>

                {/* Graph — SVG DAG topology */}
                <TabsContent value="graph" className="flex-1 m-0 overflow-auto">
                  <div className="p-4 h-full">
                    {nodes.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center">
                        <Network className="w-12 h-12 text-zinc-800 mb-3" />
                        <p className="text-xs text-zinc-600 mb-1">Agent Interaction Graph</p>
                        <p className="text-[10px] text-zinc-700">Add nodes to visualize the topology</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">{nodes.length} nodes</p>
                        <svg width="100%" height={Math.max(160, nodes.length * 72)} className="overflow-visible">
                          {nodes.map((node, idx) => {
                            const nc = NODE_TYPES.find(t => t.type === node.type)
                            const x = 80
                            const y = idx * 72 + 36
                            const nextY = (idx + 1) * 72 + 36
                            return (
                              <g key={node.id}>
                                {/* Connector line */}
                                {idx < nodes.length - 1 && (
                                  <line x1={x + 100} y1={y} x2={x + 100} y2={nextY}
                                    stroke="#3f3f46" strokeWidth="2" strokeDasharray="4 2" />
                                )}
                                {/* Node box */}
                                <rect x={x} y={y - 22} width={200} height={44} rx={8}
                                  fill={selectedNode?.id === node.id ? "#1e3a5f" : "#18181b"}
                                  stroke={selectedNode?.id === node.id ? "#3b82f6" : "#3f3f46"}
                                  strokeWidth="1.5"
                                  className="cursor-pointer"
                                  onClick={() => setSelectedNode(node)}
                                />
                                {/* Input port */}
                                <circle cx={x} cy={y} r={5} fill="#3f3f46" stroke="#52525b" strokeWidth="1" />
                                {/* Output port */}
                                <circle cx={x + 200} cy={y} r={5} fill="#3f3f46" stroke="#52525b" strokeWidth="1" />
                                {/* Status dot */}
                                <circle cx={x + 185} cy={y - 14} r={4}
                                  fill={node.status === "success" ? "#22c55e" : node.status === "error" ? "#ef4444" : node.status === "running" ? "#3b82f6" : "#3f3f46"}
                                />
                                <text x={x + 12} y={y - 6} fontSize="11" fontWeight="600" fill="#e4e4e7">{node.name}</text>
                                <text x={x + 12} y={y + 10} fontSize="10" fill="#71717a">{nc?.label}</text>
                              </g>
                            )
                          })}
                        </svg>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* ── Status Bar ── */}
      <div className="h-7 border-t border-zinc-800 flex items-center justify-between px-5 bg-zinc-900/20 text-[11px] text-zinc-600">
        <div className="flex items-center gap-4">
          <span>{nodes.length} nodes</span>
          <span>{runs.length} runs</span>
          {isRunning && <span className="text-blue-400">● Running</span>}
        </div>
        <span>{workflowName}</span>
      </div>
    </div>
  )
}

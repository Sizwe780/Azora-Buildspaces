import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * AI Studio — Workflow Management (LangChain / n8n parity)
 * GET  /api/ai-studio/workflows — List workflows, runs, metrics
 * POST /api/ai-studio/workflows — Create/update workflow with validation
 *
 * Supports: workflow versioning, DAG validation, execution history,
 * and node-type registry.
 *
 * Industry parity: LangFlow, n8n, Prefect
 */

interface WorkflowNode {
  id: string
  name: string
  type: 'input' | 'llm' | 'tool' | 'transform' | 'output' | 'conditional' | 'loop'
  status: string
  config: Record<string, any>
  dependsOn?: string[]
}

interface Workflow {
  id: string
  name: string
  version: number
  nodes: WorkflowNode[]
  createdAt: string
  updatedAt: string
}

interface WorkflowRun {
  id: string
  workflowId: string
  status: 'completed' | 'failed' | 'cancelled' | 'running'
  startedAt: string
  duration: number
  steps: number
  stepsCompleted: number
  error?: string
}

// Allowed node types for validation
const VALID_NODE_TYPES = new Set(['input', 'llm', 'tool', 'transform', 'output', 'conditional', 'loop'])

const WORKFLOWS_PATH = path.join(process.cwd(), 'data', 'ai-studio', 'workflows.json')

interface WorkflowStore {
  workflows: Workflow[]
  runs: WorkflowRun[]
}

async function loadStore(): Promise<WorkflowStore> {
  try {
    const raw = await fs.readFile(WORKFLOWS_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    return {
      workflows: Array.isArray(parsed?.workflows) ? parsed.workflows : [],
      runs: Array.isArray(parsed?.runs) ? parsed.runs : [],
    }
  } catch {
    return { workflows: [], runs: [] }
  }
}

async function saveStore(store: WorkflowStore): Promise<void> {
  await fs.mkdir(path.dirname(WORKFLOWS_PATH), { recursive: true })
  await fs.writeFile(WORKFLOWS_PATH, JSON.stringify(store, null, 2), 'utf-8')
}

function nextWorkflowId(workflows: Workflow[]): string {
  let max = 0
  for (const workflow of workflows) {
    const match = workflow.id.match(/^wf-(\d+)$/)
    if (match) {
      max = Math.max(max, Number(match[1]))
    }
  }
  return `wf-${max + 1}`
}

/**
 * Validate workflow DAG: check for cycles, unknown node types, and missing deps.
 */
function validateWorkflow(nodes: WorkflowNode[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const ids = new Set(nodes.map((n) => n.id))

  for (const node of nodes) {
    if (!VALID_NODE_TYPES.has(node.type)) {
      errors.push(`Node "${node.id}": unknown type "${node.type}"`)
    }
    if (node.dependsOn) {
      for (const dep of node.dependsOn) {
        if (!ids.has(dep)) {
          errors.push(`Node "${node.id}": depends on unknown node "${dep}"`)
        }
      }
    }
  }

  // Simple cycle detection via topological sort
  const visited = new Set<string>()
  const stack = new Set<string>()
  const adj = new Map<string, string[]>()
  for (const n of nodes) {
    adj.set(n.id, n.dependsOn || [])
  }

  function hasCycle(nodeId: string): boolean {
    if (stack.has(nodeId)) return true
    if (visited.has(nodeId)) return false
    visited.add(nodeId)
    stack.add(nodeId)
    for (const dep of adj.get(nodeId) || []) {
      if (hasCycle(dep)) return true
    }
    stack.delete(nodeId)
    return false
  }

  for (const n of nodes) {
    if (hasCycle(n.id)) {
      errors.push('Workflow contains a cycle')
      break
    }
  }

  return { valid: errors.length === 0, errors }
}

export async function GET(req: NextRequest) {
  const store = await loadStore()
  const workflows = store.workflows
  const workflowRuns = store.runs
  const workflowId = req.nextUrl.searchParams.get('id')

  if (workflowId) {
    const wf = workflows.find((workflow) => workflow.id === workflowId)
    if (!wf) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    const runs = workflowRuns.filter((r) => r.workflowId === workflowId)
    return NextResponse.json({ workflow: wf, runs })
  }

  // Return all workflows with aggregated metrics
  const allWorkflows = workflows
  const runs = workflowRuns.slice(-50)

  const totalRuns = runs.length
  const avgDuration = totalRuns > 0 ? +(runs.reduce((s, r) => s + r.duration, 0) / totalRuns).toFixed(2) : 0
  const successRate = totalRuns > 0
    ? Math.round((runs.filter((r) => r.status === 'completed').length / totalRuns) * 100)
    : 0

  const metrics = [
    { label: 'Total Runs', value: String(totalRuns), change: `+${totalRuns}`, trend: 'up' as const },
    { label: 'Avg Duration', value: `${avgDuration}s`, change: '', trend: 'flat' as const },
    { label: 'Success Rate', value: `${successRate}%`, change: '', trend: successRate >= 90 ? 'up' as const : 'flat' as const },
    { label: 'Workflows', value: String(allWorkflows.length), change: '', trend: 'flat' as const },
  ]

  return NextResponse.json({ workflows: allWorkflows, runs, metrics })
}

export async function POST(req: NextRequest) {
  try {
    const store = await loadStore()
    const body = await req.json()
    const { name, nodes, id } = body

    if (!name || !nodes || !Array.isArray(nodes)) {
      return NextResponse.json({ error: 'name and nodes[] are required' }, { status: 400 })
    }

    // Validate the workflow
    const validation = validateWorkflow(nodes)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Workflow validation failed', details: validation.errors },
        { status: 422 },
      )
    }

    const workflowId = id || nextWorkflowId(store.workflows)
    const existing = store.workflows.find((workflow) => workflow.id === workflowId)

    const workflow: Workflow = {
      id: workflowId,
      name,
      version: existing ? existing.version + 1 : 1,
      nodes,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const nextWorkflows = existing
      ? store.workflows.map((item) => (item.id === workflowId ? workflow : item))
      : [...store.workflows, workflow]

    await saveStore({ workflows: nextWorkflows, runs: store.runs })

    return NextResponse.json({ success: true, workflow })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save workflow' }, { status: 500 })
  }
}

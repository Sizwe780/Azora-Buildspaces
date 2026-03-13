import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface AgentMetricsData {
  agentUsageData: Array<{
    name: string;
    tokens: number;
    cost: number;
    latency: number;
  }>;
  tokenHistory: Array<{
    hour: string;
    tokens: number;
  }>;
  summary: {
    totalCost: number;
    totalTokens: number;
    avgLatency: number;
    activeAgents: number;
  };
}

const metricsPath = path.join(process.cwd(), 'data', 'metrics', 'ai-studio.json')

const EMPTY_METRICS: AgentMetricsData = {
  agentUsageData: [],
  tokenHistory: [],
  summary: {
    totalCost: 0,
    totalTokens: 0,
    avgLatency: 0,
    activeAgents: 0,
  },
}

async function loadMetrics(): Promise<AgentMetricsData> {
  const metricsContent = await fs.readFile(metricsPath, 'utf-8')
  return JSON.parse(metricsContent)
}

async function saveMetrics(data: AgentMetricsData): Promise<void> {
  await fs.mkdir(path.dirname(metricsPath), { recursive: true })
  await fs.writeFile(metricsPath, JSON.stringify(data, null, 2))
}

export async function GET(request: NextRequest) {
  try {
    try {
      return NextResponse.json(await loadMetrics())
    } catch {
      return NextResponse.json(
        {
          error: 'AI Studio metrics store not initialized',
          success: false,
          initializeHint: 'POST /api/ai-studio/metrics with first metric payload or bootstrap metrics storage.',
        },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('Error loading metrics:', error)
    return NextResponse.json(
      { error: 'Failed to load metrics', success: false },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentName, tokens, cost, latency } = body

    if (!agentName || typeof tokens !== 'number') {
      return NextResponse.json({ error: 'Invalid metrics data' }, { status: 400 })
    }

    let metricsData: AgentMetricsData
    try {
      metricsData = await loadMetrics()
    } catch {
      metricsData = { ...EMPTY_METRICS }
    }

    const agentIndex = metricsData.agentUsageData.findIndex(a => a.name === agentName)
    if (agentIndex >= 0) {
      metricsData.agentUsageData[agentIndex].tokens += tokens
      metricsData.agentUsageData[agentIndex].cost += cost || 0
      if (latency) {
        metricsData.agentUsageData[agentIndex].latency = latency
      }
    } else {
      metricsData.agentUsageData.push({
        name: agentName,
        tokens,
        cost: cost || 0,
        latency: latency || 1.0
      })
    }

    // Update summary
    metricsData.summary.totalTokens += tokens
    metricsData.summary.totalCost += cost || 0
    metricsData.summary.activeAgents = metricsData.agentUsageData.length

    if (metricsData.agentUsageData.length > 0) {
      const latencySum = metricsData.agentUsageData.reduce((sum, agent) => sum + agent.latency, 0)
      metricsData.summary.avgLatency = Number((latencySum / metricsData.agentUsageData.length).toFixed(3))
    }

    if (metricsData.tokenHistory.length >= 24) {
      metricsData.tokenHistory = metricsData.tokenHistory.slice(-23)
    }
    metricsData.tokenHistory.push({
      hour: new Date().toISOString().slice(11, 13) + ':00',
      tokens,
    })

    await saveMetrics(metricsData)

    return NextResponse.json({ success: true, message: 'Metrics updated' })

  } catch (error) {
    console.error('Error updating metrics:', error)
    return NextResponse.json({ error: 'Failed to update metrics' }, { status: 500 })
  }
}
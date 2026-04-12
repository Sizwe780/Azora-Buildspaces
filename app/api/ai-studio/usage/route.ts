import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'

/**
 * AI Studio — Token Usage Tracking API (B7 / A4.5)
 *
 * Tracks AI token usage across all providers and agents.
 * Returns usage data for the dashboard.
 */

// Cost per 1K tokens (approximate, 2026 pricing)
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'llama-3.1-8b-instant': { input: 0.0001, output: 0.0001 },
  'knowledge-ocean': { input: 0, output: 0 },
}

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = TOKEN_COSTS[model] || { input: 0.001, output: 0.002 }
  return (promptTokens / 1000) * costs.input + (completionTokens / 1000) * costs.output
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      provider,
      model,
      agent = 'ELARA',
      promptTokens = 0,
      completionTokens = 0,
      userId = 'anonymous',
    } = body

    if (!provider || !model) {
      return NextResponse.json({ error: 'provider and model are required' }, { status: 400 })
    }

    const estimatedCost = estimateCost(model, promptTokens, completionTokens)

    const record = await prisma.aIUsageRecord.create({
      data: {
        userId,
        model,
        provider,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        cost: estimatedCost,
        room: agent,
      },
    })

    return NextResponse.json({ success: true, record })
  } catch (error) {
    console.error('[Token Usage] Error recording usage:', error)
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const userId = searchParams.get('userId')
    const period = searchParams.get('period') || '24h'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000)

    // Calculate time window
    const periodMs: Record<string, number> = {
      '1h': 3600_000,
      '24h': 86_400_000,
      '7d': 604_800_000,
      '30d': 2_592_000_000,
    }
    const windowMs = periodMs[period] || periodMs['24h']
    const cutoff = new Date(Date.now() - windowMs)

    const filtered = await prisma.aIUsageRecord.findMany({
      where: {
        ...(userId ? { userId } : {}),
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Aggregate stats
    const totalTokens = filtered.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0)
    const totalCost = filtered.reduce((sum, r) => sum + Number(r.cost), 0)

    const byProvider: Record<string, { tokens: number; cost: number; requests: number }> = {}
    const byAgent: Record<string, { tokens: number; cost: number; requests: number }> = {}
    const byModel: Record<string, { tokens: number; cost: number; requests: number }> = {}

    for (const r of filtered) {
      const tokens = r.inputTokens + r.outputTokens
      const cost = Number(r.cost)

      // By provider
      if (!byProvider[r.provider]) byProvider[r.provider] = { tokens: 0, cost: 0, requests: 0 }
      byProvider[r.provider].tokens += tokens
      byProvider[r.provider].cost += cost
      byProvider[r.provider].requests++

      // By agent (room field)
      const agent = r.room || 'ELARA'
      if (!byAgent[agent]) byAgent[agent] = { tokens: 0, cost: 0, requests: 0 }
      byAgent[agent].tokens += tokens
      byAgent[agent].cost += cost
      byAgent[agent].requests++

      // By model
      if (!byModel[r.model]) byModel[r.model] = { tokens: 0, cost: 0, requests: 0 }
      byModel[r.model].tokens += tokens
      byModel[r.model].cost += cost
      byModel[r.model].requests++
    }

    return NextResponse.json({
      period,
      summary: {
        totalRequests: filtered.length,
        totalTokens,
        totalCost: Math.round(totalCost * 10000) / 10000,
        avgTokensPerRequest: filtered.length > 0 ? Math.round(totalTokens / filtered.length) : 0,
        avgCostPerRequest:
          filtered.length > 0 ? Math.round((totalCost / filtered.length) * 10000) / 10000 : 0,
      },
      byProvider,
      byAgent,
      byModel,
      recentRecords: filtered,
    })
  } catch (error) {
    console.error('[Token Usage] Error fetching usage:', error)
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
  }
}

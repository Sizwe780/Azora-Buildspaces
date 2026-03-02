import { NextRequest, NextResponse } from 'next/server'
import { telemetry } from '@/lib/services/telemetry'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'dashboard'

  switch (action) {
    case 'dashboard':
      return NextResponse.json({ dashboard: telemetry.getDashboard() })
    case 'config':
      return NextResponse.json({ config: telemetry.getConfig() })
    case 'events': {
      const type = searchParams.get('type') as any
      const sessionId = searchParams.get('sessionId') || undefined
      const since = searchParams.get('since') ? parseInt(searchParams.get('since')!) : undefined
      const limit = parseInt(searchParams.get('limit') || '100')
      return NextResponse.json({ events: telemetry.getEvents({ type, sessionId, since, limit }) })
    }
    case 'metrics': {
      const name = searchParams.get('name') || undefined
      const since = searchParams.get('since') ? parseInt(searchParams.get('since')!) : undefined
      return NextResponse.json({ metrics: telemetry.getMetrics(name, since) })
    }
    case 'sessions':
      return NextResponse.json({ sessions: telemetry.getActiveSessions() })
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'track': {
        const { type, sessionId, data, tags } = body
        const event = telemetry.track(type, sessionId, data, tags)
        return NextResponse.json({ event })
      }
      case 'start-session': {
        const { userId, metadata } = body
        const session = telemetry.startSession(userId, metadata)
        return NextResponse.json({ session })
      }
      case 'end-session': {
        const { sessionId } = body
        telemetry.endSession(sessionId)
        return NextResponse.json({ success: true })
      }
      case 'record-metric': {
        const { name, value, unit, tags } = body
        const metric = telemetry.recordMetric(name, value, unit, tags)
        return NextResponse.json({ metric })
      }
      case 'update-config': {
        const { config } = body
        const updated = telemetry.updateConfig(config)
        return NextResponse.json({ config: updated })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

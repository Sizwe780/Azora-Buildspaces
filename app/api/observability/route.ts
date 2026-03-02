import { NextRequest, NextResponse } from 'next/server'
import { observability } from '@/lib/services/observability'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'dashboard'

  switch (action) {
    case 'dashboard':
      return NextResponse.json({ dashboard: observability.getDashboard() })
    case 'health':
      return NextResponse.json({ health: observability.getOverallHealth(), services: observability.getAllServices() })
    case 'service': {
      const name = searchParams.get('name')
      if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })
      return NextResponse.json({ service: observability.getServiceHealth(name) })
    }
    case 'logs': {
      const level = searchParams.get('level') as any
      const service = searchParams.get('service') || undefined
      const search = searchParams.get('search') || undefined
      const limit = parseInt(searchParams.get('limit') || '100')
      return NextResponse.json({ logs: observability.getLogs({ level, service, search, limit }) })
    }
    case 'traces': {
      const limit = parseInt(searchParams.get('limit') || '20')
      return NextResponse.json({ traces: observability.getRecentTraces(limit) })
    }
    case 'trace': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      return NextResponse.json({ trace: observability.getTrace(id) })
    }
    case 'alerts':
      return NextResponse.json({ alerts: observability.getActiveAlerts() })
    case 'all-alerts': {
      const limit = parseInt(searchParams.get('limit') || '50')
      return NextResponse.json({ alerts: observability.getAllAlerts(limit) })
    }
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'log': {
        const { level, message, service, metadata, traceId } = body
        const entry = observability.log(level, message, service, metadata, traceId)
        return NextResponse.json({ entry })
      }
      case 'start-trace': {
        const { name, service, metadata } = body
        const trace = observability.startTrace(name, service, metadata)
        return NextResponse.json({ trace })
      }
      case 'end-trace': {
        const { traceId, status } = body
        observability.endTrace(traceId, status)
        return NextResponse.json({ success: true })
      }
      case 'acknowledge-alert': {
        const { alertId } = body
        observability.acknowledgeAlert(alertId)
        return NextResponse.json({ success: true })
      }
      case 'resolve-alert': {
        const { alertId } = body
        observability.resolveAlert(alertId)
        return NextResponse.json({ success: true })
      }
      case 'register-service': {
        const { name, dependencies } = body
        observability.registerService(name, dependencies)
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { qaTesting } from '@/lib/services/qa-testing'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'frameworks'

  switch (action) {
    case 'frameworks':
      return NextResponse.json({ frameworks: qaTesting.getSupportedFrameworks() })
    case 'runs': {
      const limit = parseInt(searchParams.get('limit') || '20')
      return NextResponse.json({ runs: qaTesting.getRecentRuns(limit) })
    }
    case 'run': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      return NextResponse.json({ run: qaTesting.getRun(id) })
    }
    case 'config': {
      const framework = searchParams.get('framework') as any
      if (!framework) return NextResponse.json({ error: 'Missing framework' }, { status: 400 })
      return NextResponse.json({ config: qaTesting.getDefaultConfig(framework) })
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
      case 'run': {
        const { config } = body
        const run = await qaTesting.runTests(config)
        return NextResponse.json({ run })
      }
      case 'run-single': {
        const { runId, testId } = body
        const result = await qaTesting.runSingleTest(runId, testId)
        return NextResponse.json({ result })
      }
      case 'cancel': {
        const { runId } = body
        await qaTesting.cancelRun(runId)
        return NextResponse.json({ success: true })
      }
      case 'watch': {
        const { config } = body
        const watchId = qaTesting.startWatch(config)
        return NextResponse.json({ watchId })
      }
      case 'unwatch': {
        const { watchId } = body
        qaTesting.stopWatch(watchId)
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

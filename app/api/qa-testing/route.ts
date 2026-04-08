import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { qaTesting } from '@/lib/services/qa-testing'
import { MiningEngine } from '@/lib/economy/mining-engine'

const miningEngine = new MiningEngine()

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'frameworks'

  switch (action) {
    case 'capabilities':
      return NextResponse.json({ capabilities: qaTesting.getCapabilities() })
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
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'run': {
        const { config } = body
        const run = await qaTesting.runTests(config)
        
        // Award tokens for running tests (Truth Verification)
        if (run.status === 'passed') {
          await miningEngine.awardByType(session.user.id, 'TRUTH_VERIFICATION', `Successfully passed all ${run.total} tests using ${run.framework}`)
        } else if (run.status === 'failed' && run.passed > 0) {
          await miningEngine.awardByType(session.user.id, 'PEER_REVIEW', `Verification attempt: ${run.passed}/${run.total} tests passed.`)
        }

        return NextResponse.json({ run })
      }
      case 'run-single': {
        const { runId, testId } = body
        const result = await qaTesting.runSingleTest(runId, testId)
        
        // Minor reward for verifying single test
        if (result?.status === 'passed') {
          await miningEngine.awardByType(session.user.id, 'FACT_CHECK', `Verified test: ${result.name}`)
        }

        return NextResponse.json({ result })
      }
      case 'cancel': {
        const { runId } = body
        await qaTesting.cancelRun(runId)
        return NextResponse.json({ success: true })
      }
      case 'watch': {
        const { config } = body
        let watchId: string
        try {
          watchId = qaTesting.startWatch(config)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          const unsupported = /WATCH_MODE_UNSUPPORTED/i.test(message)
          if (unsupported) {
            return NextResponse.json({
              error: message.replace(/^WATCH_MODE_UNSUPPORTED:\s*/i, ''),
              capabilities: qaTesting.getCapabilities(),
            }, { status: 409 })
          }
          throw error
        }
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
    console.error('[QA Testing API] POST Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

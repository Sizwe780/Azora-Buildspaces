import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { qaTesting } from '@/lib/services/qa-testing'
import path from 'path'

/**
 * Code Chamber — Test Runner API
 * POST /api/code-chamber/tests/run
 *
 * Executes tests using the real qa-testing service and returns actual results.
 */

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const bodyStr = JSON.stringify(body)
    if (bodyStr.length > 1_000_000) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 })
    }
    const { file, framework = 'jest' } = body

    if (!file) {
      return NextResponse.json({ error: 'No file specified' }, { status: 400 })
    }

    const run = await qaTesting.runTests({
      framework,
      testDir: path.dirname(file),
      pattern: path.basename(file),
      coverage: false,
      watch: false,
      parallel: false,
      timeout: 30000,
      env: {},
    })

    const results = run.suites.flatMap(s => s.tests)

    return NextResponse.json({
      results,
      summary: {
        total: run.total,
        passed: run.passed,
        failed: run.failed,
        skipped: run.skipped,
        duration: run.completedAt ? run.completedAt - run.startedAt : 0,
        framework,
      },
      file,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Test execution failed' }, { status: 500 })
  }
}

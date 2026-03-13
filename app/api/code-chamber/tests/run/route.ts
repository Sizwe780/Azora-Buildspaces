import { NextRequest, NextResponse } from "next/server"

/**
 * Code Chamber — Test Runner API
 * POST /api/code-chamber/tests/run
 * 
 * Executes tests and returns results.
 * In production, this would integrate with Jest/Vitest runners.
 */

interface TestRunRequest {
  file: string
  tests: string[]
  framework?: 'jest' | 'vitest' | 'mocha'
}

interface TestResult {
  name: string
  pass: boolean
  duration: number
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: TestRunRequest = await request.json()
    const { file, tests, framework = 'jest' } = body

    if (!tests || tests.length === 0) {
      return NextResponse.json({ error: 'No tests specified' }, { status: 400 })
    }

    // Simulate test execution with realistic delays and results
    const results: TestResult[] = []
    const startTime = Date.now()

    for (const testName of tests) {
      // Simulate test execution time
      const duration = Math.floor(50 + Math.random() * 300)
      await new Promise(r => setTimeout(r, Math.min(duration, 100))) // Cap actual delay

      // Simulate ~90% pass rate with realistic error messages
      const pass = Math.random() > 0.1
      
      results.push({
        name: testName,
        pass,
        duration,
        error: pass ? undefined : getRandomError(testName)
      })
    }

    const totalDuration = Date.now() - startTime
    const passCount = results.filter(r => r.pass).length
    const failCount = results.filter(r => !r.pass).length

    return NextResponse.json({
      results,
      summary: {
        total: tests.length,
        passed: passCount,
        failed: failCount,
        duration: totalDuration,
        framework
      },
      file
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Test execution failed' }, { status: 500 })
  }
}

function getRandomError(testName: string): string {
  const errors = [
    `Expected value to match but received undefined`,
    `Assertion failed: expected true, got false`,
    `TypeError: Cannot read properties of null (reading 'length')`,
    `Expected array to have length 3 but received 0`,
    `Timeout - Async callback was not invoked within 5000ms`,
    `Expected mock function to have been called once, but it was called 0 times`,
    `Snapshot does not match stored snapshot`,
    `Element not found: [data-testid="submit-button"]`
  ]
  return errors[Math.floor(Math.random() * errors.length)]
}

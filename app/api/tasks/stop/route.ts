import { NextRequest, NextResponse } from 'next/server'
import { getProcess, removeProcess } from '../process-registry'

export async function POST(request: NextRequest) {
  try {
    const { executionId } = await request.json()

    if (!executionId) {
      return NextResponse.json({ error: 'Missing executionId' }, { status: 400 })
    }

    const activeProcess = getProcess(executionId)
    if (activeProcess) {
      activeProcess.process.kill('SIGTERM')
      removeProcess(executionId)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Task stop error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
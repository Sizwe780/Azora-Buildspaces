import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { getProcess, registerProcess, removeProcess } from '../process-registry'

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { task, executionId } = await request.json()

    if (!task || !executionId) {
      return NextResponse.json({ error: 'Missing task or executionId' }, { status: 400 })
    }

    const cwd = task.options?.cwd || process.cwd()
    const env = { ...process.env, ...task.options?.env }

    // Handle different task types
    if (task.type === 'shell') {
      const command = task.command
      const args = task.args || []

      // For Windows, use cmd.exe or powershell
      const isWindows = process.platform === 'win32'
      const shell = isWindows ? 'cmd.exe' : '/bin/bash'
      const shellArgs = isWindows ? ['/c', command, ...args] : ['-c', `${command} ${args.join(' ')}`]

      const childProcess = spawn(shell, shellArgs, {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      const output: string[] = []
      registerProcess(executionId, childProcess, output)

      // Handle output
      childProcess.stdout.on('data', (data) => {
        const text = data.toString()
        output.push(text)
      })

      childProcess.stderr.on('data', (data) => {
        const text = data.toString()
        output.push(`[ERROR] ${text}`)
      })

      return await new Promise<Response>((resolve) => {
        childProcess.on('close', (code) => {
          removeProcess(executionId)
          resolve(NextResponse.json({
            success: code === 0,
            exitCode: code,
            output: output.join('')
          }))
        })

        childProcess.on('error', (error) => {
          removeProcess(executionId)
          resolve(NextResponse.json({
            success: false,
            exitCode: -1,
            output: `Process error: ${error.message}`
          }))
        })
      })
    }

    return NextResponse.json({ error: 'Unsupported task type' }, { status: 400 })

  } catch (error) {
    console.error('Task execution error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
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
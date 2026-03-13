import { NextRequest, NextResponse } from 'next/server'
import {
  executeNotebookCode,
  getNotebookKernelSnapshot,
  inspectNotebookVariable,
  interruptNotebookKernel,
  restartNotebookKernel,
} from '@/lib/notebook/kernel-runtime'

export async function GET(req: NextRequest) {
  const kernelId = req.nextUrl.searchParams.get('kernelId') || 'default'

  return NextResponse.json(getNotebookKernelSnapshot(kernelId))
}

export async function POST(req: NextRequest) {
  try {
    const { action, kernelId = 'default', code, variableName } = await req.json()

    if (action === 'restart') {
      const snapshot = restartNotebookKernel(kernelId)
      return NextResponse.json({ success: true, message: 'Kernel restarted', ...snapshot })
    }

    if (action === 'interrupt') {
      const snapshot = interruptNotebookKernel(kernelId)
      return NextResponse.json({ success: true, message: 'Execution interrupted', ...snapshot })
    }

    if (action === 'execute') {
      if (!code) {
        return NextResponse.json({ error: 'Code is required' }, { status: 400 })
      }

      return NextResponse.json(await executeNotebookCode(kernelId, code))
    }

    if (action === 'inspect') {
      if (!variableName) {
        return NextResponse.json({ error: 'variableName is required' }, { status: 400 })
      }

      const variable = inspectNotebookVariable(kernelId, variableName)
      if (!variable) {
        return NextResponse.json({ error: `Variable "${variableName}" not found` }, { status: 404 })
      }

      return NextResponse.json({ ...variable, name: variableName })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

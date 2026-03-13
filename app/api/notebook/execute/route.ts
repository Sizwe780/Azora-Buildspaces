import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { executeNotebookCode } from '@/lib/notebook/kernel-runtime'

export async function POST(req: Request) {
  try {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json()
    const code = body.code || ''
    const kernelId = body.kernelId || 'default'

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const execution = await executeNotebookCode(kernelId, code)
    return NextResponse.json({ result: execution.output.content, output: execution.output, kernel: execution.kernel })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'

const createCellSchema = z.object({
  type: z.enum(['code', 'markdown', 'output', 'raw']).optional(),
  content: z.string().max(100_000),
  output: z.string().optional(),
  order: z.number().int().optional(),
})

/**
 * Notebook — Cell Management (Jupyter parity)
 * GET/POST/PUT/DELETE /api/notebook/cells
 *
 * Manages notebook cells: create, reorder, update, delete.
 * Supports code cells, markdown cells, and output cells.
 * All operations are scoped to the authenticated user.
 *
 * Industry parity: Jupyter Notebook, Google Colab, Observable
 */

async function getOrCreateNotebook(userId: string) {
  let notebook = await prisma.notebook.findFirst({ where: { userId } })
  if (!notebook) {
    notebook = await prisma.notebook.create({
      data: { userId, title: 'My Notebook' },
    })
  }
  return notebook
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const notebook = await getOrCreateNotebook(session.user.id)
    const cells = await prisma.notebookCell.findMany({
      where: { notebookId: notebook.id },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({
      notebookId: notebook.id,
      cells,
      cellCount: cells.length,
      metadata: {
        language: 'typescript',
        kernelStatus: 'idle',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const result = createCellSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 400 })
    }
    const { type, content, output, order } = result.data

    const notebook = await getOrCreateNotebook(session.user.id)

    // Determine order: append at end if not specified
    let cellOrder = order
    if (cellOrder === undefined || cellOrder === null) {
      const count = await prisma.notebookCell.count({ where: { notebookId: notebook.id } })
      cellOrder = count
    }

    const cell = await prisma.notebookCell.create({
      data: {
        notebookId: notebook.id,
        type: type || 'code',
        content: content || '',
        output: output || null,
        order: cellOrder,
      },
    })

    return NextResponse.json({ success: true, cell })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { cellId, content, type, output, order } = await req.json()

    if (!cellId) {
      return NextResponse.json({ error: 'cellId is required' }, { status: 400 })
    }

    // Verify the cell belongs to the authenticated user's notebook
    const notebook = await prisma.notebook.findFirst({ where: { userId: session.user.id } })
    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    const existing = await prisma.notebookCell.findFirst({
      where: { id: cellId, notebookId: notebook.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Cell not found' }, { status: 404 })
    }

    const updated = await prisma.notebookCell.update({
      where: { id: cellId },
      data: {
        ...(content !== undefined && { content }),
        ...(type !== undefined && { type }),
        ...(output !== undefined && { output }),
        ...(order !== undefined && { order }),
      },
    })

    return NextResponse.json({ success: true, cell: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { cellId } = await req.json()

    if (!cellId) {
      return NextResponse.json({ error: 'cellId is required' }, { status: 400 })
    }

    // Verify the cell belongs to the authenticated user's notebook
    const notebook = await prisma.notebook.findFirst({ where: { userId: session.user.id } })
    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    const existing = await prisma.notebookCell.findFirst({
      where: { id: cellId, notebookId: notebook.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Cell not found' }, { status: 404 })
    }

    await prisma.notebookCell.delete({ where: { id: cellId } })

    // Reindex remaining cells by order
    const remaining = await prisma.notebookCell.findMany({
      where: { notebookId: notebook.id },
      orderBy: { order: 'asc' },
    })
    await Promise.all(
      remaining.map((cell, idx) =>
        prisma.notebookCell.update({ where: { id: cell.id }, data: { order: idx } })
      )
    )

    return NextResponse.json({ success: true, remainingCells: remaining.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

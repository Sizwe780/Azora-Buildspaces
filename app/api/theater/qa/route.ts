/**
 * Theater Q&A Persistence — Store and retrieve audience Q&A history
 *
 * Constitutional Compliance:
 * - Ubuntu Philosophy: Collective knowledge preserved for all participants
 * - Truth as Currency: AI-generated answers clearly marked as such
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') || searchParams.get('session') || 'default'
  const since = searchParams.get('since')

  try {
    const where: any = { sessionId }
    if (since) {
      where.createdAt = { gt: new Date(since) }
    }

    const entries = await prisma.theaterQAEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })

    const total = await prisma.theaterQAEntry.count({ where: { sessionId } })

    return NextResponse.json({
      questions: entries.map((e) => ({
        id: e.id,
        question: e.question,
        answer: null,
        askedBy: e.displayName,
        timestamp: e.createdAt.toISOString(),
        upvotes: e.upvotes,
        answered: e.answered,
      })),
      total,
      sessionId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sessionId = 'default', ...data } = body

    if (action === 'save') {
      // If an ID is provided, check for existing entry to avoid duplicates
      if (data.id) {
        const existing = await prisma.theaterQAEntry.findUnique({ where: { id: data.id } })
        if (existing) {
          return NextResponse.json({
            success: true,
            entry: {
              id: existing.id,
              question: existing.question,
              answer: null,
              askedBy: existing.displayName,
              timestamp: existing.createdAt.toISOString(),
              upvotes: existing.upvotes,
              answered: existing.answered,
            },
          })
        }
      }

      const entry = await prisma.theaterQAEntry.create({
        data: {
          id: data.id || undefined,
          sessionId,
          displayName: data.askedBy || 'Anonymous',
          question: data.question,
          upvotes: 0,
          answered: false,
        },
      })

      return NextResponse.json({
        success: true,
        entry: {
          id: entry.id,
          question: entry.question,
          answer: null,
          askedBy: entry.displayName,
          timestamp: entry.createdAt.toISOString(),
          upvotes: entry.upvotes,
          answered: entry.answered,
        },
      })
    }

    if (action === 'upvote') {
      const entry = await prisma.theaterQAEntry.findUnique({ where: { id: data.id } })
      if (!entry) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 })
      }
      const updated = await prisma.theaterQAEntry.update({
        where: { id: data.id },
        data: { upvotes: { increment: 1 } },
      })
      return NextResponse.json({ success: true, upvotes: updated.upvotes })
    }

    if (action === 'clear') {
      await prisma.theaterQAEntry.deleteMany({ where: { sessionId } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

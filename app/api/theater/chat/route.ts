/**
 * Innovation Theater — Chat Route
 *
 * Public audience chat during a live session.
 * Persisted via Prisma TheaterChatMessage model.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') ?? 'default'
  const since = searchParams.get('since')

  try {
    const where: any = { sessionId }
    if (since) {
      where.createdAt = { gt: new Date(since) }
    }

    const messages = await prisma.theaterChatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 200,
    })

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        authorId: m.userId ?? m.displayName,
        authorName: m.displayName,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        pinned: m.pinned,
      })),
      total: messages.length,
      sessionId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId = 'default', authorId, authorName, content, pin, messageId } = body

    if (!authorId || !content?.trim()) {
      return NextResponse.json({ error: 'authorId and content are required' }, { status: 400 })
    }

    // Handle pin toggle for existing message
    if (pin !== undefined && messageId) {
      const updated = await prisma.theaterChatMessage.update({
        where: { id: messageId },
        data: { pinned: Boolean(pin) },
      })
      return NextResponse.json({
        success: true,
        message: {
          id: updated.id,
          sessionId: updated.sessionId,
          authorId: updated.userId ?? updated.displayName,
          authorName: updated.displayName,
          content: updated.content,
          createdAt: updated.createdAt.toISOString(),
          pinned: updated.pinned,
        },
      })
    }

    const newMessage = await prisma.theaterChatMessage.create({
      data: {
        sessionId,
        userId: authorId,
        displayName: authorName ?? 'Anonymous',
        content: content.trim(),
        pinned: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: {
        id: newMessage.id,
        sessionId: newMessage.sessionId,
        authorId: newMessage.userId ?? newMessage.displayName,
        authorName: newMessage.displayName,
        content: newMessage.content,
        createdAt: newMessage.createdAt.toISOString(),
        pinned: newMessage.pinned,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to post message' }, { status: 500 })
  }
}

/**
 * Collaboration Chat API
 * 
 * Enhanced real-time chat for workspace collaboration.
 * Supports: contextual chat (file/line/selection), threads, reactions, search.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { MiningEngine } from '@/lib/economy/mining-engine'
import { prisma } from '@/lib/database/client'

const miningEngine = new MiningEngine()

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get('fileId')
  const roomId = searchParams.get('roomId')
  const threadId = searchParams.get('threadId')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '50')
  const before = searchParams.get('before')

  try {
    // Build dynamic where clause
    const where: any = {}
    if (fileId) where.fileId = fileId
    if (roomId) where.roomId = roomId
    if (threadId) where.threadId = threadId
    if (search) where.content = { contains: search, mode: 'insensitive' }
    if (before) where.createdAt = { lt: new Date(parseInt(before)) }

    // If no filter is specified, require at least fileId or roomId
    if (!fileId && !roomId && !threadId && !search) {
      return NextResponse.json({ error: 'fileId, roomId, threadId, or search is required' }, { status: 400 })
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json({
      messages,
      total: messages.length,
      hasMore: messages.length === limit,
    })
  } catch (error) {
    console.error('Failed to fetch chat messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { 
      fileId, 
      roomId,
      userId: bodyUserId, 
      content, 
      type = 'text',
      line, 
      endLine,
      selection,
      threadId,
      replyToId,
      contextType = 'global',
      codeSnippet,
      language,
      mentions = [],
    } = body

    // Use session user ID for security, fallback to body if strictly necessary but session is preferred
    const userId = session.user.id

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    if (!fileId && !roomId) {
      return NextResponse.json({ error: 'Either fileId or roomId is required' }, { status: 400 })
    }

    // Reward for active collaboration (Art III)
    // We only reward messages that have some substance (e.g. > 10 chars) to prevent spam mining
    if (content.length > 20 || (codeSnippet && codeSnippet.length > 5)) {
      try {
        await miningEngine.awardByType(
          userId, 
          'COLLABORATION', 
          `Workspace Chat: Contributed to ${roomId || fileId}`
        )
      } catch (e) {
        console.warn('Failed to award collaboration tokens:', e)
      }
    }

    // Extract @mentions from content
    const mentionMatches = content.match(/@(\w+)/g)
    const allMentions = [...new Set([...mentions, ...(mentionMatches || []).map((m: string) => m.slice(1))])]

    const message = await prisma.chatMessage.create({
      data: {
        fileId: fileId || undefined,
        roomId: roomId || undefined,
        authorId: userId,
        content,
        type,
        line,
        endLine: endLine || undefined,
        selection,
        threadId: threadId || undefined,
        replyToId: replyToId || undefined,
        contextType,
        codeSnippet: codeSnippet || undefined,
        language: language || undefined,
        mentions: allMentions,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error: any) {
    console.error('Failed to post chat message:', error)
    return NextResponse.json({ error: 'Failed to save message', details: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { messageId, userId, action, emoji, content } = body

    if (!messageId || !action) {
      return NextResponse.json({ error: 'messageId and action are required' }, { status: 400 })
    }

    switch (action) {
      case 'edit': {
        if (!content || !userId) {
          return NextResponse.json({ error: 'content and userId required for edit' }, { status: 400 })
        }
        const message = await prisma.chatMessage.findUnique({ where: { id: messageId } })
        if (!message || message.authorId !== userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
        const updated = await prisma.chatMessage.update({
          where: { id: messageId },
          data: { content, editedAt: new Date() },
        })
        return NextResponse.json(updated)
      }
      case 'react': {
        if (!emoji || !userId) {
          return NextResponse.json({ error: 'emoji and userId required' }, { status: 400 })
        }
        // Store reactions as JSON — in production use a separate reactions table
        const message = await prisma.chatMessage.findUnique({ where: { id: messageId } })
        if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        
        const reactions: Array<{ emoji: string; userIds: string[] }> = (message as any).reactions || []
        const existing = reactions.find((r: any) => r.emoji === emoji)
        if (existing) {
          if (existing.userIds.includes(userId)) {
            existing.userIds = existing.userIds.filter((id: string) => id !== userId)
          } else {
            existing.userIds.push(userId)
          }
        } else {
          reactions.push({ emoji, userIds: [userId] })
        }
        
        const updated = await prisma.chatMessage.update({
          where: { id: messageId },
          data: { reactions: reactions as any },
        })
        return NextResponse.json(updated)
      }
      case 'resolve': {
        const updated = await prisma.chatMessage.update({
          where: { id: messageId },
          data: { isResolved: true },
        })
        return NextResponse.json(updated)
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Chat PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get('messageId')
    const userId = searchParams.get('userId')

    if (!messageId || !userId) {
      return NextResponse.json({ error: 'messageId and userId are required' }, { status: 400 })
    }

    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } })
    if (!message || message.authorId !== userId) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    await prisma.chatMessage.delete({ where: { id: messageId } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Chat DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

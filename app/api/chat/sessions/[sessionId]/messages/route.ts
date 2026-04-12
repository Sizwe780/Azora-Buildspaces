import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

// Constants for agent roles
const AGENT_ROLE_USER = 'user';
const AGENT_ROLE_ASSISTANT = 'assistant';

/**
 * GET /api/chat/sessions/[sessionId]/messages - Get all messages in a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ 
      messages,
      session: { id: sessionId }
    })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/sessions/[sessionId]/messages - Add a message to a session
 * Body: { role: 'user' | 'assistant', content: string, metadata?: object }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()
    const { role, content, metadata } = body

    if (!role || !content) {
      return NextResponse.json(
        { error: 'role and content are required' },
        { status: 400 }
      )
    }

    if (role !== AGENT_ROLE_USER && role !== AGENT_ROLE_ASSISTANT) {
      return NextResponse.json(
        { error: `role must be "${AGENT_ROLE_USER}" or "${AGENT_ROLE_ASSISTANT}"` },
        { status: 400 }
      )
    }

    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Save to ChatMessage table for persistence
    const message = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: role === AGENT_ROLE_USER ? 'user' : 'assistant',
        content,
      }
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Failed to add message', details: error.message },
      { status: 500 }
    )
  }
}

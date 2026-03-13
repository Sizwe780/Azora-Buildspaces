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

    const executions = await prisma.buildSpaceExecution.findMany({
      where: {
        specId: sessionId,
      },
      orderBy: { createdAt: 'asc' },
    })

    const messages = executions.map((exec: any) => {
      const isUserMessage = exec.agentName === AGENT_ROLE_USER;
      const inputPayload = typeof exec.input === 'string' ? { content: exec.input } : exec.input
      const outputPayload = typeof exec.output === 'string' ? { content: exec.output } : exec.output
      const content = isUserMessage
        ? (inputPayload?.content || '')
        : (outputPayload?.content || '')
      
      return {
        id: exec.id,
        sessionId: exec.specId || sessionId,
        role: isUserMessage ? AGENT_ROLE_USER : AGENT_ROLE_ASSISTANT,
        content,
        metadata: {
          agent: exec.agentName,
          status: exec.status,
          tokensUsed: exec.tokensUsed,
        },
        createdAt: exec.createdAt,
      };
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
    const userId = session?.user ? (session.user as any).id : 'anonymous'

    // Save to BuildSpaceExecution table for persistence
    const execution = await prisma.buildSpaceExecution.create({
      data: {
        specId: sessionId,
        agentName: role === AGENT_ROLE_USER ? AGENT_ROLE_USER : (metadata?.agent || 'Elara'),
        status: role === AGENT_ROLE_USER ? 'pending' : 'complete',
        input: role === AGENT_ROLE_USER
          ? { content, role, metadata: metadata || null, createdAt: new Date().toISOString() }
          : { content: '', role, metadata: metadata || null, createdAt: new Date().toISOString() },
        output: role === AGENT_ROLE_ASSISTANT
          ? { content, role, metadata: metadata || null, createdAt: new Date().toISOString() }
          : null,
        tokensUsed: metadata?.tokensUsed || 0,
        startedAt: role === AGENT_ROLE_ASSISTANT ? new Date() : null,
        finishedAt: role === AGENT_ROLE_ASSISTANT ? new Date() : null,
      }
    })

    // Return in chat message format
    const message = {
      id: execution.id,
      sessionId,
      role,
      content,
      metadata: metadata || {},
      createdAt: execution.createdAt,
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Failed to create message', details: error.message },
      { status: 500 }
    )
  }
}

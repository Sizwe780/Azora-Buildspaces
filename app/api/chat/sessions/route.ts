import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

/**
 * GET /api/chat/sessions - List all chat sessions for the current user
 * GET /api/chat/sessions?aiPersona=elara - Filter by AI persona
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const aiPersona = searchParams.get('aiPersona')
    
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id

    const sessions = await prisma.chatSession.findMany({
      where: {
        userId,
        ...(aiPersona ? { aiPersona } : {})
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    return NextResponse.json({ sessions })
  } catch (error: any) {
    console.error('Error fetching chat sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/sessions - Create a new chat session
 * Body: { aiPersona: string, title?: string, context?: any }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { aiPersona, title, context } = body

    if (!aiPersona) {
      return NextResponse.json(
        { error: 'aiPersona is required' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id

    const newSession = await prisma.chatSession.create({
      data: {
        userId,
        aiPersona,
        title: title || `Chat with ${aiPersona}`,
        context: context || {},
      }
    })

    return NextResponse.json({ session: newSession }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating chat session:', error)
    return NextResponse.json(
      { error: 'Failed to create chat session', details: error.message },
      { status: 500 }
    )
  }
}

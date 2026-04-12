/**
 * Theater Presentations API
 *
 * Constitutional Compliance:
 * - Article VIII Section 8.3: No Mock Protocol — real persistence
 * - Ubuntu Philosophy: Knowledge sharing through presentations
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'

interface Slide {
  id: string
  title: string
  content: string
  type: 'title' | 'content' | 'code' | 'demo' | 'image' | 'split'
  notes: string
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 'slide-1',
    title: 'Welcome to Buildspaces',
    content: 'The Constitutional AI Development Platform',
    type: 'title',
    notes: 'Open with the mission: building ethical AI tools for the community.',
  },
  {
    id: 'slide-2',
    title: 'Architecture Overview',
    content:
      '12 rooms, each solving a real developer problem.\n\n• Code Chamber — VS Code-grade IDE\n• AI Studio — Multi-agent orchestration\n• Command Desk — Slash-command control center\n• Knowledge Ocean — RAG-powered docs\n• And 8 more…',
    type: 'content',
    notes: 'Walk through the room map. Emphasize cross-room data flow.',
  },
  {
    id: 'slide-3',
    title: 'Live Code Demo',
    content:
      'import { generateText } from "ai"\nimport { openai } from "@ai-sdk/openai"\n\nconst { text } = await generateText({\n  model: openai("gpt-4o"),\n  prompt: "Explain Constitutional AI",\n})\n\nconsole.log(text)',
    type: 'code',
    notes: 'Show the AI SDK in action. Switch to Code Chamber for the live run.',
  },
  {
    id: 'slide-4',
    title: 'Constitutional AI in Action',
    content: '',
    type: 'demo',
    notes: 'Live demo: create a task, run the AI agent, show validation gates.',
  },
  {
    id: 'slide-5',
    title: 'Join the Community',
    content:
      'Open source • Ubuntu philosophy • Proof-of-Knowledge rewards\n\nGitHub: Azora-OS/azora\nCollectible Showcase: earn cards for contributions',
    type: 'content',
    notes: 'Call to action. Show the Collectible Showcase leaderboard.',
  },
]

async function getOrCreateDefaultPresentation(sessionId: string) {
  const existing = await prisma.theaterPresentation.findFirst({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  })
  if (existing) return existing

  // Ensure session exists (use a system user placeholder)
  const session = await prisma.theaterSession.findUnique({ where: { id: sessionId } })
  if (!session) {
    // Can't create a presentation without a valid session — return a virtual default
    return null
  }

  return prisma.theaterPresentation.create({
    data: {
      sessionId,
      title: 'Welcome to Innovation Theater',
      slides: DEFAULT_SLIDES as any,
      activeIndex: 0,
    },
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') ?? 'default'

  try {
    const presentations = await prisma.theaterPresentation.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })

    const active = presentations[0] ?? null
    const slides = active ? (active.slides as Slide[]) : DEFAULT_SLIDES

    return NextResponse.json({
      sessionId,
      presentations: presentations.map((p) => ({
        id: p.id,
        title: p.title,
        slideCount: Array.isArray(p.slides) ? (p.slides as any[]).length : 0,
      })),
      slides,
      activePresentation: active?.id ?? null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = body.sessionId || 'default'
    const presentationId = body.presentationId

    // Ensure session exists
    let session = await prisma.theaterSession.findUnique({ where: { id: sessionId } })
    if (!session) {
      // Create a placeholder session so presentations can be stored
      session = await prisma.theaterSession.create({
        data: {
          id: sessionId,
          userId: 'system',
          title: 'Theater Session',
          status: 'active',
        },
      })
    }

    let presentation
    if (presentationId) {
      presentation = await prisma.theaterPresentation.findUnique({ where: { id: presentationId } })
    }

    if (!presentation) {
      presentation = await prisma.theaterPresentation.create({
        data: {
          id: presentationId || undefined,
          sessionId,
          title: body.title || 'Untitled',
          slides: Array.isArray(body.slides) ? (body.slides as any) : [],
          activeIndex: 0,
        },
      })
    } else if (body.slides) {
      presentation = await prisma.theaterPresentation.update({
        where: { id: presentation.id },
        data: {
          slides: body.slides as any,
          title: body.title || presentation.title,
        },
      })
    }

    return NextResponse.json({ success: true, sessionId, presentation })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

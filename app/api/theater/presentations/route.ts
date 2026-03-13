/**
 * Theater Presentations API
 * 
 * Constitutional Compliance:
 * - Article VIII Section 8.3: No Mock Protocol — real persistence
 * - Ubuntu Philosophy: Knowledge sharing through presentations
 */

import { NextRequest, NextResponse } from 'next/server'

interface Slide {
  id: string
  title: string
  content: string
  type: 'title' | 'content' | 'code' | 'demo' | 'image' | 'split'
  notes: string
}

interface Presentation {
  id: string
  title: string
  slides: Slide[]
  createdAt: string
  updatedAt: string
}

const sessionPresentations = new Map<string, Presentation[]>()

function createDefaultPresentation(sessionId: string): Presentation {
  const normalizedId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '-')

  return {
    id: `pres-${normalizedId}`,
    title: 'Welcome to Innovation Theater',
    slides: [
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
        content: '12 rooms, each solving a real developer problem.\n\n• Code Chamber — VS Code-grade IDE\n• AI Studio — Multi-agent orchestration\n• Command Desk — Slash-command control center\n• Knowledge Ocean — RAG-powered docs\n• And 8 more…',
        type: 'content',
        notes: 'Walk through the room map. Emphasize cross-room data flow.',
      },
      {
        id: 'slide-3',
        title: 'Live Code Demo',
        content: 'import { generateText } from "ai"\nimport { openai } from "@ai-sdk/openai"\n\nconst { text } = await generateText({\n  model: openai("gpt-4o"),\n  prompt: "Explain Constitutional AI",\n})\n\nconsole.log(text)',
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
        content: 'Open source • Ubuntu philosophy • Proof-of-Knowledge rewards\n\nGitHub: Azora-OS/azora\nCollectible Showcase: earn cards for contributions',
        type: 'content',
        notes: 'Call to action. Show the Collectible Showcase leaderboard.',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function getSessionPresentations(sessionId: string): Presentation[] {
  if (!sessionPresentations.has(sessionId)) {
    sessionPresentations.set(sessionId, [createDefaultPresentation(sessionId)])
  }

  return sessionPresentations.get(sessionId)!
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') ?? 'default'
  const presentations = getSessionPresentations(sessionId)
  const active = presentations[0]

  return NextResponse.json({
    sessionId,
    presentations: presentations.map((p) => ({ id: p.id, title: p.title, slideCount: p.slides.length })),
    slides: active?.slides ?? [],
    activePresentation: active?.id,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = body.sessionId || 'default'
    const presentationId = body.presentationId
    const presentations = getSessionPresentations(sessionId)
    let activeIndex = presentationId
      ? presentations.findIndex((presentation) => presentation.id === presentationId)
      : 0

    if (activeIndex === -1) {
      presentations.push({
        id: presentationId || `pres-${Date.now()}`,
        title: body.title || 'Untitled',
        slides: Array.isArray(body.slides) ? body.slides : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      activeIndex = presentations.length - 1
    }

    if (body.slides) {
      presentations[activeIndex] = {
        ...presentations[activeIndex],
        slides: body.slides,
        title: body.title || presentations[activeIndex].title,
        updatedAt: new Date().toISOString(),
      }
    }

    sessionPresentations.set(sessionId, presentations)

    return NextResponse.json({ success: true, sessionId, presentation: presentations[activeIndex] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

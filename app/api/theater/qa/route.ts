/**
 * Theater Q&A Persistence — Store and retrieve audience Q&A history
 *
 * Constitutional Compliance:
 * - Ubuntu Philosophy: Collective knowledge preserved for all participants
 * - Truth as Currency: AI-generated answers clearly marked as such
 */

import { NextRequest, NextResponse } from 'next/server'

interface QAEntry {
  id: string
  question: string
  answer: string
  askedBy: string
  slideContext?: string
  timestamp: string
  upvotes: number
}

// In-memory store per session (production: use database)
const qaStore = new Map<string, QAEntry[]>()

function getSessionQA(sessionId: string): QAEntry[] {
  if (!qaStore.has(sessionId)) {
    qaStore.set(sessionId, [])
  }
  return qaStore.get(sessionId)!
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') || searchParams.get('session') || 'default'
  const since = searchParams.get('since')

  let entries = getSessionQA(sessionId)

  if (since) {
    const sinceDate = new Date(since)
    entries = entries.filter(e => new Date(e.timestamp) > sinceDate)
  }

  return NextResponse.json({
    questions: entries,
    total: getSessionQA(sessionId).length,
    sessionId,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sessionId = 'default', ...data } = body

    if (action === 'save') {
      const entry: QAEntry = {
        id: data.id || `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        question: data.question,
        answer: data.answer,
        askedBy: data.askedBy || 'Anonymous',
        slideContext: data.slideContext,
        timestamp: data.timestamp || new Date().toISOString(),
        upvotes: 0,
      }

      const store = getSessionQA(sessionId)
      // Avoid duplicates by ID
      if (!store.find(e => e.id === entry.id)) {
        store.push(entry)
        // Cap at 200 entries per session
        if (store.length > 200) store.shift()
      }

      return NextResponse.json({ success: true, entry })
    }

    if (action === 'upvote') {
      const store = getSessionQA(sessionId)
      const entry = store.find(e => e.id === data.id)
      if (entry) {
        entry.upvotes += 1
        return NextResponse.json({ success: true, upvotes: entry.upvotes })
      }
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    if (action === 'clear') {
      qaStore.set(sessionId, [])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Theater Stream API — Go live / stop stream
 * Uses Redis for distributed session tracking with in-memory fallback.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from '@/lib/redis-client'

interface StreamState {
  sessionId: string
  isLive: boolean
  startedAt: string | null
  viewerCount: number
  peakViewers: number
  totalReactions: number
  currentSlide: number
  slideCount: number
  presentationId: string | null
  updatedAt: string
}

// In-memory fallback
const sessionStreams = new Map<string, StreamState>()

async function getSessionStream(sessionId: string): Promise<StreamState> {
  const defaultState: StreamState = {
    sessionId,
    isLive: false,
    startedAt: null,
    viewerCount: 0,
    peakViewers: 0,
    totalReactions: 0,
    currentSlide: 0,
    slideCount: 0,
    presentationId: null,
    updatedAt: new Date().toISOString(),
  }

  const redis = await getRedisClient()
  if (redis) {
    const raw = await redis.get(`theater:stream:${sessionId}`)
    if (raw) return JSON.parse(raw) as StreamState
    return defaultState
  }

  if (!sessionStreams.has(sessionId)) {
    sessionStreams.set(sessionId, defaultState)
  }
  return sessionStreams.get(sessionId)!
}

async function saveSessionStream(sessionId: string, state: StreamState) {
  const redis = await getRedisClient()
  if (redis) {
    await redis.set(`theater:stream:${sessionId}`, JSON.stringify(state), 'EX', 60 * 60 * 24)
  } else {
    sessionStreams.set(sessionId, state)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') ?? 'default'

  try {
    const state = await getSessionStream(sessionId)
    return NextResponse.json(state)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch stream state' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      action,
      sessionId = 'default',
      currentSlide,
      slideCount,
      viewerCount,
      totalReactions,
      presentationId,
    } = await request.json()

    const streamState = await getSessionStream(sessionId)
    const updatedAt = new Date().toISOString()
    let newState = { ...streamState }

    if (action === 'start') {
      newState = {
        ...streamState,
        sessionId,
        isLive: true,
        startedAt: streamState.startedAt ?? updatedAt,
        viewerCount: typeof viewerCount === 'number' ? viewerCount : streamState.viewerCount,
        peakViewers: Math.max(
          streamState.peakViewers,
          typeof viewerCount === 'number' ? viewerCount : streamState.viewerCount,
        ),
        totalReactions:
          typeof totalReactions === 'number' ? totalReactions : streamState.totalReactions,
        currentSlide: typeof currentSlide === 'number' ? currentSlide : streamState.currentSlide,
        slideCount: typeof slideCount === 'number' ? slideCount : streamState.slideCount,
        presentationId: presentationId ?? streamState.presentationId,
        updatedAt,
      }
    } else if (action === 'stop') {
      newState = { ...streamState, isLive: false, updatedAt }
    } else if (action === 'sync') {
      newState = {
        ...streamState,
        viewerCount: typeof viewerCount === 'number' ? viewerCount : streamState.viewerCount,
        peakViewers: Math.max(
          streamState.peakViewers,
          typeof viewerCount === 'number' ? viewerCount : streamState.viewerCount,
        ),
        totalReactions:
          typeof totalReactions === 'number' ? totalReactions : streamState.totalReactions,
        currentSlide: typeof currentSlide === 'number' ? currentSlide : streamState.currentSlide,
        slideCount: typeof slideCount === 'number' ? slideCount : streamState.slideCount,
        presentationId: presentationId ?? streamState.presentationId,
        updatedAt,
      }
    } else {
      newState = {
        ...streamState,
        currentSlide: typeof currentSlide === 'number' ? currentSlide : streamState.currentSlide,
        updatedAt,
      }
    }

    await saveSessionStream(sessionId, newState)
    return NextResponse.json({ success: true, state: newState })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update stream state' }, { status: 500 })
  }
}

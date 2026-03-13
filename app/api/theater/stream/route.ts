/**
 * Theater Stream API — Go live / stop stream
 * Swapped memory cache with Redis mapping for distributed session tracking.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from "ioredis"

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

let redis: Redis | null = null
if (process.env.REDIS_URL && process.env.NODE_ENV !== "test") {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      enableOfflineQueue: false,
    })
    
    // Handle connection errors gracefully
    redis.on('error', (err: Error) => {
      console.warn('[Theater] Redis connection error:', err.message)
      // Don't crash the app on Redis errors
    })
    
    redis.on('connect', () => {
      console.log('[Theater] Redis connected successfully')
    })
    
    // Try to connect but don't block startup
    redis.connect().catch((err) => {
      console.warn('[Theater] Redis connection failed, using in-memory fallback:', err instanceof Error ? err.message : String(err))
      redis = null
    })
  } catch (err) {
    console.warn("[Theater] Failed to initialize Redis:", err)
    redis = null
  }
}

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

  if (redis) {
    const raw = await redis.get(`theater:stream:${sessionId}`)
    if (raw) return JSON.parse(raw) as StreamState
    return defaultState
  } else {
    if (!sessionStreams.has(sessionId)) {
      sessionStreams.set(sessionId, defaultState)
    }
    return sessionStreams.get(sessionId)!
  }
}

async function saveSessionStream(sessionId: string, state: StreamState) {
  if (redis) {
    await redis.set(`theater:stream:${sessionId}`, JSON.stringify(state), "EX", 60 * 60 * 24)
  } else {
    sessionStreams.set(sessionId, state)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') ?? 'default'

  const state = await getSessionStream(sessionId)
  return NextResponse.json(state)
}

export async function POST(request: NextRequest) {
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
      peakViewers: Math.max(streamState.peakViewers, typeof viewerCount === 'number' ? viewerCount : streamState.viewerCount),
      totalReactions: typeof totalReactions === 'number' ? totalReactions : streamState.totalReactions,
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
      peakViewers: Math.max(streamState.peakViewers, typeof viewerCount === 'number' ? viewerCount : streamState.viewerCount),
      totalReactions: typeof totalReactions === 'number' ? totalReactions : streamState.totalReactions,
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
}

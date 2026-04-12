/**
 * Innovation Theater — Reaction Route
 *
 * Records audience emoji reactions during a live session.
 * Reactions are aggregated per emoji type and returned as a summary.
 * Uses Redis for persistence with in-memory fallback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from '@/lib/redis-client'

const ALLOWED_REACTIONS = ['👍', '❤️', '🔥', '👏', '😂', '🤯', '🚀', '💡']

interface ReactionSummary {
  emoji: string
  count: number
}

// In-memory fallback: sessionId -> { emoji -> count }
const sessionReactions = new Map<string, Map<string, number>>()

function getInMemoryReactions(sessionId: string): Map<string, number> {
  if (!sessionReactions.has(sessionId)) {
    sessionReactions.set(sessionId, new Map())
  }
  return sessionReactions.get(sessionId)!
}

async function getReactionSummary(sessionId: string): Promise<ReactionSummary[]> {
  const redis = await getRedisClient()
  if (redis) {
    const key = `theater:reactions:${sessionId}`
    const raw = await redis.hgetall(key)
    return ALLOWED_REACTIONS.map((emoji) => ({
      emoji,
      count: raw[emoji] ? parseInt(raw[emoji], 10) : 0,
    }))
  }
  const reactions = getInMemoryReactions(sessionId)
  return ALLOWED_REACTIONS.map((emoji) => ({
    emoji,
    count: reactions.get(emoji) ?? 0,
  }))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') ?? 'default'

  try {
    const summary = await getReactionSummary(sessionId)
    return NextResponse.json({ reactions: summary, sessionId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch reactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId = 'default', emoji } = body

    if (!emoji) {
      return NextResponse.json({ error: 'emoji is required' }, { status: 400 })
    }

    if (!ALLOWED_REACTIONS.includes(emoji)) {
      return NextResponse.json(
        { error: `emoji must be one of: ${ALLOWED_REACTIONS.join(' ')}` },
        { status: 400 },
      )
    }

    const redis = await getRedisClient()
    if (redis) {
      const key = `theater:reactions:${sessionId}`
      await redis.hincrby(key, emoji, 1)
      await redis.expire(key, 60 * 60 * 24) // 24 hours
    } else {
      const reactions = getInMemoryReactions(sessionId)
      reactions.set(emoji, (reactions.get(emoji) ?? 0) + 1)
    }

    const summary = await getReactionSummary(sessionId)
    return NextResponse.json({ success: true, reactions: summary, sessionId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to record reaction' }, { status: 500 })
  }
}

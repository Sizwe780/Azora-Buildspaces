/**
 * AI Studio — Current Workflow Route
 *
 * Returns the active workflow definition that the UI should display/edit.
 * Persists to Redis (per-user, 24hr TTL) with in-memory fallback.
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { getRedisClient } from "@/lib/redis-client"

const DEFAULT_WORKFLOW = {
  id: "workflow-current",
  name: "Agent Workflow",
  nodes: [
    {
      id: "node-1",
      name: "Input",
      type: "input",
      status: "idle",
      config: { prompt: "Analyze this text" },
    },
    {
      id: "node-2",
      name: "LLM Call",
      type: "llm",
      status: "idle",
      config: { model: "gpt-4o-mini", system: "You are a helpful assistant." },
    },
    {
      id: "node-3",
      name: "Output",
      type: "output",
      status: "idle",
      config: {},
    },
  ],
  edges: [
    { id: "e1-2", source: "node-1", target: "node-2" },
    { id: "e2-3", source: "node-2", target: "node-3" },
  ],
}

// In-memory fallback when Redis is unavailable
const inMemoryStore: Record<string, object> = {}

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id || "anonymous"
  const key = `agents:workflow:current:${userId}`

  const redis = await getRedisClient()
  if (redis) {
    try {
      const raw = await redis.get(key)
      if (raw) {
        return NextResponse.json({ workflow: JSON.parse(raw) })
      }
    } catch (err) {
      console.warn("[agents/workflows/current] Redis GET failed:", err)
    }
  }

  // Fall back to in-memory, then default
  const workflow = inMemoryStore[key] ?? { ...DEFAULT_WORKFLOW, updatedAt: new Date().toISOString() }
  return NextResponse.json({ workflow })
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id || "anonymous"
    const key = `agents:workflow:current:${userId}`

    const body = await req.json()
    const workflow = {
      ...DEFAULT_WORKFLOW,
      ...body,
      updatedAt: new Date().toISOString(),
    }

    const redis = await getRedisClient()
    if (redis) {
      try {
        await redis.set(key, JSON.stringify(workflow), "EX", 86400)
      } catch (err) {
        console.warn("[agents/workflows/current] Redis SET failed, using in-memory:", err)
        inMemoryStore[key] = workflow
      }
    } else {
      inMemoryStore[key] = workflow
    }

    return NextResponse.json({ success: true, workflow })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update workflow" }, { status: 500 })
  }
}

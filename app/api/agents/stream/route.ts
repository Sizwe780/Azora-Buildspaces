import { NextRequest } from 'next/server'
import { getOrchestrator, TraceStep } from '@/lib/agents/orchestrator'
import { loadExecutionState, upsertExecutionRecord } from '@/lib/agents/persistence'

interface StreamRequest {
  // instead of requiring an existing workflow, callers may provide
  // `messages` and `model` to run an ad-hoc agent workflow
  workflowId?: string
  triggerData?: any
  messages?: Array<{ role: string; content: string }>
  model?: string
  executionId?: string
  projectId?: string
}

interface LLMLikeResponse {
  text?: unknown
  response?: unknown
  output?: unknown
  output_text?: unknown
  generated_text?: unknown
  message?: {
    content?: unknown
  }
  choices?: Array<{
    text?: unknown
    message?: {
      content?: unknown
    }
  }>
}

function isMistralModel(model?: string): boolean {
  return typeof model === 'string' && model.toLowerCase().includes('mistral')
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

function stringifyErrorDetails(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error)
  }

  const cause = (error as Error & { cause?: unknown }).cause
  if (!cause) {
    return error.message
  }

  if (cause instanceof Error) {
    return `${error.message}; cause=${cause.message}`
  }

  if (typeof cause === 'object') {
    const causeRecord = cause as Record<string, unknown>
    const code = typeof causeRecord.code === 'string' ? causeRecord.code : 'unknown'
    const msg = typeof causeRecord.message === 'string' ? causeRecord.message : 'unknown'
    return `${error.message}; cause_code=${code}; cause_message=${msg}`
  }

  return `${error.message}; cause=${String(cause)}`
}

function buildMistralPrompt(messages?: Array<{ role: string; content: string }>): { prompt: string; context: string } {
  const safeMessages = Array.isArray(messages) ? messages : []
  const lastUser = [...safeMessages].reverse().find((msg) => msg.role === 'user')
  const prompt = lastUser?.content || 'Hello'

  const historyLines = safeMessages
    .slice(-20)
    .filter((msg) => typeof msg.content === 'string' && msg.content.trim().length > 0)
    .map((msg) => `${msg.role}: ${msg.content}`)

  return {
    prompt,
    context: historyLines.join('\n'),
  }
}

function extractModelText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''

  const data = payload as LLMLikeResponse

  const directCandidates = [
    data.text,
    data.response,
    data.output,
    data.output_text,
    data.generated_text,
    data.message?.content,
  ]
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate
    }
  }

  const firstChoice = Array.isArray(data.choices) ? data.choices[0] : undefined
  if (typeof firstChoice?.message?.content === 'string' && firstChoice.message.content.trim().length > 0) {
    return firstChoice.message.content
  }
  if (typeof firstChoice?.text === 'string' && firstChoice.text.trim().length > 0) {
    return firstChoice.text
  }

  return ''
}

async function queryLocalMistral(
  body: StreamRequest,
  prompt: string,
  context: string
): Promise<string | null> {
  const localLlmUrl = process.env.LOCAL_LLM_API_URL?.trim()
  if (!localLlmUrl) return null

  const safeMessages = Array.isArray(body.messages) ? body.messages.slice(-20) : []
  const modelName = process.env.LOCAL_LLM_MODEL || body.model || 'mistral'
  const maxNewTokens = parsePositiveInt(process.env.LOCAL_LLM_MAX_NEW_TOKENS, 48)
  const timeoutMs = parsePositiveInt(process.env.LOCAL_LLM_TIMEOUT_MS, 600000)
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)
  const requestBody = {
    model: modelName,
    prompt,
    input: prompt,
    context,
    messages: safeMessages,
    stream: false,
    temperature: 0.3,
    max_tokens: maxNewTokens,
    max_new_tokens: maxNewTokens,
  }

  let response: Response
  try {
    response = await fetch(localLlmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
  } catch (error) {
    const detail = stringifyErrorDetails(error)
    throw new Error(`LOCAL_LLM_API_URL fetch failed (${localLlmUrl}) with max_new_tokens=${maxNewTokens}: ${detail}`)
  } finally {
    clearTimeout(timeoutHandle)
  }

  if (!response.ok) {
    throw new Error(`LOCAL_LLM_API_URL request failed: ${response.status}`)
  }

  const payload = await response.json()
  const text = extractModelText(payload)
  return text || null
}

async function queryCodeChamberAI(req: NextRequest, prompt: string, context: string): Promise<string | null> {
  const aiUrl = new URL('/api/code-chamber/ai', req.url)
  const aiResponse = await fetch(aiUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      action: 'chat',
      prompt,
      context,
      stream: false,
    }),
  })

  if (!aiResponse.ok) {
    throw new Error(`Code Chamber AI request failed: ${aiResponse.status}`)
  }

  const aiData = await aiResponse.json() as { text?: unknown }
  return typeof aiData.text === 'string' ? aiData.text : null
}

function createDoneStream(payload: Record<string, unknown>) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(payload)}\n\n`))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

async function resolveAdHocChatText(req: NextRequest, body: StreamRequest): Promise<{
  text: string
  provider: string
  model: string
  details?: Record<string, string>
}> {
  const { prompt, context } = buildMistralPrompt(body.messages)
  const requestedModel = body.model || 'elara-pro'

  if (isMistralModel(requestedModel)) {
    let text = ''
    let localError = ''
    let codeChamberError = ''

    try {
      const localText = await queryLocalMistral(body, prompt, context)
      if (typeof localText === 'string' && localText.trim().length > 0) {
        text = localText
      }
    } catch (error) {
      localError = error instanceof Error ? error.message : String(error)
    }

    if (!text) {
      try {
        const aiText = await queryCodeChamberAI(req, prompt, context)
        if (typeof aiText === 'string' && aiText.trim().length > 0) {
          text = aiText
        }
      } catch (error) {
        codeChamberError = error instanceof Error ? error.message : String(error)
      }
    }

    if (!text) {
      return {
        text: 'Mistral request failed. Check LOCAL_LLM_API_URL / LOCAL_LLM_MODEL and backend health.',
        provider: 'mistral',
        model: requestedModel,
        details: {
          localLlm: localError || 'not configured',
          codeChamberAI: codeChamberError || 'no text response',
        },
      }
    }

    return {
      text,
      provider: 'mistral',
      model: requestedModel,
    }
  }

  try {
    const text = await queryCodeChamberAI(req, prompt, context)
    if (text && text.trim().length > 0) {
      return {
        text,
        provider: 'azora',
        model: requestedModel,
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      text: `AI request failed for model ${requestedModel}. ${message}`,
      provider: 'azora',
      model: requestedModel,
      details: {
        codeChamberAI: message,
      },
    }
  }

  return {
    text: `No response text received for model ${requestedModel}.`,
    provider: 'azora',
    model: requestedModel,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as StreamRequest

    // For ad-hoc chat requests, avoid orchestrator filesystem persistence and
    // route directly to model backends.
    if (!body.workflowId && Array.isArray(body.messages) && body.messages.length > 0) {
      const resolved = await resolveAdHocChatText(req, body)

      return createDoneStream({
        provider: resolved.provider,
        model: resolved.model,
        text: resolved.text,
        details: resolved.details,
        nodeResults: {
          assistant: resolved.text,
        },
      })
    }

    const orchestrator = getOrchestrator()

    // if no workflowId supplied, build a simple on-the-fly workflow
    let workflowId = body.workflowId
    if (!workflowId) {
      // create a temporary unique id and store workflow in orchestrator
      workflowId = `temp-${Date.now()}`
      const wf = {
        id: workflowId,
        name: 'ad-hoc-chat',
        description: 'Temporary chat workflow',
        nodes: [
          { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'agent1', type: 'agent', position: { x: 100, y: 0 }, data: { agentType: 'elara', systemPrompt: `${body.model || 'elara-pro'} chat conversation`, temperature: 0.7 } },
          { id: 'output', type: 'output', position: { x: 200, y: 0 }, data: {} },
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'agent1' },
          { id: 'e2', source: 'agent1', target: 'output' },
        ],
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      // register the ad-hoc workflow so executeWorkflow can find it
      await orchestrator.saveWorkflow(wf as any)
      body.triggerData = { messages: body.messages }
    }

    // if executionId present, ensure we have a record with project metadata
    // (best-effort — skip if database is unavailable)
    if (body.executionId) {
      try {
        await upsertExecutionRecord(body.executionId, {
          id: body.executionId,
          projectId: body.projectId || 'default',
          status: 'running',
        })
      } catch (dbErr) {
        console.warn('[Agent Stream] DB unavailable, skipping execution record:', (dbErr as any)?.message)
      }
    }
    // create a readable stream that will emit SSE events
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // if we loaded a previous record, replay its trace steps first
        if (body.executionId) {
          loadExecutionState(body.executionId).then((rec) => {
            if (rec && Array.isArray(rec.trace)) {
              for (const step of rec.trace) {
                const data = JSON.stringify(step)
                controller.enqueue(encoder.encode(`event: step\ndata: ${data}\n\n`))
              }
            }
          }).catch(() => {})
        }
        // register onStep callback
        orchestrator.onStep((step: TraceStep) => {
          const data = JSON.stringify(step)
          controller.enqueue(encoder.encode(`event: step\ndata: ${data}\n\n`))
        })

        orchestrator.executeWorkflow(workflowId!, body.triggerData, undefined, body.executionId).then((result) => {
          controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(result)}\n\n`))
          controller.close()
        }).catch((err) => {
          controller.enqueue(encoder.encode(`event: error\ndata: ${err.message}\n\n`))
          controller.close()
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      }
    })
  } catch (error) {
    console.error('[Agent Stream] error', error)
    return new Response('Failed to start stream', { status: 500 })
  }
}

/**
 * Code Chamber AI Assistant API
 * 
 * Streaming AI endpoint for the Code Chamber editor.
 * Handles: code analysis, generation, explanation, refactoring, debugging.
 * 
 * Uses: Vercel AI SDK with OpenAI (GPT-4o)
 */

import { NextRequest } from 'next/server'
import { openai } from '@ai-sdk/openai'
import { streamText, generateText } from 'ai'

const DEFAULT_CITADELSM_ENDPOINT = 'https://localhost:8000/citadelsm' as const
const DEFAULT_CITADELSG_ENDPOINT = 'https://localhost:8001/citadelsg' as const
const HAS_ENV_CITADELSM_ENDPOINT = Boolean(process.env.CITADELSM_ENDPOINT?.trim())
const HAS_ENV_CITADELSG_ENDPOINT = Boolean(process.env.CITADELSG_ENDPOINT?.trim())

const TRUSTED_CITADELSM_ENDPOINTS = [
  DEFAULT_CITADELSM_ENDPOINT,
  'https://127.0.0.1:8000/citadelsm',
  'https://citadelsm:8000/citadelsm',
] as const

const TRUSTED_CITADELSG_ENDPOINTS = [
  DEFAULT_CITADELSG_ENDPOINT,
  'https://127.0.0.1:8001/citadelsg',
  'https://citadelsg:8001/citadelsg',
] as const

type TrustedCitadelsMEndpoint = (typeof TRUSTED_CITADELSM_ENDPOINTS)[number]
type TrustedCitadelsGEndpoint = (typeof TRUSTED_CITADELSG_ENDPOINTS)[number]

function sanitizeLogValue(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, 400)
}

function toSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeLogValue(error.message)
  }

  return sanitizeLogValue(String(error))
}

function normalizeEndpointLiteral(endpointValue: string): string {
  return endpointValue.trim().replace(/\/+$/, '').toLowerCase()
}

function resolveTrustedCitadelsEndpoint<T extends readonly string[]>(
  rawValue: string | undefined,
  fallback: T[number],
  trustedEndpoints: T
): T[number] | null {
  const endpointValue = rawValue || fallback
  const normalizedCandidate = normalizeEndpointLiteral(endpointValue)

  if (!normalizedCandidate) {
    console.error('[Code Chamber AI] Citadels endpoint rejected')
    return null
  }

  const trustedEndpoint = trustedEndpoints.find((allowedEndpoint) => {
    const normalizedAllowed = normalizeEndpointLiteral(allowedEndpoint)
    return normalizedAllowed === normalizedCandidate
  })

  if (!trustedEndpoint) {
    console.error('[Code Chamber AI] Citadels endpoint rejected')
    return null
  }

  return trustedEndpoint
}

const CITADELSM_ENDPOINT = resolveTrustedCitadelsEndpoint(
  process.env.CITADELSM_ENDPOINT,
  DEFAULT_CITADELSM_ENDPOINT,
  TRUSTED_CITADELSM_ENDPOINTS
)

async function fetchCitadelsM(init: RequestInit): Promise<Response> {
  switch (CITADELSM_ENDPOINT) {
    case 'https://localhost:8000/citadelsm':
      return fetch('https://localhost:8000/citadelsm', init)
    case 'https://127.0.0.1:8000/citadelsm':
      return fetch('https://127.0.0.1:8000/citadelsm', init)
    case 'https://citadelsm:8000/citadelsm':
      return fetch('https://citadelsm:8000/citadelsm', init)
    default:
      throw new Error('CITADELSM endpoint is not configured safely')
  }
}

function createCompatStreamResponse(text: string) {
  const encoder = new TextEncoder()
  const chunkSize = 256
  let offset = 0

  const stream = new ReadableStream({
    pull(controller) {
      if (offset >= text.length) {
        controller.close()
        return
      }

      const chunk = text.slice(offset, offset + chunkSize)
      offset += chunkSize
      controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`))
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}

async function callCitadelsM(prompt: string, maxNewTokens = 512) {
  const response = await fetchCitadelsM({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    redirect: 'error',
    body: JSON.stringify({
      prompt: `${SYSTEM_PROMPT}\n\nUser:\n${prompt}`,
      max_new_tokens: maxNewTokens,
    }),
  })

  if (!response.ok) {
    throw new Error(`Citadels M request failed: ${response.status}`)
  }

  const data = await response.json()
  return String(data?.response ?? '')
}

// Citadels G endpoint (Gemma-powered, for high-complexity tasks)
const CITADELSG_ENDPOINT = resolveTrustedCitadelsEndpoint(
  process.env.CITADELSG_ENDPOINT,
  DEFAULT_CITADELSG_ENDPOINT,
  TRUSTED_CITADELSG_ENDPOINTS
)

async function fetchCitadelsG(init: RequestInit): Promise<Response> {
  switch (CITADELSG_ENDPOINT) {
    case 'https://localhost:8001/citadelsg':
      return fetch('https://localhost:8001/citadelsg', init)
    case 'https://127.0.0.1:8001/citadelsg':
      return fetch('https://127.0.0.1:8001/citadelsg', init)
    case 'https://citadelsg:8001/citadelsg':
      return fetch('https://citadelsg:8001/citadelsg', init)
    default:
      throw new Error('CITADELSG endpoint is not configured safely')
  }
}

async function callCitadelsG(prompt: string, maxNewTokens = 1024) {
  const response = await fetchCitadelsG({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    redirect: 'error',
    body: JSON.stringify({
      prompt: `${SYSTEM_PROMPT}\n\nUser:\n${prompt}`,
      max_new_tokens: maxNewTokens,
    }),
  })

  if (!response.ok) {
    throw new Error(`Citadels G request failed: ${response.status}`)
  }

  const data = await response.json()
  return String(data?.response ?? '')
}

const SYSTEM_PROMPT = `You are Elara Code, the AI coding assistant embedded in Azora BuildSpaces Code Chamber.
You are an expert programmer who helps developers write, understand, and improve code.

Your capabilities:
- **Analyze**: Find bugs, security issues, performance problems, and style violations
- **Generate**: Write new code from natural language descriptions
- **Explain**: Break down complex code into clear explanations
- **Refactor**: Suggest cleaner, more maintainable implementations
- **Debug**: Identify and fix errors with clear explanations
- **Document**: Generate JSDoc, docstrings, and inline comments
- **Test**: Generate unit tests for given code

Guidelines:
- Always provide complete, working code — never leave TODO placeholders
- Use modern best practices for the detected language
- Consider edge cases, error handling, and type safety
- Be concise but thorough — explain the "why" not just the "what"
- When showing code, use proper markdown code blocks with language tags
- If the code has issues, prioritize by severity: security > bugs > performance > style
- Respect the user's coding style when making suggestions`

type ActionType = 'analyze' | 'generate' | 'explain' | 'refactor' | 'debug' | 'document' | 'test' | 'chat'

const ACTION_PROMPTS: Record<ActionType, string> = {
  analyze: `Analyze the following code for bugs, security issues, performance problems, and improvements.
Format your response as:
## 🔴 Critical Issues
(list any security or crash bugs)
## 🟡 Warnings  
(list performance issues, potential bugs)
## 🟢 Suggestions
(list style improvements, best practices)
## 📊 Code Quality Score: X/10`,

  generate: `Generate code based on the user's request. Provide:
1. The complete implementation
2. A brief explanation of the approach
3. Any assumptions made`,

  explain: `Explain the following code clearly. Include:
1. **Purpose**: What does this code do?
2. **How it works**: Step-by-step walkthrough
3. **Key concepts**: Important patterns or techniques used
4. **Complexity**: Time and space complexity if relevant`,

  refactor: `Refactor the following code to be cleaner, more maintainable, and more idiomatic.
Show the refactored code and explain each change you made and why.`,

  debug: `Debug the following code. Identify:
1. **The bug**: What's wrong and why
2. **Root cause**: Why the bug occurs
3. **Fix**: The corrected code
4. **Prevention**: How to avoid similar bugs`,

  document: `Add comprehensive documentation to the following code:
- JSDoc/docstring for all functions and classes
- Parameter descriptions with types
- Return value descriptions
- @example tags with usage examples
- Inline comments for complex logic`,

  test: `Generate unit tests for the following code using the testing framework appropriate for the language.
Include:
- Happy path tests
- Edge cases
- Error cases
- Prefer real integrations; where isolation is required, use deterministic test doubles only for strict test boundaries`,

  chat: '',  // Free-form chat, no extra prompt
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      action = 'chat',
      prompt,
      code,
      language,
      fileName,
      context,
      stream = true,
    } = body as {
      action?: ActionType
      prompt?: string
      code?: string
      language?: string
      fileName?: string
      context?: string
      stream?: boolean
    }

    if (!prompt && !code) {
      return Response.json(
        { error: 'Either prompt or code is required' },
        { status: 400 }
      )
    }

    // Build the user message
    let userMessage = ''

    if (ACTION_PROMPTS[action]) {
      userMessage += ACTION_PROMPTS[action] + '\n\n'
    }

    if (prompt) {
      userMessage += prompt + '\n\n'
    }

    if (code) {
      userMessage += `\`\`\`${language || ''}\n${code}\n\`\`\`\n\n`
    }

    if (fileName) {
      userMessage += `File: ${fileName}\n`
    }

    if (context) {
      userMessage += `Additional context:\n${context}\n`
    }

    const useCitadels = (process.env.CODE_CHAMBER_PROVIDER === 'citadelsm' || HAS_ENV_CITADELSM_ENDPOINT) && Boolean(CITADELSM_ENDPOINT)

    // High complexity actions use Citadels G (Gemma) if available
    const highComplexityActions: ActionType[] = ['analyze', 'refactor', 'debug']
    const useCitadelsG = HAS_ENV_CITADELSG_ENDPOINT && highComplexityActions.includes(action) && Boolean(CITADELSG_ENDPOINT)

    if (useCitadels || useCitadelsG) {
      try {
        const text = useCitadelsG
          ? await callCitadelsG(userMessage, 1024)
          : await callCitadelsM(userMessage)

        if (stream) {
          return createCompatStreamResponse(text)
        }

        return Response.json({ text })
      } catch (citadelsError) {
        // If Citadels M/G fails, fall through to OpenAI fallback
        console.warn('[Code Chamber AI] Citadels backend unavailable, falling back to OpenAI:', toSafeErrorMessage(citadelsError))
      }
    }

    const model = openai('gpt-4o')

    if (stream) {
      const result = streamText({
        model,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        maxOutputTokens: 4096,
        temperature: 0.3,
      })

      return result.toTextStreamResponse()
    } else {
      const result = await generateText({
        model,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        maxOutputTokens: 4096,
        temperature: 0.3,
      })

      return Response.json({
        text: result.text,
        usage: result.usage,
      })
    }
  } catch (error: any) {
    const safeErrorMessage = toSafeErrorMessage(error)
    console.error('[Code Chamber AI] Error:', safeErrorMessage)
    return Response.json(
      { error: safeErrorMessage || 'AI request failed' },
      { status: 500 }
    )
  }
}

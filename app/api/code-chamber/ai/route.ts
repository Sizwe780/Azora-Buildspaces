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
- Mock any external dependencies`,

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
    console.error('[Code Chamber AI] Error:', error)
    return Response.json(
      { error: error.message || 'AI request failed' },
      { status: 500 }
    )
  }
}

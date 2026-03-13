import { NextRequest, NextResponse } from 'next/server'

/**
 * Agent API Route
 * Simple AI agent endpoint for the useBrain hook
 */

interface AgentRequest {
  message: string
  context?: Record<string, unknown>
}

// Simple AI response generation based on message patterns
function generateAgentResponse(message: string, context: Record<string, unknown> = {}): string {
  const lowerMessage = message.toLowerCase()
  
  // Code-related queries
  if (lowerMessage.includes('error') || lowerMessage.includes('bug')) {
    return `I see you're dealing with an issue. Based on the context provided, here are some debugging steps:
1. Check the console for error messages
2. Verify all dependencies are properly imported
3. Ensure variable types match expected values
4. Review recent changes that might have introduced the issue`
  }
  
  if (lowerMessage.includes('explain') || lowerMessage.includes('what does')) {
    return `Let me explain that concept for you. Code should be written with clarity and maintainability in mind. Consider breaking down complex logic into smaller, reusable functions with descriptive names.`
  }
  
  if (lowerMessage.includes('optimize') || lowerMessage.includes('performance')) {
    return `For optimization, consider these approaches:
1. Memoize expensive computations with useMemo/useCallback
2. Lazy load components that aren't immediately needed
3. Minimize re-renders by lifting state appropriately
4. Use virtualization for long lists`
  }
  
  if (lowerMessage.includes('test') || lowerMessage.includes('testing')) {
    return `For testing best practices:
1. Write unit tests for individual functions
2. Use integration tests for component interactions
3. Aim for high coverage of critical paths
4. Mock external dependencies appropriately`
  }
  
  if (lowerMessage.includes('refactor')) {
    return `Refactoring suggestions:
1. Extract repeated logic into utility functions
2. Apply the DRY principle
3. Use meaningful variable and function names
4. Consider design patterns appropriate for your use case`
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('how to')) {
    return `I'm here to assist! You can ask me about:
- Debugging code issues
- Explaining concepts
- Optimizing performance
- Writing tests
- Refactoring code
- Best practices and patterns`
  }
  
  // Default helpful response
  return `I understand you're asking about "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}". 

I can help you with code analysis, debugging suggestions, and best practices. Could you provide more specific details about what you're working on?`
}

export async function POST(request: NextRequest) {
  try {
    const body: AgentRequest = await request.json()
    const { message, context = {} } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Generate contextual response
    const response = generateAgentResponse(message, context)

    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Agent API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process agent request' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    status: 'Agent service is running',
    capabilities: [
      'code-explanation',
      'debugging-assistance',
      'optimization-suggestions',
      'testing-guidance',
      'refactoring-help'
    ]
  })
}

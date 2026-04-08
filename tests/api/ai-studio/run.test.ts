/** @jest-environment node */

import { POST } from '@/app/api/ai-studio/run/route'
import { getServerSession } from 'next-auth'
import { MiningEngine } from '@/lib/economy/mining-engine'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/auth/config', () => ({ authOptions: {} }))
jest.mock('@/lib/economy/mining-engine')
jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({ text: 'AI response' }),
}))
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(),
}))
jest.mock('@/lib/agents/tools', () => ({
  executeTool: jest.fn().mockResolvedValue('tool result'),
  getTool: jest.fn(),
}))

describe('AI Studio Run API (/api/ai-studio/run)', () => {
  const mockSession = {
    user: { id: 'test-user-id', email: 'test@example.com' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  function makePostRequest(body: any) {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as any
  }

  it('should return 401 if unauthorized', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const req = makePostRequest({ workflowName: 'Test', nodes: [] })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should return 400 if nodes are invalid', async () => {
    const req = makePostRequest({ workflowName: 'Test' }) // Missing nodes
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return a 200 Response for valid workflow', async () => {
    const req = makePostRequest({
      workflowName: 'Test Workflow',
      nodes: [
        { id: '1', type: 'input', config: { prompt: 'hello' } }
      ]
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('should award tokens on successful workflow completion', async () => {
    const mockAwardByType = jest.fn().mockResolvedValue({ success: true })
    ;(MiningEngine as jest.Mock).mockImplementation(() => ({
      awardByType: mockAwardByType
    }))

    const req = makePostRequest({
      workflowName: 'Token Workflow',
      nodes: [
        { id: '1', type: 'input', config: { prompt: 'start' } },
        { id: '2', type: 'llm', config: { model: 'gpt-4o' } }
      ]
    })
    
    const res = await POST(req)
    const reader = res.body.getReader()
    
    let done = false
    while (!done) {
      const result = await reader.read()
      done = result.done
    }

    expect(mockAwardByType).toHaveBeenCalledWith(
      'test-user-id',
      'FEATURE_COMPLETE',
      expect.stringContaining('AI Studio: Successfully completed multi-node workflow "Token Workflow"')
    )
  })
})

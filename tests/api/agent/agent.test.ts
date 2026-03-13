/**
 * Tests for /api/agent route
 * Tests the simple AI brain endpoint used by useBrain hook
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/agent/route'

describe('/api/agent', () => {
  describe('POST', () => {
    it('returns a response for a valid message', async () => {
      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'help me with testing' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.response).toBeDefined()
      expect(typeof data.response).toBe('string')
      expect(data.timestamp).toBeDefined()
    })

    it('returns error-related response for error messages', async () => {
      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'I have an error in my code' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.response).toContain('debugging')
    })

    it('returns optimization response for performance queries', async () => {
      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'how to optimize performance' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.response).toContain('Memoize')
    })

    it('rejects requests without message', async () => {
      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Message is required')
    })

    it('accepts context along with message', async () => {
      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'explain this code',
          context: { file: 'test.ts', line: 42 }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET', () => {
    it('returns agent status and capabilities', async () => {
      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'GET'
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.status).toBe('Agent service is running')
      expect(Array.isArray(data.capabilities)).toBe(true)
      expect(data.capabilities).toContain('code-explanation')
    })
  })
})

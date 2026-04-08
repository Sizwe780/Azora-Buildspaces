import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/qa-testing/route'
import { getServerSession } from 'next-auth'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('/api/qa-testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com', name: 'Test User' },
    })
  })

  describe('GET scenarios', () => {
    it('returns supported frameworks', async () => {
      const req = new NextRequest('http://localhost:3000/api/qa-testing?action=frameworks')
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.frameworks).toBeDefined()
      expect(Array.isArray(data.frameworks)).toBe(true)
    })

    it('returns default config for a framework', async () => {
      const req = new NextRequest('http://localhost:3000/api/qa-testing?action=config&framework=jest')
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.config).toBeDefined()
      expect(data.config.testDir).toBe('__tests__')
    })

    it('returns 401 if unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null)
      const req = new NextRequest('http://localhost:3000/api/qa-testing?action=frameworks')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })
  })

  describe('POST scenarios', () => {
    it('starts a test run', async () => {
      const req = new NextRequest('http://localhost:3000/api/qa-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run',
          config: {
            framework: 'jest',
            testDir: 'tests/api',
            pattern: 'health.test.ts',
          }
        })
      })

      const res = await POST(req)
      const data = await res.json()

      if (res.status !== 200) {
        console.error('POST /api/qa-testing failed:', data)
      }

      expect(res.status).toBe(200)
      expect(data.run).toBeDefined()
      expect(data.run.id).toBeDefined()
      expect(data.run.status).toBeDefined()
    })

    it('handles invalid actions', async () => {
      const req = new NextRequest('http://localhost:3000/api/qa-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalid' })
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })
  })
})

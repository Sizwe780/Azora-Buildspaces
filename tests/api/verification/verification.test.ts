/**
 * Tests for /api/verification route
 * Tests identity/document verification submission
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/verification/route'

describe('/api/verification', () => {
  describe('GET', () => {
    it('returns available verification types', async () => {
      const request = new NextRequest('http://localhost:3000/api/verification', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.types).toBeDefined()
      expect(Array.isArray(data.data.types)).toBe(true)
      expect(data.data.types.length).toBeGreaterThan(0)
      
      // Check that expected types exist
      const typeIds = data.data.types.map((t: any) => t.id)
      expect(typeIds).toContain('identity')
      expect(typeIds).toContain('business')
      expect(typeIds).toContain('developer')
    })
  })

  describe('POST', () => {
    it('creates a verification submission with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-123',
          verificationType: 'identity',
          documents: [
            { name: 'id-front.jpg', size: 102400, type: 'image/jpeg' },
            { name: 'id-back.jpg', size: 98304, type: 'image/jpeg' }
          ]
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.submissionId).toBeDefined()
      expect(data.data.submissionId).toMatch(/^VER-/)
      expect(data.data.status).toBe('pending')
      expect(data.data.estimatedReviewTime).toBeDefined()
      expect(data.data.nextSteps).toBeDefined()
    })

    it('rejects submission without userId', async () => {
      const request = new NextRequest('http://localhost:3000/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationType: 'identity',
          documents: [{ name: 'doc.pdf', size: 1024, type: 'application/pdf' }]
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('User ID is required')
    })

    it('rejects submission with invalid verification type', async () => {
      const request = new NextRequest('http://localhost:3000/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user',
          verificationType: 'invalid-type',
          documents: [{ name: 'doc.pdf', size: 1024, type: 'application/pdf' }]
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid verification type')
    })

    it('rejects submission without documents', async () => {
      const request = new NextRequest('http://localhost:3000/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user',
          verificationType: 'developer',
          documents: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('At least one document is required')
    })

    it('creates different submission types', async () => {
      // Test developer verification
      const request = new NextRequest('http://localhost:3000/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'dev-user-new',
          verificationType: 'developer',
          documents: [{ name: 'portfolio.pdf', size: 512000, type: 'application/pdf' }]
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.estimatedReviewTime).toBe('24 hours')
    })
  })

  describe('GET with filters', () => {
    it('retrieves submissions by userId', async () => {
      // First create a submission
      const postRequest = new NextRequest('http://localhost:3000/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'filter-test-user',
          verificationType: 'business',
          documents: [{ name: 'business.pdf', size: 204800, type: 'application/pdf' }]
        })
      })
      await POST(postRequest)

      // Then retrieve by user
      const getRequest = new NextRequest('http://localhost:3000/api/verification?userId=filter-test-user', {
        method: 'GET'
      })

      const response = await GET(getRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })
  })
})

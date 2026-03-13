/** @jest-environment node */

/**
 * Tests for /api/fs/write route
 * Tests file write operations through dedicated write endpoint
 */

import { NextRequest } from 'next/server'
import * as fs from 'fs/promises'
import * as path from 'path'
import { POST } from '@/app/api/fs/write/route'

// Mock fs/promises
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({
    size: 1024,
    mtime: new Date('2024-01-01T00:00:00Z')
  }),
}))

describe('/api/fs/write', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('writes file content successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'src/test-file.ts',
          content: 'const hello = "world";'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('File saved successfully')
      expect(fs.writeFile).toHaveBeenCalled()
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      )
    })

    it('rejects requests without path', async () => {
      const request = new NextRequest('http://localhost:3000/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'some content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('File path is required')
    })

    it('rejects requests without content', async () => {
      const request = new NextRequest('http://localhost:3000/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'test.ts'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Content is required')
    })

    it('allows empty string content', async () => {
      const request = new NextRequest('http://localhost:3000/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'empty.ts',
          content: ''
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns file stats after write', async () => {
      const request = new NextRequest('http://localhost:3000/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'stats-test.ts',
          content: 'export const value = 42;'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.size).toBe(1024)
      expect(data.modified).toBeDefined()
    })

    it('handles write errors gracefully', async () => {
      ;(fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('EACCES: permission denied'))

      const request = new NextRequest('http://localhost:3000/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'protected-file.ts',
          content: 'test'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Permission denied')
    })

    it('handles disk full errors', async () => {
      ;(fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('ENOSPC: no space left'))

      const request = new NextRequest('http://localhost:3000/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'large-file.ts',
          content: 'a'.repeat(10000)
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(507)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Disk space full')
    })
  })
})

/** @jest-environment node */

import { POST, GET, PUT, DELETE } from '@/app/api/specs/route'
import { getServerSession } from 'next-auth'
import { MiningEngine } from '@/lib/economy/mining-engine'
import fs from 'fs/promises'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/auth/config', () => ({ authOptions: {} }))
jest.mock('@/lib/economy/mining-engine')
jest.mock('fs/promises')

describe('Specs API (/api/specs)', () => {
  const mockSession = {
    user: { id: 'spec-user-id', name: 'Spec Author', email: 'spec@example.com' }
  }
  const mockAwardByType = jest.fn().mockResolvedValue({ success: true })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    ;(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([]))
    ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)
    
    ;(MiningEngine as jest.Mock).mockImplementation(() => ({
      awardByType: mockAwardByType
    }))
  })

  it('GET /api/specs should list all specs', async () => {
    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(data.specs)).toBe(true)
  })

  it('POST /api/specs should create and award tokens', async () => {
    const req = {
      json: jest.fn().mockResolvedValue({ 
        title: 'New Spec',
        content: 'Technical details'
      }),
    } as any

    const res = await POST(req)
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.spec.title).toBe('New Spec')
    expect(data.spec.author).toBe('Spec Author')

    // Reward for documenting (Proof-of-Knowledge)
    expect(mockAwardByType).toHaveBeenCalledWith(
      'spec-user-id',
      'DOCUMENTATION',
      expect.stringContaining('Drafted technical specification: New Spec')
    )
  })

  it('PUT /api/specs should update and award tokens for approval', async () => {
    const existingSpec = { id: 'spec-1', title: 'Old Spec', status: 'Draft' }
    ;(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([existingSpec]))

    const req = {
      json: jest.fn().mockResolvedValue({ 
        id: 'spec-1',
        status: 'Approved' 
      }),
    } as any

    const res = await PUT(req)
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.spec.status).toBe('Approved')

    // Reward for ratification (KNOWLEDGE_SHARE)
    expect(mockAwardByType).toHaveBeenCalledWith(
      'spec-user-id',
      'KNOWLEDGE_SHARE',
      expect.stringContaining('Ratified technical specification')
    )
  })

  it('DELETE /api/specs should remove spec', async () => {
    const existingSpec = { id: 'spec-del', title: 'Del Spec' }
    ;(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([existingSpec]))

    const req = {
      json: jest.fn().mockResolvedValue({ id: 'spec-del' }),
    } as any

    const res = await DELETE(req)
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.deleted).toBe('spec-del')
  })
})

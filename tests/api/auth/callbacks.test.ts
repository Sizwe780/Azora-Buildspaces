/** @jest-environment node */

import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'

jest.mock('@/lib/database/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue({}),
    },
  },
  PRISMA_AVAILABLE: true,
}))

describe('NextAuth callbacks', () => {
  test('jwt callback persists user id to token', async () => {
    const token = { foo: 'bar' }
    const user = { id: 'user-123' }
    // @ts-ignore
    const result = await authOptions.callbacks?.jwt({ token, user })
    expect(result.id).toBe('user-123')
  })

  test('session callback copies token id to session.user.id', async () => {
    const session = { user: { name: 'Test' } }
    const token = { id: 'user-456' }
    // @ts-ignore
    const result = await authOptions.callbacks?.session({ session, token })
    expect((result.user as any).id).toBe('user-456')
  })
})

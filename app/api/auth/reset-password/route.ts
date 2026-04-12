import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'
import bcrypt from 'bcryptjs'

/**
 * POST /api/auth/reset-password
 *
 * Completes password reset with a valid reset token.
 * Validates token, hashes new password, updates user, and deletes token (single-use).
 *
 * Constitutional Alignment:
 * - Security: Token-based verification, bcrypt password hashing, single-use enforcement
 * - User Sovereignty: Users regain account access
 */
export async function POST(request: NextRequest) {
  if (process.env.AUTH_PASSWORD_RESET_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Password reset is not enabled' }, { status: 503 })
  }

  const { token, newPassword } = await request.json()
  if (!token || !newPassword) {
    return NextResponse.json({ error: 'Token and new password required' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Find valid, non-expired token
  const tokenRecord = await prisma.token.findFirst({
    where: { token, type: 'RESET_PASSWORD', expiresAt: { gt: new Date() } }
  })

  if (!tokenRecord) {
    return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
  }

  // Hash new password and update user
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: tokenRecord.userId },
    data: { password: hashedPassword }
  })

  // Delete token — single-use enforcement
  await prisma.token.delete({ where: { id: tokenRecord.id } })

  return NextResponse.json({ message: 'Password reset successfully' })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'

/**
 * GET /api/auth/verify-email?token=xxx
 *
 * Verifies a user's email address using a single-use token.
 * Token must be of type ACCESS and not expired (24-hour window).
 *
 * Requirements: 2.2 Email Verification
 */
export async function GET(request: NextRequest) {
  if (process.env.AUTH_EMAIL_VERIFICATION_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Email verification is not configured in this environment' },
      { status: 503 }
    )
  }

  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  try {
    const tokenRecord = await prisma.token.findFirst({
      where: { token, type: 'ACCESS', expiresAt: { gt: new Date() } },
    })

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { emailVerified: new Date() },
    })

    // Delete token (single-use)
    await prisma.token.delete({ where: { id: tokenRecord.id } })

    return NextResponse.json({ message: 'Email verified successfully' })
  } catch (error) {
    console.error('[AUTH] Email verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred during email verification' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import crypto from 'crypto'

/**
 * POST /api/auth/resend-verification
 *
 * Resends the email verification link for the authenticated user.
 * Requires AUTH_EMAIL_VERIFICATION_ENABLED=true.
 * Generates a new single-use token with a 24-hour expiry.
 *
 * Requirements: 2.2 Email Verification
 */
export async function POST(request: NextRequest) {
  if (process.env.AUTH_EMAIL_VERIFICATION_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Email verification is not enabled' },
      { status: 503 }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  }

  const userId = (session.user as any).id
  if (!userId) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: 'Email already verified' })
    }

    // Delete any existing verification tokens for this user
    await prisma.token.deleteMany({ where: { userId, type: 'ACCESS' } })

    // Generate new token with 24-hour expiry
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 86_400_000) // 24 hours

    await prisma.token.create({
      data: { userId, type: 'ACCESS', token, expiresAt },
    })

    // Send email via Resend
    const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`

    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'BuildSpaces <noreply@buildspaces.dev>',
          to: user.email,
          subject: 'Verify your BuildSpaces email',
          html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email address. This link expires in 24 hours.</p>`,
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        console.error('[AUTH] Resend API error:', res.status, body)
        return NextResponse.json(
          { error: 'Failed to send verification email' },
          { status: 502 }
        )
      }
    } else {
      // Development fallback — log token to console
      console.log(`[Email Verification] Token for ${user.email}: ${token}`)
      console.log(`[Email Verification] Verify URL: ${verifyUrl}`)
    }

    return NextResponse.json({ message: 'Verification email sent' })
  } catch (error) {
    console.error('[AUTH] Resend verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred while resending verification email' },
      { status: 500 }
    )
  }
}

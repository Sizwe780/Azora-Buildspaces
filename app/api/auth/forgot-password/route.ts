import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'
import crypto from 'crypto'

/**
 * POST /api/auth/forgot-password
 *
 * Initiates password reset flow.
 *
 * Constitutional Alignment:
 * - User Sovereignty: Users can recover their accounts
 * - Security: Rate limited, cryptographically secure token-based verification
 * - Privacy: Does not reveal whether an email exists (prevents enumeration)
 */
export async function POST(request: NextRequest) {
  if (process.env.AUTH_PASSWORD_RESET_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Password reset is not enabled' }, { status: 503 })
  }

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const normalizedEmail = email.toLowerCase().trim()

  // Rate limiting: max 3 requests per email per hour
  const oneHourAgo = new Date(Date.now() - 3600_000)
  const recentTokens = await prisma.token.count({
    where: {
      type: 'RESET_PASSWORD',
      createdAt: { gte: oneHourAgo },
      user: { email: normalizedEmail }
    }
  })
  if (recentTokens >= 3) {
    // Return generic message to prevent enumeration
    return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' })
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  // Always return 200 to prevent email enumeration
  if (!user) return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' })

  // Generate cryptographically secure token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 3600_000) // 1 hour

  await prisma.token.create({
    data: { userId: user.id, type: 'RESET_PASSWORD', token, expiresAt }
  })

  // Send email via Resend if configured
  if (process.env.RESEND_API_KEY) {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'BuildSpaces <noreply@buildspaces.dev>',
        to: normalizedEmail,
        subject: 'Reset your BuildSpaces password',
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`
      })
    })
  } else {
    console.log(`[Password Reset] Token for ${normalizedEmail}: ${token}`)
  }

  return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' })
}

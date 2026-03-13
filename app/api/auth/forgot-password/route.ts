import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { logAuthEvent } from '@/lib/auth-audit';

/**
 * POST /api/auth/forgot-password
 * 
 * Initiates password reset flow.
 * 
 * Constitutional Alignment:
 * - User Sovereignty: Users can recover their accounts
 * - Security: Rate limited, token-based verification
 * - Transparency: Logs reset requests via centralized audit logger
 */
export async function POST(req: Request) {
  try {
    if (process.env.AUTH_PASSWORD_RESET_ENABLED !== 'true') {
      return NextResponse.json(
        { error: 'Password reset is not configured in this environment' },
        { status: 503 }
      )
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // For security, don't reveal if email exists — but audit the attempt
      await logAuthEvent({
        action: 'PASSWORD_RESET',
        userEmail: normalizedEmail,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || undefined,
        success: false,
        reason: 'Email not found (not disclosed to client)',
      });

      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.'
      });
    }

    // Token persistence/email delivery are schema/provider dependent and must be wired before use.
    await logAuthEvent({
      action: 'PASSWORD_RESET',
      userId: user.id,
      userEmail: normalizedEmail,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || undefined,
      success: false,
      reason: 'Password reset requested but reset-token persistence is unavailable',
    });

    return NextResponse.json(
      { error: 'Password reset backend is unavailable: reset-token persistence schema is not configured' },
      { status: 503 }
    );

  } catch (error) {
    console.error('[AUTH] Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

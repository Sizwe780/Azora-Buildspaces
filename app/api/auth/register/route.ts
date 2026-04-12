import { NextResponse } from "next/server";
import { prisma, PRISMA_AVAILABLE } from "@/lib/database/client";
import { hashPassword } from "@/lib/auth/utils";
import { logAuthEvent } from "@/lib/auth-audit";
import { z } from "zod";
import crypto from "crypto";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  country: z.string().optional()
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const validatedData = registerSchema.safeParse(body);
        
        if (!validatedData.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validatedData.error.errors },
                { status: 400 }
            );
        }

        const { name, email, password, country } = validatedData.data;

        // Development fallback when database is unavailable
        if (!PRISMA_AVAILABLE) {
            if (process.env.NODE_ENV !== 'production') {
                return NextResponse.json({
                    success: true,
                    user: { id: 'dev-admin', email },
                    message: "Database not configured. Please login using dev credentials (admin@azora.world / Azora2026!)"
                });
            } else {
                return NextResponse.json(
                    { error: "Database not configured. Registration disabled." },
                    { status: 503 }
                );
            }
        }


        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            await logAuthEvent({
                action: 'SIGNUP',
                userEmail: email,
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: req.headers.get('user-agent') || undefined,
                success: false,
                reason: 'User already exists',
            });

            return NextResponse.json(
                { error: "User already exists" },
                { status: 400 }
            );
        }

        // Hash password using the proper utility function
        const hashedPassword = hashPassword(password);

        // Create user with hashed password
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });

        await logAuthEvent({
            action: 'SIGNUP',
            userId: user.id,
            userEmail: email,
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || undefined,
            success: true,
            metadata: { country },
        });

        // Send verification email if feature is enabled
        if (process.env.AUTH_EMAIL_VERIFICATION_ENABLED === 'true') {
            try {
                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 86_400_000); // 24 hours

                await prisma.token.create({
                    data: { userId: user.id, type: 'ACCESS', token, expiresAt },
                });

                const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

                if (process.env.RESEND_API_KEY) {
                    await fetch('https://api.resend.com/emails', {
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
                    });
                } else {
                    console.log(`[Email Verification] Token for ${user.email}: ${token}`);
                    console.log(`[Email Verification] Verify URL: ${verifyUrl}`);
                }
            } catch (emailError) {
                // Non-fatal: user is created, email sending failed
                console.error('[AUTH] Failed to send verification email:', emailError);
            }
        }

        return NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
    } catch (error: any) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

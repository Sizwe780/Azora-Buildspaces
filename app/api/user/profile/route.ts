import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/database/client";

/**
 * GET /api/user/profile
 * 
 * Fetches the current user's profile data including subscription and verification status
 * from the database.
 */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    console.log('[API] Profile request for userId:', userId);

    // DEV AUTH MODE: Handle master user without DB access
    if (userId === 'master-user') {
      return NextResponse.json({
        id: 'master-user',
        name: 'Master Administrator',
        email: 'admin@azora.world',
        createdAt: new Date(),
        subscription: null,
        verificationStatus: {
          email: true,
          identity: null,
          student: null
        }
      });
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        image: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const verificationStatus = {
      email: !!user.emailVerified,
      identity: null,
      student: null,
    };

    return NextResponse.json({
      id: user.id,
      name: user.name || 'User',
      email: user.email || '',
      createdAt: user.createdAt,
      subscription: null,
      verificationStatus
    });

  } catch (error: any) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

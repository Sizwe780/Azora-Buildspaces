import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/database/client"

/**
 * Marketplace — Template Reviews API
 * GET/POST /api/marketplace/templates/[id]/reviews
 *
 * Handles reviews for marketplace templates.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
  }

  const reviews = await prisma.templateReview.findMany({
    where: { templateId: id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

  return NextResponse.json({
    reviews,
    count: reviews.length,
    averageRating: Math.round(avgRating * 10) / 10,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { rating, comment } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
    }
    if (!comment?.trim() || comment.length < 5) {
      return NextResponse.json({ error: 'Comment must be at least 5 characters' }, { status: 400 })
    }
    if (comment.length > 1000) {
      return NextResponse.json({ error: 'Comment must be under 1000 characters' }, { status: 400 })
    }

    const userId = (session.user as any).id as string

    // Upsert: update if user already reviewed, create otherwise
    const review = await prisma.templateReview.upsert({
      where: { templateId_userId: { templateId: id, userId } },
      update: { rating: Math.round(rating), comment: comment.trim() },
      create: {
        templateId: id,
        userId,
        rating: Math.round(rating),
        comment: comment.trim(),
      },
    })

    // Recalculate average rating
    const allReviews = await prisma.templateReview.findMany({ where: { templateId: id } })
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    await prisma.marketplaceTemplate.update({
      where: { id },
      data: { rating: avgRating },
    })

    return NextResponse.json({
      success: true,
      review,
      newAverageRating: Math.round(avgRating * 10) / 10,
      totalReviews: allReviews.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit review' }, { status: 500 })
  }
}

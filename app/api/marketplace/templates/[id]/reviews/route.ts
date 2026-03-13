import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"

/**
 * Marketplace — Template Reviews API
 * GET/POST /api/marketplace/templates/[id]/reviews
 * 
 * Handles reviews for marketplace templates.
 */

interface Review {
  id: string
  templateId: string
  author: string
  authorId: string
  rating: number
  comment: string
  helpful: number
  date: string
}

// In-memory reviews store (replace with DB in production)
const reviewsStore = new Map<string, Review[]>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
  }

  const reviews = reviewsStore.get(id) || []
  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0

  return NextResponse.json({
    reviews,
    count: reviews.length,
    averageRating: Math.round(avgRating * 10) / 10
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

    const userId = (session.user as any).id || 'unknown'
    
    // Check if user already reviewed this template
    const existingReviews = reviewsStore.get(id) || []
    const alreadyReviewed = existingReviews.some(r => r.authorId === userId)
    if (alreadyReviewed) {
      return NextResponse.json({ error: 'You have already reviewed this template' }, { status: 400 })
    }

    const review: Review = {
      id: `rev_${Date.now().toString(36)}`,
      templateId: id,
      author: session.user.name || session.user.email || 'Anonymous',
      authorId: userId,
      rating: Math.round(rating),
      comment: comment.trim(),
      helpful: 0,
      date: new Date().toISOString().split('T')[0]
    }

    existingReviews.push(review)
    reviewsStore.set(id, existingReviews)

    const avgRating = existingReviews.reduce((sum, r) => sum + r.rating, 0) / existingReviews.length

    return NextResponse.json({
      success: true,
      review,
      newAverageRating: Math.round(avgRating * 10) / 10,
      totalReviews: existingReviews.length
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit review' }, { status: 500 })
  }
}

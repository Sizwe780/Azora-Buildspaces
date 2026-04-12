import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'

/**
 * Verification API Route
 * Handles identity/document verification submissions
 */

// Supported verification types
const VERIFICATION_TYPES = {
  identity: {
    name: 'Identity Verification',
    requiredDocs: ['government_id', 'selfie'],
    estimatedTime: '1-2 business days'
  },
  business: {
    name: 'Business Verification',
    requiredDocs: ['business_registration', 'proof_of_address'],
    estimatedTime: '3-5 business days'
  },
  developer: {
    name: 'Developer Verification',
    requiredDocs: ['portfolio', 'code_samples'],
    estimatedTime: '24 hours'
  },
  organization: {
    name: 'Organization Verification',
    requiredDocs: ['registration_certificate', 'authorized_representative'],
    estimatedTime: '5-7 business days'
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const { verificationType, documents } = body

    // Validation
    if (!verificationType || !VERIFICATION_TYPES[verificationType as keyof typeof VERIFICATION_TYPES]) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification type' },
        { status: 400 }
      )
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one document is required' },
        { status: 400 }
      )
    }

    // Check for existing pending submission
    const existing = await prisma.verificationSubmission.findFirst({
      where: {
        userId,
        type: verificationType,
        status: { in: ['pending', 'reviewing'] }
      }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending verification of this type' },
        { status: 409 }
      )
    }

    const verificationConfig = VERIFICATION_TYPES[verificationType as keyof typeof VERIFICATION_TYPES]

    const submission = await prisma.verificationSubmission.create({
      data: {
        userId,
        type: verificationType,
        status: 'pending',
        data: body
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        submissionId: submission.id,
        status: 'pending',
        message: 'Verification submission received',
        estimatedReviewTime: verificationConfig.estimatedTime,
        nextSteps: [
          'Your documents are being reviewed',
          'You will receive an email notification when the review is complete',
          'Additional documents may be requested if needed'
        ]
      }
    })
  } catch (error) {
    console.error('Verification submission error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit verification' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get('submissionId')

    // Get specific submission
    if (submissionId) {
      const submission = await prisma.verificationSubmission.findFirst({
        where: { id: submissionId, userId }
      })
      if (!submission) {
        return NextResponse.json(
          { success: false, error: 'Submission not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data: submission })
    }

    // Get all submissions for the authenticated user
    const userSubmissions = await prisma.verificationSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: userSubmissions
    })
  } catch (error) {
    console.error('Verification GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve verification data' },
      { status: 500 }
    )
  }
}

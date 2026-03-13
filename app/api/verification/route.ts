import { NextRequest, NextResponse } from 'next/server'

/**
 * Verification API Route
 * Handles identity/document verification submissions
 */

interface VerificationRequest {
  userId: string
  verificationType: string
  documents: Array<{
    name: string
    size: number
    type: string
  }>
}

interface VerificationSubmission {
  id: string
  userId: string
  verificationType: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  documents: Array<{
    name: string
    size: number
    type: string
  }>
  submittedAt: string
  estimatedReviewTime: string
}

// In-memory store for demo (use database in production)
const submissions = new Map<string, VerificationSubmission>()

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

function generateSubmissionId(): string {
  return `VER-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

export async function POST(request: NextRequest) {
  try {
    const body: VerificationRequest = await request.json()
    const { userId, verificationType, documents } = body

    // Validation
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

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
    for (const [, submission] of submissions) {
      if (submission.userId === userId && 
          submission.verificationType === verificationType &&
          (submission.status === 'pending' || submission.status === 'reviewing')) {
        return NextResponse.json(
          { success: false, error: 'You already have a pending verification of this type' },
          { status: 409 }
        )
      }
    }

    const verificationConfig = VERIFICATION_TYPES[verificationType as keyof typeof VERIFICATION_TYPES]
    const submissionId = generateSubmissionId()

    const submission: VerificationSubmission = {
      id: submissionId,
      userId,
      verificationType,
      status: 'pending',
      documents,
      submittedAt: new Date().toISOString(),
      estimatedReviewTime: verificationConfig.estimatedTime
    }

    submissions.set(submissionId, submission)

    return NextResponse.json({
      success: true,
      data: {
        submissionId,
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
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const submissionId = searchParams.get('submissionId')

    // Get specific submission
    if (submissionId) {
      const submission = submissions.get(submissionId)
      if (!submission) {
        return NextResponse.json(
          { success: false, error: 'Submission not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data: submission })
    }

    // Get all submissions for user
    if (userId) {
      const userSubmissions = Array.from(submissions.values())
        .filter(s => s.userId === userId)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

      return NextResponse.json({
        success: true,
        data: userSubmissions
      })
    }

    // Return verification types if no filters
    return NextResponse.json({
      success: true,
      data: {
        types: Object.entries(VERIFICATION_TYPES).map(([key, value]) => ({
          id: key,
          ...value
        }))
      }
    })
  } catch (error) {
    console.error('Verification GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve verification data' },
      { status: 500 }
    )
  }
}

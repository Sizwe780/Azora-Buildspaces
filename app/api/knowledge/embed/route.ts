import { NextRequest, NextResponse } from 'next/server'
import { getKnowledgeIndexer } from '@/lib/knowledge/indexer'

/**
 * POST /api/knowledge/embed
 * Generate vector embeddings for the indexed knowledge base
 * Requires OPENAI_API_KEY in env or passed in body
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const apiKey = body.apiKey || process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key provided. Set OPENAI_API_KEY or pass apiKey in request body.' },
        { status: 400 }
      )
    }

    const indexer = getKnowledgeIndexer()
    const result = await indexer.generateEmbeddings(apiKey)

    return NextResponse.json({
      success: result.success,
      chunksProcessed: result.chunksProcessed,
      message: result.success 
        ? `Generated embeddings for ${result.chunksProcessed} chunks`
        : 'Embedding generation failed'
    })
  } catch (error) {
    console.error('[API] Embedding generation error:', error)
    return NextResponse.json(
      { error: 'Embedding generation failed', success: false },
      { status: 500 }
    )
  }
}

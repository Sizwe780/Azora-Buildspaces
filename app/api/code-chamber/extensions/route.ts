/**
 * Extension Marketplace API
 * 
 * Search, install, uninstall, and manage Code Chamber extensions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { extensionMarketplace, type ExtensionSearchQuery, type ExtensionCategory } from '@/lib/services/extension-marketplace'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'search'

    switch (action) {
      case 'search': {
        const query: ExtensionSearchQuery = {
          text: searchParams.get('q') || undefined,
          category: (searchParams.get('category') as ExtensionCategory) || undefined,
          sortBy: (searchParams.get('sortBy') as any) || 'relevance',
          sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
          page: parseInt(searchParams.get('page') || '1'),
          pageSize: parseInt(searchParams.get('pageSize') || '20'),
          verified: searchParams.get('verified') === 'true' || undefined,
        }

        const tags = searchParams.get('tags')
        if (tags) query.tags = tags.split(',')

        const results = await extensionMarketplace.search(query)
        return NextResponse.json(results)
      }

      case 'installed':
        return NextResponse.json({
          extensions: extensionMarketplace.getInstalled(),
          total: extensionMarketplace.getInstalled().length,
        })

      case 'featured':
        return NextResponse.json({
          extensions: extensionMarketplace.getFeatured(),
        })

      case 'stats':
        return NextResponse.json(extensionMarketplace.getStats())

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, extensionId, userId } = body

    switch (action) {
      case 'install': {
        if (!extensionId) return NextResponse.json({ error: 'extensionId required' }, { status: 400 })
        const installed = await extensionMarketplace.install(extensionId, userId || 'anonymous')
        return NextResponse.json({ success: true, extension: installed })
      }

      case 'uninstall': {
        if (!extensionId) return NextResponse.json({ error: 'extensionId required' }, { status: 400 })
        const removed = await extensionMarketplace.uninstall(extensionId)
        return NextResponse.json({ success: removed })
      }

      case 'enable': {
        if (!extensionId) return NextResponse.json({ error: 'extensionId required' }, { status: 400 })
        await extensionMarketplace.enable(extensionId)
        return NextResponse.json({ success: true })
      }

      case 'disable': {
        if (!extensionId) return NextResponse.json({ error: 'extensionId required' }, { status: 400 })
        await extensionMarketplace.disable(extensionId)
        return NextResponse.json({ success: true })
      }

      case 'update': {
        if (!extensionId) return NextResponse.json({ error: 'extensionId required' }, { status: 400 })
        const updated = await extensionMarketplace.update(extensionId)
        return NextResponse.json({ success: !!updated, extension: updated })
      }

      case 'review': {
        const { rating, title, body: reviewBody } = body
        if (!extensionId || !rating) {
          return NextResponse.json({ error: 'extensionId and rating required' }, { status: 400 })
        }
        const review = await extensionMarketplace.addReview(
          extensionId,
          userId || 'anonymous',
          body.userName || 'Anonymous',
          rating,
          title || '',
          reviewBody || ''
        )
        return NextResponse.json({ success: true, review })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

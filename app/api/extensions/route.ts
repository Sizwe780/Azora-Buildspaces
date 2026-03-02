import { NextRequest, NextResponse } from 'next/server'
import { extensionMarketplace } from '@/lib/services/extension-marketplace'

/**
 * Extension Marketplace API
 * GET  /api/extensions?q=search&category=themes&sort=installs&page=1&pageSize=20
 * POST /api/extensions  - install/uninstall/rate
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const text = searchParams.get('q') || undefined
    const category = searchParams.get('category') || undefined
    const sortBy = (searchParams.get('sort') || 'installs') as 'relevance' | 'installs' | 'rating' | 'name' | 'publishedDate'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    const results = extensionMarketplace.searchExtensions({
      text,
      category: category as any,
      sortBy,
      page,
      pageSize,
    })

    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, extensionId } = body

    switch (action) {
      case 'install':
        if (!extensionId) return NextResponse.json({ error: 'extensionId required' }, { status: 400 })
        await extensionMarketplace.installExtension(extensionId)
        return NextResponse.json({ success: true, action: 'installed', extensionId })

      case 'uninstall':
        if (!extensionId) return NextResponse.json({ error: 'extensionId required' }, { status: 400 })
        await extensionMarketplace.uninstallExtension(extensionId)
        return NextResponse.json({ success: true, action: 'uninstalled', extensionId })

      case 'rate': {
        if (!extensionId) return NextResponse.json({ error: 'extensionId required' }, { status: 400 })
        const { rating, title, body: reviewBody } = body
        if (!rating) return NextResponse.json({ error: 'rating required' }, { status: 400 })
        extensionMarketplace.rateExtension(extensionId, {
          id: `review-${Date.now()}`,
          extensionId,
          userId: 'current-user',
          userName: 'Current User',
          rating,
          title: title || '',
          body: reviewBody || '',
          createdAt: Date.now(),
          helpful: 0,
        })
        return NextResponse.json({ success: true, action: 'rated', extensionId })
      }

      case 'installed':
        return NextResponse.json({
          extensions: extensionMarketplace.getInstalledExtensions(),
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: install, uninstall, rate, installed' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { snippetManager } from '@/lib/services/snippet-manager'

/**
 * Snippets API
 * GET  /api/snippets?q=search&language=typescript&category=react-hooks
 * POST /api/snippets  - create/update/delete/import/export/use
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const language = searchParams.get('language') || undefined
    const category = searchParams.get('category') as any || undefined
    const prefix = searchParams.get('prefix') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Prefix-based lookup (for autocomplete)
    if (prefix && language) {
      const matches = snippetManager.getByPrefix(prefix, language)
      return NextResponse.json({ snippets: matches })
    }

    // Search
    const results = snippetManager.searchSnippets(query, { language, category, limit })
    return NextResponse.json({ snippets: results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create': {
        const snippet = snippetManager.createSnippet({
          name: body.name,
          prefix: body.prefix,
          body: body.body,
          description: body.description || '',
          language: body.language,
          scope: body.scope,
          category: body.category || 'other',
          tags: body.tags || [],
          author: body.author || 'user',
          source: 'user',
        })
        return NextResponse.json({ success: true, snippet })
      }

      case 'update': {
        if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const updated = snippetManager.updateSnippet(body.id, body.updates || {})
        if (!updated) return NextResponse.json({ error: 'Snippet not found or cannot edit builtin' }, { status: 404 })
        return NextResponse.json({ success: true, snippet: updated })
      }

      case 'delete': {
        if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const deleted = snippetManager.deleteSnippet(body.id)
        if (!deleted) return NextResponse.json({ error: 'Cannot delete builtin snippet' }, { status: 400 })
        return NextResponse.json({ success: true })
      }

      case 'use': {
        if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        snippetManager.recordUsage(body.id)
        return NextResponse.json({ success: true })
      }

      case 'expand': {
        if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const snippets = snippetManager.searchSnippets('', { limit: 1000 })
        const snippet = snippets.find(s => s.id === body.id)
        if (!snippet) return NextResponse.json({ error: 'Snippet not found' }, { status: 404 })
        const expanded = snippetManager.expandSnippet(snippet, body.variables)
        return NextResponse.json({ success: true, expanded })
      }

      case 'import': {
        if (!body.content || !body.language) {
          return NextResponse.json({ error: 'content and language required' }, { status: 400 })
        }
        const imported = snippetManager.importVSCodeSnippets(body.content, body.language)
        return NextResponse.json({ success: true, imported: imported.length })
      }

      case 'export': {
        if (!body.language) return NextResponse.json({ error: 'language required' }, { status: 400 })
        const exported = snippetManager.exportVSCodeSnippets(body.language)
        return NextResponse.json({ success: true, content: exported })
      }

      case 'stats':
        return NextResponse.json(snippetManager.getStats())

      case 'categories': {
        if (!body.language) return NextResponse.json({ error: 'language required' }, { status: 400 })
        const categories = snippetManager.getCategoriesForLanguage(body.language)
        return NextResponse.json({ categories })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, update, delete, use, expand, import, export, stats, categories' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

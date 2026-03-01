/**
 * Code Search API
 * 
 * Full-text search, symbol search, and file search for workspace files.
 */

import { NextRequest, NextResponse } from 'next/server'
import { codeSearch, type SearchOptions } from '@/lib/services/code-search'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'search'

    switch (action) {
      case 'search': {
        const query = searchParams.get('q')
        if (!query) return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })

        const options: SearchOptions = {
          query,
          isRegex: searchParams.get('regex') === 'true',
          isCaseSensitive: searchParams.get('caseSensitive') === 'true',
          isWholeWord: searchParams.get('wholeWord') === 'true',
          includePattern: searchParams.get('include') || undefined,
          excludePattern: searchParams.get('exclude') || undefined,
          maxResults: parseInt(searchParams.get('maxResults') || '500'),
          contextLines: parseInt(searchParams.get('context') || '2'),
        }

        const results = codeSearch.search(options)
        return NextResponse.json(results)
      }

      case 'symbols': {
        const query = searchParams.get('q') || ''
        const kind = searchParams.get('kind') as any
        const limit = parseInt(searchParams.get('limit') || '50')
        const results = codeSearch.searchSymbols(query, kind, limit)
        return NextResponse.json(results)
      }

      case 'files': {
        const query = searchParams.get('q')
        if (!query) return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
        const limit = parseInt(searchParams.get('limit') || '30')
        const results = codeSearch.searchFiles(query, limit)
        return NextResponse.json({ files: results })
      }

      case 'file-symbols': {
        const path = searchParams.get('path')
        if (!path) return NextResponse.json({ error: 'Query parameter "path" is required' }, { status: 400 })
        const symbols = codeSearch.getSymbolsInFile(path)
        return NextResponse.json({ symbols })
      }

      case 'stats':
        return NextResponse.json(codeSearch.getStats())

      case 'history':
        return NextResponse.json({ history: codeSearch.getHistory() })

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
    const { action } = body

    switch (action) {
      case 'index': {
        // Index one or more files
        const { files } = body as { files: { path: string; content: string }[] }
        if (!files?.length) return NextResponse.json({ error: 'files array required' }, { status: 400 })
        const result = codeSearch.indexWorkspace(files)
        return NextResponse.json({ success: true, ...result })
      }

      case 'replace-preview': {
        const { query, replacement, isRegex, isCaseSensitive, isWholeWord, includePattern, excludePattern } = body
        if (!query || replacement === undefined) {
          return NextResponse.json({ error: 'query and replacement required' }, { status: 400 })
        }
        const previews = codeSearch.previewReplace({
          query, replacement, isRegex, isCaseSensitive, isWholeWord, includePattern, excludePattern,
        })
        return NextResponse.json({ previews })
      }

      case 'replace': {
        const { query, replacement, isRegex, isCaseSensitive, isWholeWord, includePattern, excludePattern } = body
        if (!query || replacement === undefined) {
          return NextResponse.json({ error: 'query and replacement required' }, { status: 400 })
        }
        const result = codeSearch.applyReplace({
          query, replacement, isRegex, isCaseSensitive, isWholeWord, includePattern, excludePattern,
        })
        return NextResponse.json({ success: true, ...result })
      }

      case 'save-search': {
        const { name, query, options } = body
        if (!name || !query) return NextResponse.json({ error: 'name and query required' }, { status: 400 })
        const saved = codeSearch.saveSearch(name, query, options || {})
        return NextResponse.json({ success: true, search: saved })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { figmaToCode } from '@/lib/services/figma-to-code'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'frameworks'

  switch (action) {
    case 'frameworks':
      return NextResponse.json({ frameworks: figmaToCode.getSupportedFrameworks() })
    case 'history':
      return NextResponse.json({ history: figmaToCode.getConversionHistory() })
    case 'tokens':
      return NextResponse.json({ tokens: figmaToCode.getDesignTokens() })
    case 'imports':
      return NextResponse.json({ imports: figmaToCode.getImportedFiles() })
    case 'stats':
      return NextResponse.json({ stats: figmaToCode.getStats() })
    case 'code': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      const code = figmaToCode.getGeneratedCode(id)
      if (!code) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ code })
    }
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'import': {
        const { fileKey, accessToken, url } = body
        const result = url
          ? await figmaToCode.importFromFigmaUrl(url, accessToken || 'demo')
          : await figmaToCode.importFromFigma(fileKey || 'demo', accessToken || 'demo')
        return NextResponse.json({ result })
      }
      case 'generate': {
        const { component, options } = body
        const code = await figmaToCode.generateCode(component, options)
        return NextResponse.json({ code })
      }
      case 'generate-all': {
        const { fileKey, options } = body
        const codes = await figmaToCode.generateFromImport(fileKey, options)
        return NextResponse.json({ codes })
      }
      case 'clear-history':
        figmaToCode.clearHistory()
        return NextResponse.json({ success: true })
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { themeService } from '@/lib/services/theme-service'

/**
 * Themes & Accessibility API
 * GET  /api/themes?type=dark
 * POST /api/themes  - set active, update accessibility, export
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as any || undefined

    const themes = type ? themeService.getThemesByType(type) : themeService.getAllThemes()
    const active = themeService.getActiveTheme()
    const accessibility = themeService.getAccessibility()

    return NextResponse.json({
      themes: themes.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        author: t.author,
        description: t.description,
      })),
      active: active.id,
      accessibility,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'set-theme': {
        if (!body.themeId) return NextResponse.json({ error: 'themeId required' }, { status: 400 })
        const theme = themeService.setActiveTheme(body.themeId)
        if (!theme) return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
        const cssVars = themeService.generateCSSVariables()
        return NextResponse.json({ success: true, theme: { id: theme.id, name: theme.name }, cssVariables: cssVars })
      }

      case 'update-accessibility': {
        const settings = themeService.updateAccessibility(body.settings || {})
        const cssVars = themeService.generateCSSVariables()
        const filter = themeService.getColorBlindFilter()
        return NextResponse.json({ success: true, settings, cssVariables: cssVars, colorBlindFilter: filter })
      }

      case 'css-variables': {
        const cssVars = themeService.generateCSSVariables()
        const filter = themeService.getColorBlindFilter()
        return NextResponse.json({ cssVariables: cssVars, colorBlindFilter: filter })
      }

      case 'check-contrast': {
        if (!body.foreground || !body.background) {
          return NextResponse.json({ error: 'foreground and background required' }, { status: 400 })
        }
        const result = themeService.checkContrast(body.foreground, body.background)
        return NextResponse.json(result)
      }

      case 'export': {
        if (!body.themeId) return NextResponse.json({ error: 'themeId required' }, { status: 400 })
        const exported = themeService.exportToVSCodeFormat(body.themeId)
        if (!exported) return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
        return NextResponse.json({ success: true, content: exported })
      }

      case 'get-full': {
        if (!body.themeId) return NextResponse.json({ error: 'themeId required' }, { status: 400 })
        const theme = themeService.getTheme(body.themeId)
        if (!theme) return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
        return NextResponse.json({ theme })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: set-theme, update-accessibility, css-variables, check-contrast, export, get-full' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

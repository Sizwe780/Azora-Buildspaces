import { NextRequest, NextResponse } from 'next/server'
import { settingsPreferences } from '@/lib/services/settings-preferences'

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  try {
    switch (action) {
      case 'categories': {
        return NextResponse.json({ categories: settingsPreferences.getCategories() })
      }
      case 'definitions': {
        const category = req.nextUrl.searchParams.get('category') || undefined
        return NextResponse.json({ definitions: settingsPreferences.getDefinitions(category) })
      }
      case 'definition': {
        const id = req.nextUrl.searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        const definition = settingsPreferences.getDefinition(id)
        return NextResponse.json({ definition })
      }
      case 'search': {
        const query = req.nextUrl.searchParams.get('query') || ''
        return NextResponse.json({ results: settingsPreferences.searchSettings(query) })
      }
      case 'settings': {
        const scope = (req.nextUrl.searchParams.get('scope') || 'user') as 'user' | 'workspace'
        return NextResponse.json({ settings: settingsPreferences.getAllSettings(scope) })
      }
      case 'settings-json': {
        const scope = (req.nextUrl.searchParams.get('scope') || 'user') as 'user' | 'workspace'
        return NextResponse.json({ json: settingsPreferences.getSettingsJSON(scope) })
      }
      case 'modified': {
        const scope = (req.nextUrl.searchParams.get('scope') || 'user') as 'user' | 'workspace'
        return NextResponse.json({ modified: settingsPreferences.getModifiedSettings(scope) })
      }
      case 'keybindings': {
        const source = req.nextUrl.searchParams.get('source') as 'default' | 'user' | 'extension' | undefined
        return NextResponse.json({ keybindings: settingsPreferences.getKeybindings(source || undefined) })
      }
      case 'search-keybindings': {
        const query = req.nextUrl.searchParams.get('query') || ''
        return NextResponse.json({ keybindings: settingsPreferences.searchKeybindings(query) })
      }
      case 'keybindings-json': {
        return NextResponse.json({ json: settingsPreferences.getKeybindingsJSON() })
      }
      case 'get-setting': {
        const id = req.nextUrl.searchParams.get('id')
        const scope = (req.nextUrl.searchParams.get('scope') || 'user') as 'user' | 'workspace'
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        return NextResponse.json({ value: settingsPreferences.getSetting(id, scope) })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'set-setting': {
        const { id, value, scope = 'user' } = body
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        settingsPreferences.setSetting(id, value, scope)
        return NextResponse.json({ success: true })
      }
      case 'reset-setting': {
        const { id, scope = 'user' } = body
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        settingsPreferences.resetSetting(id, scope)
        return NextResponse.json({ success: true })
      }
      case 'import-settings': {
        const { json, scope = 'user' } = body
        if (!json) return NextResponse.json({ error: 'Missing json' }, { status: 400 })
        const success = settingsPreferences.importSettingsJSON(json, scope)
        return NextResponse.json({ success })
      }
      case 'set-keybinding': {
        const { command, key, when } = body
        if (!command || !key) return NextResponse.json({ error: 'Missing command or key' }, { status: 400 })
        settingsPreferences.setKeybinding(command, key, when)
        return NextResponse.json({ success: true })
      }
      case 'reset-keybinding': {
        const { command } = body
        if (!command) return NextResponse.json({ error: 'Missing command' }, { status: 400 })
        settingsPreferences.resetKeybinding(command)
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

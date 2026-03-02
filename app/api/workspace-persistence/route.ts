import { NextRequest, NextResponse } from 'next/server'
import { workspacePersistence } from '@/lib/services/workspace-persistence'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'snapshots'

  switch (action) {
    case 'snapshots': {
      const workspaceId = searchParams.get('workspaceId') || undefined
      return NextResponse.json({ snapshots: workspacePersistence.getSnapshots(workspaceId) })
    }
    case 'profiles':
      return NextResponse.json({ profiles: workspacePersistence.getProfiles() })
    case 'active-profile':
      return NextResponse.json({ profile: workspacePersistence.getActiveProfile() })
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'save-snapshot': {
        const { workspaceId, state, label } = body
        const snapshot = await workspacePersistence.saveSnapshot(workspaceId || 'default', state, label)
        return NextResponse.json({ snapshot })
      }
      case 'restore-snapshot': {
        const { snapshotId } = body
        const state = await workspacePersistence.restoreSnapshot(snapshotId)
        return NextResponse.json({ state })
      }
      case 'delete-snapshot': {
        const { snapshotId } = body
        const deleted = workspacePersistence.deleteSnapshot(snapshotId)
        return NextResponse.json({ success: deleted })
      }
      case 'set-active-profile': {
        const { profileId } = body
        const profile = workspacePersistence.setActiveProfile(profileId)
        return NextResponse.json({ profile })
      }
      case 'update-profile': {
        const { profileId, updates } = body
        const profile = workspacePersistence.updateProfile(profileId, updates)
        return NextResponse.json({ profile })
      }
      case 'create-profile': {
        const { name, description, icon, settings, extensions, keybindings, snippets } = body
        const profile = workspacePersistence.createProfile({
          name,
          description: description || '',
          icon: icon || '⚙️',
          settings: settings || {},
          extensions: extensions || [],
          keybindings: keybindings || [],
          snippets: snippets || {},
        })
        return NextResponse.json({ profile })
      }
      case 'delete-profile': {
        const { profileId } = body
        const deleted = workspacePersistence.deleteProfile(profileId)
        return NextResponse.json({ success: deleted })
      }
      case 'export-profile': {
        const { profileId } = body
        const data = workspacePersistence.exportProfile(profileId)
        return NextResponse.json({ data })
      }
      case 'import-profile': {
        const { data } = body
        const profile = workspacePersistence.importProfile(data)
        return NextResponse.json({ profile })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

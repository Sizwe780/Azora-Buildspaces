import { NextRequest, NextResponse } from 'next/server'
import { cloudEmulation } from '@/lib/services/cloud-emulation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'presets'

  switch (action) {
    case 'presets':
      return NextResponse.json({ presets: cloudEmulation.getPresets() })
    case 'emulators':
      return NextResponse.json({ emulators: cloudEmulation.getAll() })
    case 'running':
      return NextResponse.json({ emulators: cloudEmulation.getRunning() })
    case 'status': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      const emulator = cloudEmulation.getEmulator(id)
      return NextResponse.json({ emulator })
    }
    case 'logs': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      return NextResponse.json({ logs: cloudEmulation.getLogs(id) })
    }
    case 'env-vars':
      return NextResponse.json({ variables: cloudEmulation.getEnvironmentVariables() })
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start': {
        const { provider, service, config } = body
        const emulator = await cloudEmulation.startEmulator(provider, service, config)
        return NextResponse.json({ emulator })
      }
      case 'stop': {
        const { id } = body
        await cloudEmulation.stopEmulator(id)
        return NextResponse.json({ success: true })
      }
      case 'start-preset': {
        const { presetId } = body
        const emulators = await cloudEmulation.startPreset(presetId)
        return NextResponse.json({ emulators })
      }
      case 'stop-all':
        await cloudEmulation.stopAll()
        return NextResponse.json({ success: true })
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

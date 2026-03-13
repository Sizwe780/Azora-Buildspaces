import { NextRequest, NextResponse } from 'next/server'
import { livePreview } from '@/lib/services/live-preview'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'previews'

  switch (action) {
    case 'previews':
      return NextResponse.json({ previews: livePreview.getAllPreviews() })
    case 'devices':
      return NextResponse.json({ devices: livePreview.getDevicePresets() })
    case 'console':
      return NextResponse.json({ messages: livePreview.getConsoleMessages() })
    case 'network':
      return NextResponse.json({ requests: livePreview.getNetworkRequests() })
    case 'metrics':
      return NextResponse.json({ metrics: livePreview.getMetrics() })
    case 'performance':
      return NextResponse.json({ metrics: livePreview.getPerformanceMetrics() })
    case 'status': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      const status = await livePreview.getStatus(id)
      return NextResponse.json({ status })
    }
    case 'preview': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      return NextResponse.json({ preview: livePreview.getPreview(id) })
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
      case 'create': {
        const { url, viewport } = body
        const preview = livePreview.createPreview({ url, viewport })
        return NextResponse.json({ preview })
      }
      case 'start': {
        const { url, viewport, mode } = body
        const preview = livePreview.startPreview({ url, viewport, mode })
        return NextResponse.json({ preview })
      }
      case 'close': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        livePreview.closePreview(id)
        return NextResponse.json({ success: true })
      }
      case 'stop': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        livePreview.stopPreview(id)
        return NextResponse.json({ success: true })
      }
      case 'refresh': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        livePreview.refreshPreview(id)
        return NextResponse.json({ success: true })
      }
      case 'close-all':
        livePreview.closeAll()
        return NextResponse.json({ success: true })
      case 'set-viewport': {
        const { previewId, viewport } = body
        livePreview.setViewport(previewId, viewport)
        return NextResponse.json({ success: true })
      }
      case 'set-device': {
        const { previewId, deviceName } = body
        livePreview.setDevice(previewId, deviceName)
        return NextResponse.json({ success: true })
      }
      case 'set-url': {
        const { previewId, url } = body
        livePreview.setUrl(previewId, url)
        return NextResponse.json({ success: true })
      }
      case 'clear-console':
        livePreview.clearConsole()
        return NextResponse.json({ success: true })
      case 'clear-network':
        livePreview.clearNetwork()
        return NextResponse.json({ success: true })
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

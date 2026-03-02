import { NextRequest, NextResponse } from 'next/server'
import { securityService } from '@/lib/services/security-sandbox'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'policy'

  switch (action) {
    case 'policy':
      return NextResponse.json({ policy: securityService.getActivePolicy() })
    case 'audit-log': {
      const limit = parseInt(searchParams.get('limit') || '50')
      return NextResponse.json({ log: securityService.getAuditLog(limit) })
    }
    case 'secrets':
      return NextResponse.json({ secrets: securityService.listSecrets() })
    case 'scan-results': {
      const limit = parseInt(searchParams.get('limit') || '10')
      return NextResponse.json({ results: securityService.getRecentScans(limit) })
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
      case 'scan': {
        const { files } = body
        const results = await securityService.scanCode(files)
        return NextResponse.json({ results })
      }
      case 'set-policy': {
        const { level } = body
        const policy = securityService.setPolicy(level)
        return NextResponse.json({ policy })
      }
      case 'set-secret': {
        const { name, value, scope } = body
        const secret = securityService.setSecret(name, value, scope)
        return NextResponse.json({ secret })
      }
      case 'delete-secret': {
        const { name } = body
        const deleted = securityService.deleteSecret(name)
        return NextResponse.json({ success: deleted })
      }
      case 'get-secret': {
        const { name } = body
        const value = securityService.getSecret(name)
        return NextResponse.json({ value })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

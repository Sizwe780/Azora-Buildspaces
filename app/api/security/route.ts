import { NextRequest, NextResponse } from 'next/server'
import { securityService } from '@/lib/services/security-sandbox'

const SECURITY_LEVELS = new Set(['standard', 'enhanced', 'strict', 'paranoid'])

function normalizeScanFiles(body: any): Array<{ path: string; content: string }> {
  if (Array.isArray(body?.files)) {
    return body.files
      .filter((item: any) => item && typeof item.path === 'string' && typeof item.content === 'string')
      .map((item: any) => ({ path: item.path, content: item.content }))
  }

  if (typeof body?.code === 'string') {
    return [{ path: String(body?.filename || 'inline.ts'), content: body.code }]
  }

  return []
}

function normalizePolicyLevel(body: any): 'standard' | 'enhanced' | 'strict' | 'paranoid' {
  const level = String(body?.level || body?.policyId || 'standard').toLowerCase()
  if (SECURITY_LEVELS.has(level)) {
    return level as 'standard' | 'enhanced' | 'strict' | 'paranoid'
  }
  return 'standard'
}

function normalizeSecretScope(body: any): 'workspace' | 'project' | 'user' | 'organization' {
  const scopeRaw = String(body?.scope || '').toLowerCase()
  if (scopeRaw === 'workspace' || scopeRaw === 'project' || scopeRaw === 'user' || scopeRaw === 'organization') {
    return scopeRaw
  }

  const envRaw = String(body?.environment || '').toLowerCase()
  if (envRaw === 'production') return 'project'
  if (envRaw === 'all') return 'organization'
  return 'workspace'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'policy'

  switch (action) {
    case 'policy':
      return NextResponse.json({
        policy: securityService.getActivePolicy(),
        policies: securityService.getAvailablePolicies(),
      })
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
    const action = String(body?.action || '').toLowerCase()

    switch (action) {
      case 'scan': {
        const files = normalizeScanFiles(body)
        if (files.length === 0) {
          return NextResponse.json({ error: 'scan requires files[] or code/filename payload' }, { status: 400 })
        }
        const results = await securityService.scanCode(files)
        return NextResponse.json({ results })
      }
      case 'set-policy': {
        const level = normalizePolicyLevel(body)
        const policy = securityService.setPolicy(level)
        return NextResponse.json({ policy })
      }
      case 'set-secret': {
        const name = String(body?.name || '').trim()
        const value = String(body?.value || '')
        const scope = normalizeSecretScope(body)
        if (!name) {
          return NextResponse.json({ error: 'Secret name is required' }, { status: 400 })
        }
        if (!value) {
          return NextResponse.json({ error: 'Secret value is required' }, { status: 400 })
        }
        const secret = securityService.setSecret(name, value, scope)
        return NextResponse.json({ secret })
      }
      case 'delete-secret': {
        const name = String(body?.name || '').trim()
        if (!name) {
          return NextResponse.json({ error: 'Secret name is required' }, { status: 400 })
        }
        const deleted = securityService.deleteSecret(name)
        return NextResponse.json({ success: deleted })
      }
      case 'get-secret': {
        const name = String(body?.name || '').trim()
        if (!name) {
          return NextResponse.json({ error: 'Secret name is required' }, { status: 400 })
        }
        const value = securityService.getSecret(name)
        return NextResponse.json({ value })
      }
      case 'add-secret': {
        const name = String(body?.name || '').trim()
        const value = String(body?.value || '')
        const scope = normalizeSecretScope(body)
        if (!name) {
          return NextResponse.json({ error: 'Secret name is required' }, { status: 400 })
        }
        if (!value) {
          return NextResponse.json({ error: 'Secret value is required' }, { status: 400 })
        }
        const secret = securityService.setSecret(name, value, scope)
        return NextResponse.json({ secret })
      }
      case 'remove-secret': {
        const name = String(body?.name || '').trim()
        if (!name) {
          return NextResponse.json({ error: 'Secret name is required' }, { status: 400 })
        }
        const deleted = securityService.deleteSecret(name)
        return NextResponse.json({ success: deleted })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

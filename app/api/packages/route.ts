import { NextRequest, NextResponse } from 'next/server'
import { packageManagement } from '@/lib/services/package-management'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'detect'

  switch (action) {
    case 'detect': {
      const files = (searchParams.get('files') || 'package.json').split(',')
      const detected = packageManagement.detectPackageManager(files)
      return NextResponse.json({ detected })
    }
    case 'dependencies': {
      const projectPath = searchParams.get('path') || '.'
      const deps = await packageManagement.getDependencyTree(projectPath)
      return NextResponse.json({ dependencies: deps })
    }
    case 'audit': {
      const projectPath = searchParams.get('path') || '.'
      const audit = await packageManagement.audit(projectPath)
      return NextResponse.json({ audit })
    }
    case 'licenses': {
      const projectPath = searchParams.get('path') || '.'
      const licenses = await packageManagement.checkLicenses(projectPath)
      return NextResponse.json({ licenses })
    }
    case 'outdated': {
      const projectPath = searchParams.get('path') || '.'
      const outdated = await packageManagement.getOutdated(projectPath)
      return NextResponse.json({ outdated })
    }
    case 'install-command': {
      const pm = (searchParams.get('pm') || 'npm') as any
      const pkg = searchParams.get('package') || ''
      const dev = searchParams.get('dev') === 'true'
      return NextResponse.json({ command: packageManagement.getInstallCommand(pm, pkg, dev) })
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
      case 'search': {
        const { query, registry } = body
        const results = await packageManagement.searchPackages(query, registry)
        return NextResponse.json({ results })
      }
      case 'install-command': {
        const { pm, packageName, dev } = body
        const command = packageManagement.getInstallCommand(pm, packageName, dev)
        return NextResponse.json({ command })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

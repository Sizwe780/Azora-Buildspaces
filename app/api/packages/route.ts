import { NextRequest, NextResponse } from 'next/server'
import { packageManagement } from '@/lib/services/package-management'
import fs from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const PACKAGE_NAME_PATTERN = /^(@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)(@[a-zA-Z0-9._+-]+)?$/

async function detectWorkspacePackageManager(): Promise<
  'npm' | 'pnpm' | 'yarn' | 'bun' | 'pip' | 'poetry' | 'conda' | 'cargo' | 'go' | 'composer' | 'gem' | 'nuget'
> {
  try {
    const entries = await fs.readdir(process.cwd())
    const detected = packageManagement.detectPackageManager(entries)
    return detected || 'npm'
  } catch {
    return 'npm'
  }
}

function getUninstallCommand(pm: string, packageName: string): string {
  switch (pm) {
    case 'pnpm':
      return `pnpm remove ${packageName}`
    case 'yarn':
      return `yarn remove ${packageName}`
    case 'bun':
      return `bun remove ${packageName}`
    case 'npm':
      return `npm uninstall ${packageName}`
    case 'pip':
      return `pip uninstall -y ${packageName}`
    case 'poetry':
      return `poetry remove ${packageName}`
    case 'conda':
      return `conda remove -y ${packageName}`
    case 'cargo':
      return `cargo remove ${packageName}`
    case 'go':
      return `go get ${packageName}@none`
    case 'composer':
      return `composer remove ${packageName}`
    case 'gem':
      return `gem uninstall ${packageName}`
    case 'nuget':
      return `dotnet remove package ${packageName}`
    default:
      return `npm uninstall ${packageName}`
  }
}

async function runPackageMutation(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 120000,
      maxBuffer: 2 * 1024 * 1024,
    })
    return { stdout: stdout || '', stderr: stderr || '', exitCode: 0 }
  } catch (error: any) {
    return {
      stdout: String(error?.stdout || ''),
      stderr: String(error?.stderr || error?.message || ''),
      exitCode: typeof error?.code === 'number' ? error.code : 1,
    }
  }
}

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
      const flatten = deps.children.map((node) => ({
        name: node.name,
        version: node.version,
        latest: node.version,
        type: node.isDev ? 'devDependency' : 'dependency',
        hasUpdate: false,
      }))
      return NextResponse.json({ dependencies: flatten })
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
      case 'install': {
        const rawPackages = Array.isArray(body?.packages) ? body.packages : []
        const packages = rawPackages
          .map((value: any) => String(value || '').trim())
          .filter((name: string) => PACKAGE_NAME_PATTERN.test(name))

        if (packages.length === 0) {
          return NextResponse.json({ error: 'At least one valid package is required' }, { status: 400 })
        }

        const pm = String(body?.pm || await detectWorkspacePackageManager()) as any
        const dev = body?.dev === true
        const command = packageManagement.getInstallCommand(pm, packages.join(' '), dev)
        const result = await runPackageMutation(command)

        return NextResponse.json({
          manager: pm,
          command,
          success: result.exitCode === 0,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        }, { status: result.exitCode === 0 ? 200 : 500 })
      }
      case 'uninstall': {
        const rawPackages = Array.isArray(body?.packages) ? body.packages : []
        const packages = rawPackages
          .map((value: any) => String(value || '').trim())
          .filter((name: string) => PACKAGE_NAME_PATTERN.test(name))

        if (packages.length === 0) {
          return NextResponse.json({ error: 'At least one valid package is required' }, { status: 400 })
        }

        const pm = String(body?.pm || await detectWorkspacePackageManager())
        const command = getUninstallCommand(pm, packages.join(' '))
        const result = await runPackageMutation(command)

        return NextResponse.json({
          manager: pm,
          command,
          success: result.exitCode === 0,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        }, { status: result.exitCode === 0 ? 200 : 500 })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

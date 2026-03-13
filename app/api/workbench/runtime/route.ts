import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import type { Dirent } from 'fs'
import path from 'path'
import fs from 'fs/promises'
import ts from 'typescript'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { executeTerminalCommand, TerminalExecutionRequestError } from '@/lib/runtime/terminal-exec'

const execFileAsync = promisify(execFile)

type ProblemSeverity = 'error' | 'warning' | 'info'

interface WorkspaceProblem {
  file: string
  line: number
  column: number
  severity: ProblemSeverity
  code: string
  message: string
}

interface PortEntry {
  protocol: 'tcp'
  address: string
  port: number
  state: string
  pid?: number
}

const COMMAND_SUGGESTIONS = [
  'help',
  'clear',
  'history -c',
  'shell bash',
  'shell powershell',
  'alias',
  'unalias',
  'setenv',
  'unsetenv',
  'env',
  'profile export',
  'profile import ',
  'profile import --merge ',
  'profile import --replace ',
  'profile apply ',
  'profile apply --merge ',
  'profile apply --replace ',
  'profile diff ',
  'profile show',
  'profile show current-shell',
  'profile show all-shells',
  'profile copy bash',
  'profile copy powershell',
  'profile rename-alias ',
  'profile unset-all-env',
  'profile unset-all-env current-shell',
  'profile unset-all-env all-shells',
  'profile unset-all-aliases',
  'profile unset-all-aliases current-shell',
  'profile unset-all-aliases all-shells',
  'profile clean',
  'profile clean current-shell',
  'profile clean all-shells',
  'profile reset',
  'profile reset current-shell',
  'profile reset all-shells',
  'profile scope',
  'profile scope session',
  'profile scope workspace',
  'npm run dev',
  'npm test',
  'npm run build',
  'git status',
  'git add .',
  'git commit -m ""',
  'git push',
]

async function collectWorkspaceFileSuggestions(cwd: string, maxEntries = 200): Promise<string[]> {
  const workspacesDir = path.resolve(cwd, 'workspaces')
  const out: string[] = []
  const queue: Array<{ dir: string; depth: number }> = [{ dir: cwd, depth: 0 }]
  const blocked = new Set(['node_modules', '.git', '.next', '.turbo', 'dist', 'build'])

  while (queue.length > 0 && out.length < maxEntries) {
    const current = queue.shift()!
    if (current.depth > 3) continue

    let entries: Dirent<string>[]
    try {
      entries = await fs.readdir(current.dir, { withFileTypes: true, encoding: 'utf8' })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (out.length >= maxEntries) break
      if (blocked.has(entry.name)) continue

      const abs = path.join(current.dir, entry.name)
      if (abs.startsWith(workspacesDir + path.sep)) continue

      if (entry.isDirectory()) {
        queue.push({ dir: abs, depth: current.depth + 1 })
      } else if (entry.isFile()) {
        const rel = path.relative(cwd, abs).replace(/\\/g, '/')
        if (rel && rel.length <= 120) {
          out.push(rel)
        }
      }
    }
  }

  return out
}

async function collectCompletions(cwd: string, prefixRaw: string): Promise<string[]> {
  const prefix = prefixRaw.trim()
  const fileSuggestions = await collectWorkspaceFileSuggestions(cwd)
  const all = [...COMMAND_SUGGESTIONS, ...fileSuggestions]

  const filtered = prefix.length === 0
    ? all.slice(0, 40)
    : all.filter((item) => item.startsWith(prefix) || item.includes(prefix))

  const deduped: string[] = []
  for (const item of filtered) {
    if (deduped.includes(item)) continue
    deduped.push(item)
    if (deduped.length >= 40) break
  }

  return deduped
}

function toSeverity(category: ts.DiagnosticCategory): ProblemSeverity {
  if (category === ts.DiagnosticCategory.Error) return 'error'
  if (category === ts.DiagnosticCategory.Warning) return 'warning'
  return 'info'
}

function normalizeMessageText(messageText: string | ts.DiagnosticMessageChain): string {
  return typeof messageText === 'string' ? messageText : ts.flattenDiagnosticMessageText(messageText, '\n')
}

function collectTypeScriptProblems(cwd: string): WorkspaceProblem[] {
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.json')
  if (!configPath) return []

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) {
    return [{
      file: 'tsconfig.json',
      line: 1,
      column: 1,
      severity: 'error',
      code: String(configFile.error.code),
      message: normalizeMessageText(configFile.error.messageText),
    }]
  }

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath))
  const program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
    projectReferences: parsedConfig.projectReferences,
  })

  const diagnostics = ts.getPreEmitDiagnostics(program)
  const problems: WorkspaceProblem[] = []

  for (const diagnostic of diagnostics) {
    const fileName = diagnostic.file?.fileName
    const relFile = fileName ? path.relative(cwd, fileName).replace(/\\/g, '/') : 'tsconfig.json'

    let line = 1
    let column = 1
    if (diagnostic.file && typeof diagnostic.start === 'number') {
      const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
      line = position.line + 1
      column = position.character + 1
    }

    problems.push({
      file: relFile,
      line,
      column,
      severity: toSeverity(diagnostic.category),
      code: String(diagnostic.code),
      message: normalizeMessageText(diagnostic.messageText),
    })
  }

  return problems.slice(0, 500)
}

async function collectListeningPorts(cwd: string): Promise<PortEntry[]> {
  if (process.platform === 'win32') {
    const { stdout } = await execFileAsync('netstat', ['-ano', '-p', 'tcp'], { cwd })
    const lines = stdout.split(/\r?\n/)
    const ports: PortEntry[] = []

    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('TCP')) continue
      const parts = line.split(/\s+/)
      if (parts.length < 5) continue

      const local = parts[1]
      const state = parts[3]
      const pidText = parts[4]
      if (state.toUpperCase() !== 'LISTENING') continue

      const idx = local.lastIndexOf(':')
      if (idx <= 0) continue
      const address = local.slice(0, idx)
      const portValue = Number.parseInt(local.slice(idx + 1), 10)
      if (!Number.isFinite(portValue)) continue

      const pid = Number.parseInt(pidText, 10)
      ports.push({
        protocol: 'tcp',
        address,
        port: portValue,
        state,
        pid: Number.isFinite(pid) ? pid : undefined,
      })
    }

    return ports.sort((a, b) => a.port - b.port)
  }

  const { stdout } = await execFileAsync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], { cwd })
  const lines = stdout.split(/\r?\n/).slice(1)
  const ports: PortEntry[] = []

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 9) continue

    const name = parts[8]
    const splitAt = name.lastIndexOf(':')
    if (splitAt <= 0) continue

    const address = name.slice(0, splitAt)
    const portToken = name.slice(splitAt + 1)
    const port = Number.parseInt(portToken, 10)
    if (!Number.isFinite(port)) continue

    const pid = Number.parseInt(parts[1], 10)
    ports.push({
      protocol: 'tcp',
      address,
      port,
      state: 'LISTEN',
      pid: Number.isFinite(pid) ? pid : undefined,
    })
  }

  return ports.sort((a, b) => a.port - b.port)
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = (searchParams.get('action') || 'problems').toLowerCase()
  const cwd = process.cwd()

  try {
    if (action === 'problems') {
      const problems = collectTypeScriptProblems(cwd)
      return NextResponse.json({
        problems,
        summary: {
          errors: problems.filter((item) => item.severity === 'error').length,
          warnings: problems.filter((item) => item.severity === 'warning').length,
          infos: problems.filter((item) => item.severity === 'info').length,
        },
      })
    }

    if (action === 'ports') {
      const ports = await collectListeningPorts(cwd)
      return NextResponse.json({ ports })
    }

    if (action === 'completions') {
      const prefix = searchParams.get('prefix') || ''
      const completions = await collectCompletions(cwd, prefix)
      return NextResponse.json({ completions })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '').toLowerCase()

    if (action !== 'exec') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const result = await executeTerminalCommand({
      command: String(body.command || ''),
      workspaceId: String(body.workspaceId || session.user?.id || 'default'),
      shell: body.shell,
      env: body.env,
      cwd: body.cwd,
      sessionId: body.sessionId,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof TerminalExecutionRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

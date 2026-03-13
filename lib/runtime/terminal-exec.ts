import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

export type TerminalShell = 'bash' | 'powershell'

export interface ExecuteTerminalCommandParams {
  command: string
  workspaceId: string
  shell?: string
  env?: unknown
  cwd?: unknown
  sessionId?: string
  timeoutMs?: number
}

export interface ExecuteTerminalCommandResult {
  stdout: string
  stderr: string
  exitCode: number
  cwd: string
  shell: TerminalShell
}

export class TerminalExecutionRequestError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'TerminalExecutionRequestError'
    this.statusCode = statusCode
  }
}

interface TerminalSessionState {
  workspaceId: string
  cwdRelative: string
  shell: TerminalShell
  env: Record<string, string>
  updatedAt: number
}

const BLOCKED_COMMANDS = ['rm -rf /', 'format', 'mkfs', 'dd if=', ':(){', 'fork bomb']
const MAX_OUTPUT_LENGTH = 100_000
const MAX_COMMAND_LENGTH = 10_000
const WORKSPACE_ID_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/
const SESSION_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,128}$/
const ALLOWED_SHELLS = new Set<TerminalShell>(['bash', 'powershell'])
const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/
const MAX_ENV_VARS = 64
const MAX_ENV_VALUE_LENGTH = 4096
const SESSION_TTL_MS = 2 * 60 * 60 * 1000

const terminalSessions = new Map<string, TerminalSessionState>()

function sanitizeRequestedCwd(input: unknown): string | null {
  if (typeof input !== 'string') {
    return ''
  }

  const trimmed = input.trim()
  if (!trimmed || trimmed === '/' || trimmed === '~') {
    return ''
  }

  if (trimmed.length > 512 || trimmed.includes('\0')) {
    return null
  }

  const cleaned = trimmed.replace(/\\/g, '/').replace(/^~\/?/, '').replace(/^\/+/, '')
  if (!cleaned) {
    return ''
  }

  const stack: string[] = []
  for (const part of cleaned.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (stack.length > 0) stack.pop()
      continue
    }
    stack.push(part)
  }

  return stack.join('/')
}

function sanitizeEnvVars(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }

  const result: Record<string, string> = {}
  const entries = Object.entries(input as Record<string, unknown>)
  for (const [key, value] of entries) {
    if (Object.keys(result).length >= MAX_ENV_VARS) break
    if (!ENV_KEY_PATTERN.test(key)) continue
    if (typeof value !== 'string') continue
    if (value.length > MAX_ENV_VALUE_LENGTH) continue
    result[key] = value
  }

  return result
}

function resolveShell(shell: TerminalShell, command: string): { executable: string; args: string[] } {
  const isWindows = process.platform === 'win32'

  if (shell === 'bash') {
    if (isWindows) {
      return { executable: 'bash.exe', args: ['-lc', command] }
    }
    return { executable: '/bin/bash', args: ['-lc', command] }
  }

  if (isWindows) {
    return { executable: 'powershell.exe', args: ['-NoProfile', '-Command', command] }
  }

  return { executable: 'pwsh', args: ['-NoProfile', '-Command', command] }
}

function normalizeShell(input: unknown): TerminalShell | null {
  if (typeof input !== 'string') return null
  const normalized = input.toLowerCase()
  if (normalized === 'bash' || normalized === 'powershell') {
    return normalized
  }
  return null
}

function defaultShellForPlatform(): TerminalShell {
  return process.platform === 'win32' ? 'powershell' : 'bash'
}

function hasOwnKey(value: unknown, key: string): boolean {
  return !!value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key)
}

function pruneStaleSessions(now = Date.now()): void {
  for (const [sessionId, state] of terminalSessions.entries()) {
    if (now - state.updatedAt > SESSION_TTL_MS) {
      terminalSessions.delete(sessionId)
    }
  }
}

function normalizeSessionId(rawSessionId: unknown): string | null {
  if (typeof rawSessionId !== 'string') return null
  const trimmed = rawSessionId.trim()
  if (!trimmed) return null
  if (!SESSION_ID_PATTERN.test(trimmed)) {
    throw new TerminalExecutionRequestError(400, 'Invalid sessionId')
  }
  return trimmed
}

async function resolveExecutionContext(params: ExecuteTerminalCommandParams): Promise<{
  workspaceRoot: string
  executionCwd: string
  cwdRelative: string
  shell: TerminalShell
  env: Record<string, string>
  sessionId: string | null
}> {
  const workspaceId = String(params.workspaceId || '')
  if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
    throw new TerminalExecutionRequestError(400, 'Invalid workspaceId')
  }

  const sessionId = normalizeSessionId(params.sessionId)
  pruneStaleSessions()
  const existingSession = sessionId ? terminalSessions.get(sessionId) : undefined
  const validExistingSession = existingSession?.workspaceId === workspaceId ? existingSession : undefined

  const shellProvided = hasOwnKey(params, 'shell')
  const requestedShell = normalizeShell(params.shell)
  if (shellProvided && !requestedShell) {
    throw new TerminalExecutionRequestError(400, 'Invalid shell. Use bash or powershell.')
  }
  const shell = requestedShell || validExistingSession?.shell || defaultShellForPlatform()
  if (!ALLOWED_SHELLS.has(shell)) {
    throw new TerminalExecutionRequestError(400, 'Invalid shell. Use bash or powershell.')
  }

  const cwdProvided = hasOwnKey(params, 'cwd')
  const parsedCwd = cwdProvided ? sanitizeRequestedCwd(params.cwd) : null
  if (cwdProvided && parsedCwd === null) {
    throw new TerminalExecutionRequestError(400, 'Invalid cwd')
  }

  let cwdRelative = parsedCwd ?? validExistingSession?.cwdRelative ?? ''
  const userEnv = hasOwnKey(params, 'env')
    ? sanitizeEnvVars(params.env)
    : (validExistingSession?.env || {})

  const workspacesBase = path.resolve(process.cwd(), 'workspaces')
  const workspaceRoot = path.resolve(workspacesBase, workspaceId)
  if (!workspaceRoot.startsWith(workspacesBase + path.sep) && workspaceRoot !== workspacesBase) {
    throw new TerminalExecutionRequestError(400, 'Invalid workspace path')
  }

  await fs.mkdir(workspaceRoot, { recursive: true })

  let executionCwd = workspaceRoot
  if (cwdRelative) {
    const resolvedCwd = path.resolve(workspaceRoot, cwdRelative)
    if (!resolvedCwd.startsWith(workspaceRoot + path.sep) && resolvedCwd !== workspaceRoot) {
      throw new TerminalExecutionRequestError(400, 'Invalid cwd path')
    }

    try {
      const stat = await fs.stat(resolvedCwd)
      if (!stat.isDirectory()) {
        throw new TerminalExecutionRequestError(400, 'cwd must be a directory')
      }
      executionCwd = resolvedCwd
    } catch (error) {
      if (error instanceof TerminalExecutionRequestError) {
        throw error
      }

      if (cwdProvided) {
        throw new TerminalExecutionRequestError(400, 'cwd does not exist')
      }

      cwdRelative = ''
      executionCwd = workspaceRoot
    }
  }

  if (sessionId) {
    terminalSessions.set(sessionId, {
      workspaceId,
      cwdRelative,
      shell,
      env: userEnv,
      updatedAt: Date.now(),
    })
  }

  return {
    workspaceRoot,
    executionCwd,
    cwdRelative,
    shell,
    env: userEnv,
    sessionId,
  }
}

function assertCommandAllowed(command: string): void {
  if (!command || typeof command !== 'string') {
    throw new TerminalExecutionRequestError(400, 'Command is required')
  }

  const trimmed = command.trim()
  if (!trimmed) {
    throw new TerminalExecutionRequestError(400, 'Command is required')
  }

  if (trimmed.length > MAX_COMMAND_LENGTH) {
    throw new TerminalExecutionRequestError(400, 'Command exceeds maximum length')
  }

  const lowerCmd = trimmed.toLowerCase()
  if (BLOCKED_COMMANDS.some((blocked) => lowerCmd.includes(blocked))) {
    throw new TerminalExecutionRequestError(403, 'Command blocked for security')
  }
}

export async function executeTerminalCommand(
  params: ExecuteTerminalCommandParams
): Promise<ExecuteTerminalCommandResult> {
  const command = String(params.command || '')
  assertCommandAllowed(command)

  const context = await resolveExecutionContext(params)
  const shellCommand = resolveShell(context.shell, command)
  const timeoutMs = Math.max(1000, params.timeoutMs || 30000)

  return new Promise<ExecuteTerminalCommandResult>((resolve) => {
    let stdout = ''
    let stderr = ''
    let stdoutTruncated = false
    let stderrTruncated = false

    const child = spawn(shellCommand.executable, shellCommand.args, {
      cwd: context.executionCwd,
      env: { ...process.env, ...context.env, FORCE_COLOR: '0' },
      timeout: timeoutMs,
    })

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
      if (stdout.length > MAX_OUTPUT_LENGTH) {
        stdout = stdout.slice(0, MAX_OUTPUT_LENGTH)
        stdoutTruncated = true
        child.kill()
      }
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
      if (stderr.length > MAX_OUTPUT_LENGTH) {
        stderr = stderr.slice(0, MAX_OUTPUT_LENGTH)
        stderrTruncated = true
        child.kill()
      }
    })

    child.on('close', (exitCode) => {
      if (stdoutTruncated) {
        stdout += '\n... (output truncated)'
      }
      if (stderrTruncated) {
        stderr += '\n... (output truncated)'
      }

      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? -1,
        cwd: context.cwdRelative,
        shell: context.shell,
      })
    })

    child.on('error', (error) => {
      resolve({
        stdout,
        stderr: error.message,
        exitCode: -1,
        cwd: context.cwdRelative,
        shell: context.shell,
      })
    })
  })
}

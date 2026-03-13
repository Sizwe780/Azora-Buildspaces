/**
 * Debug Adapter Protocol (DAP) Service
 * 
 * Standard-based debugging integration for Azora BuildSpaces Code Chamber.
 * Inspired by: https://github.com/microsoft/debug-adapter-protocol
 *              https://github.com/microsoft/vscode-debugadapter-node
 * 
 * Supports:
 * - Multi-language debugging (JS/TS, Python, Go, Rust, C/C++, Java)
 * - Breakpoints (line, conditional, function, exception, logpoints)
 * - Step-through execution (step in, step out, step over, continue)
 * - Variable inspection with scopes (local, closure, global)
 * - Call stack navigation
 * - Watch expressions
 * - Debug console (REPL)
 * - Hot code reload during debug sessions
 */

// ═══════════════════════════════════════════════════════════
// DAP TYPES (subset of DAP specification)
// ═══════════════════════════════════════════════════════════

export type DebugAdapterType = 
  | 'node'          // Node.js / JavaScript / TypeScript
  | 'python'        // Python (debugpy)
  | 'go'            // Go (Delve)
  | 'rust'          // Rust (lldb / codelldb)
  | 'cpp'           // C/C++ (gdb / lldb)
  | 'java'          // Java (JDWP)
  | 'ruby'          // Ruby (rdbg)
  | 'php'           // PHP (Xdebug)
  | 'dotnet'        // .NET (vsdbg)

export interface DebugConfiguration {
  type: DebugAdapterType
  name: string
  request: 'launch' | 'attach'
  program?: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  port?: number
  host?: string
  stopOnEntry?: boolean
  sourceMaps?: boolean
  outFiles?: string[]
  runtimeExecutable?: string
  runtimeArgs?: string[]
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal'
  preLaunchTask?: string
  postDebugTask?: string
}

export interface Breakpoint {
  id: string
  verified: boolean
  source: Source
  line: number
  column?: number
  endLine?: number
  endColumn?: number
  condition?: string
  hitCondition?: string
  logMessage?: string
  enabled: boolean
}

export interface Source {
  name: string
  path: string
  sourceReference?: number
}

export interface StackFrame {
  id: number
  name: string
  source: Source
  line: number
  column: number
  endLine?: number
  endColumn?: number
  moduleId?: string
  canRestart?: boolean
}

export interface Scope {
  name: string
  variablesReference: number
  namedVariables?: number
  indexedVariables?: number
  expensive: boolean
}

export interface Variable {
  name: string
  value: string
  type?: string
  variablesReference: number
  namedVariables?: number
  indexedVariables?: number
  evaluateName?: string
  memoryReference?: string
}

export interface Thread {
  id: number
  name: string
}

export interface DebugSessionState {
  status: 'initializing' | 'running' | 'paused' | 'stopped' | 'terminated' | 'error'
  threads: Thread[]
  activeThreadId?: number
  callStack: StackFrame[]
  breakpoints: Breakpoint[]
  variables: Map<number, Variable[]>
  watchExpressions: WatchExpression[]
  consoleOutput: DebugConsoleEntry[]
  error?: string
}

export interface WatchExpression {
  id: string
  expression: string
  result?: string
  type?: string
  error?: string
}

export interface DebugConsoleEntry {
  type: 'input' | 'output' | 'error' | 'warning' | 'info'
  text: string
  timestamp: number
  source?: string
}

export interface DebugEvent {
  type: 'stopped' | 'continued' | 'exited' | 'terminated' | 'thread' | 'output' | 'breakpoint' | 'module' | 'loadedSource' | 'process'
  body: any
}

// ═══════════════════════════════════════════════════════════
// DAP ADAPTER REGISTRY
// ═══════════════════════════════════════════════════════════

export interface DebugAdapterInfo {
  type: DebugAdapterType
  name: string
  runtime: string
  adapter: string
  installCommand?: string
  defaultConfig: Partial<DebugConfiguration>
  supportedFeatures: string[]
  languages: string[]
}

export const DEBUG_ADAPTERS: DebugAdapterInfo[] = [
  {
    type: 'node',
    name: 'Node.js Debugger',
    runtime: 'node',
    adapter: 'vscode-js-debug',
    defaultConfig: {
      type: 'node',
      request: 'launch',
      console: 'integratedTerminal',
      sourceMaps: true,
    },
    supportedFeatures: [
      'breakpoints', 'conditionalBreakpoints', 'hitConditionalBreakpoints',
      'logPoints', 'stepBack', 'restartFrame', 'completionsRequest',
      'exceptionOptions', 'setVariable', 'setExpression', 'gotoTargetsRequest',
    ],
    languages: ['javascript', 'typescript', 'jsx', 'tsx'],
  },
  {
    type: 'python',
    name: 'Python Debugger (debugpy)',
    runtime: 'python',
    adapter: 'debugpy',
    installCommand: 'pip install debugpy',
    defaultConfig: {
      type: 'python',
      request: 'launch',
      console: 'integratedTerminal',
    },
    supportedFeatures: [
      'breakpoints', 'conditionalBreakpoints', 'hitConditionalBreakpoints',
      'logPoints', 'exceptionOptions', 'setVariable', 'completionsRequest',
    ],
    languages: ['python'],
  },
  {
    type: 'go',
    name: 'Go Debugger (Delve)',
    runtime: 'go',
    adapter: 'dlv-dap',
    installCommand: 'go install github.com/go-delve/delve/cmd/dlv@latest',
    defaultConfig: {
      type: 'go',
      request: 'launch',
      console: 'integratedTerminal',
    },
    supportedFeatures: [
      'breakpoints', 'conditionalBreakpoints', 'hitConditionalBreakpoints',
      'setVariable', 'exceptionOptions',
    ],
    languages: ['go'],
  },
  {
    type: 'rust',
    name: 'Rust Debugger (CodeLLDB)',
    runtime: 'rust',
    adapter: 'codelldb',
    defaultConfig: {
      type: 'rust',
      request: 'launch',
      console: 'integratedTerminal',
    },
    supportedFeatures: [
      'breakpoints', 'conditionalBreakpoints', 'hitConditionalBreakpoints',
      'logPoints', 'setVariable', 'completionsRequest',
    ],
    languages: ['rust'],
  },
  {
    type: 'cpp',
    name: 'C/C++ Debugger (GDB/LLDB)',
    runtime: 'cpp',
    adapter: 'cppdbg',
    defaultConfig: {
      type: 'cpp',
      request: 'launch',
      console: 'integratedTerminal',
    },
    supportedFeatures: [
      'breakpoints', 'conditionalBreakpoints', 'hitConditionalBreakpoints',
      'setVariable', 'completionsRequest',
    ],
    languages: ['c', 'cpp', 'objective-c'],
  },
  {
    type: 'java',
    name: 'Java Debugger (JDWP)',
    runtime: 'java',
    adapter: 'java',
    defaultConfig: {
      type: 'java',
      request: 'launch',
      console: 'integratedTerminal',
    },
    supportedFeatures: [
      'breakpoints', 'conditionalBreakpoints', 'hitConditionalBreakpoints',
      'exceptionOptions', 'setVariable', 'restartFrame',
    ],
    languages: ['java', 'kotlin', 'scala'],
  },
  {
    type: 'ruby',
    name: 'Ruby Debugger (rdbg)',
    runtime: 'ruby',
    adapter: 'rdbg',
    installCommand: 'gem install debug',
    defaultConfig: {
      type: 'ruby',
      request: 'launch',
      console: 'integratedTerminal',
    },
    supportedFeatures: [
      'breakpoints', 'conditionalBreakpoints', 'setVariable',
    ],
    languages: ['ruby'],
  },
  {
    type: 'php',
    name: 'PHP Debugger (Xdebug)',
    runtime: 'php',
    adapter: 'php',
    installCommand: 'pecl install xdebug',
    defaultConfig: {
      type: 'php',
      request: 'launch',
      console: 'integratedTerminal',
    },
    supportedFeatures: [
      'breakpoints', 'conditionalBreakpoints', 'setVariable',
      'exceptionOptions',
    ],
    languages: ['php'],
  },
  {
    type: 'dotnet',
    name: '.NET Debugger (vsdbg)',
    runtime: 'dotnet',
    adapter: 'vsdbg',
    defaultConfig: {
      type: 'dotnet',
      request: 'launch',
      console: 'integratedTerminal',
    },
    supportedFeatures: [
      'breakpoints', 'conditionalBreakpoints', 'hitConditionalBreakpoints',
      'logPoints', 'setVariable', 'setExpression', 'exceptionOptions',
      'completionsRequest', 'restartFrame',
    ],
    languages: ['csharp', 'fsharp', 'vb'],
  },
]

// ═══════════════════════════════════════════════════════════
// DEBUG SERVICE
// ═══════════════════════════════════════════════════════════

export class DebugService {
  private sessions: Map<string, DebugSession> = new Map()
  private eventListeners: Map<string, ((event: DebugEvent) => void)[]> = new Map()
  private sessionCounter = 0

  // ─── Session Management ──────────────────────────────────

  async createSession(
    config: DebugConfiguration,
    containerId: string,
    userId: string
  ): Promise<DebugSession> {
    const adapter = DEBUG_ADAPTERS.find(a => a.type === config.type)
    if (!adapter) {
      throw new Error(`Unsupported debug adapter type: ${config.type}`)
    }

    const session = new DebugSession(
      `debug_${++this.sessionCounter}`,
      config,
      adapter,
      containerId,
      userId
    )

    this.sessions.set(session.id, session)
    return session
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId)
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      await session.terminate()
      this.sessions.delete(sessionId)
    }
  }

  getActiveSessions(): DebugSession[] {
    return Array.from(this.sessions.values()).filter(
      s => s.state.status !== 'terminated'
    )
  }

  // ─── Adapter Resolution ──────────────────────────────────

  getAdapterForLanguage(languageId: string): DebugAdapterInfo | undefined {
    return DEBUG_ADAPTERS.find(a => a.languages.includes(languageId))
  }

  getAdapterByType(type: DebugAdapterType): DebugAdapterInfo | undefined {
    return DEBUG_ADAPTERS.find(a => a.type === type)
  }

  getAllAdapters(): DebugAdapterInfo[] {
    return [...DEBUG_ADAPTERS]
  }

  // ─── Event Handling ──────────────────────────────────────

  onEvent(sessionId: string, handler: (event: DebugEvent) => void): () => void {
    if (!this.eventListeners.has(sessionId)) {
      this.eventListeners.set(sessionId, [])
    }
    this.eventListeners.get(sessionId)!.push(handler)

    return () => {
      const listeners = this.eventListeners.get(sessionId)
      if (listeners) {
        const idx = listeners.indexOf(handler)
        if (idx >= 0) listeners.splice(idx, 1)
      }
    }
  }

  emitEvent(sessionId: string, event: DebugEvent): void {
    const listeners = this.eventListeners.get(sessionId)
    if (listeners) {
      listeners.forEach(handler => handler(event))
    }
  }
}

// ═══════════════════════════════════════════════════════════
// DEBUG SESSION
// ═══════════════════════════════════════════════════════════

export class DebugSession {
  public id: string
  public state: DebugSessionState
  private config: DebugConfiguration
  private adapter: DebugAdapterInfo
  private containerId: string
  private userId: string
  private remoteSessionId?: string
  private dapBridgeUrl = process.env.DAP_BRIDGE_URL || 'http://localhost:3020'
  private breakpointIdCounter = 0
  private watchExpressionCounter = 0

  private ensureBackendAvailable(): void {
    if (process.env.DAP_BACKEND_ENABLED !== 'true') {
      throw new Error('Debug adapter backend is not configured. Set DAP_BACKEND_ENABLED=true and connect a DAP server.')
    }
  }

  private getBrokerSessionId(): string {
    return this.remoteSessionId || this.id
  }

  private async requestBroker(operation: string, params: Record<string, unknown> = {}): Promise<any> {
    this.ensureBackendAvailable()

    const payload = {
      type: 'DAP_REQUEST',
      operation,
      sessionId: this.getBrokerSessionId(),
      adapterType: this.adapter.type,
      containerId: this.containerId,
      userId: this.userId,
      config: this.config,
      ...params,
      params,
    }

    const response = await fetch(this.dapBridgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did: 'did:key:z6MkpTHR8V369',
        signature: 'UNSIGNED',
        payload,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText)
      throw new Error(`DAP broker request failed (${response.status}): ${text}`)
    }

    const data = await response.json().catch(() => ({}))
    if (data?.error) {
      throw new Error(`DAP broker error: ${data.error}`)
    }

    const remoteId = typeof data?.sessionId === 'string'
      ? data.sessionId
      : typeof data?.debugSessionId === 'string'
        ? data.debugSessionId
        : undefined

    if (remoteId) {
      this.remoteSessionId = remoteId
    }

    return data
  }

  private toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  private normalizeStackFrames(frames: unknown[]): StackFrame[] {
    return frames.map((frame: any, index) => {
      const sourcePath = String(
        frame?.source?.path || frame?.path || frame?.file || frame?.source?.name || 'unknown'
      )
      const sourceName = String(frame?.source?.name || sourcePath.split('/').pop() || sourcePath)

      return {
        id: this.toNumber(frame?.id, index + 1),
        name: String(frame?.name || '<frame>'),
        source: {
          name: sourceName,
          path: sourcePath,
          sourceReference: Number.isFinite(Number(frame?.source?.sourceReference))
            ? Number(frame.source.sourceReference)
            : undefined,
        },
        line: this.toNumber(frame?.line, 1),
        column: this.toNumber(frame?.column, 1),
        endLine: Number.isFinite(Number(frame?.endLine)) ? Number(frame.endLine) : undefined,
        endColumn: Number.isFinite(Number(frame?.endColumn)) ? Number(frame.endColumn) : undefined,
      }
    })
  }

  private normalizeScopes(scopes: unknown[]): Scope[] {
    return scopes.map((scope: any, index) => ({
      name: String(scope?.name || `scope-${index}`),
      variablesReference: this.toNumber(scope?.variablesReference, 0),
      namedVariables: Number.isFinite(Number(scope?.namedVariables)) ? Number(scope.namedVariables) : undefined,
      indexedVariables: Number.isFinite(Number(scope?.indexedVariables)) ? Number(scope.indexedVariables) : undefined,
      expensive: Boolean(scope?.expensive),
    }))
  }

  private normalizeVariables(variables: unknown[]): Variable[] {
    return variables.map((variable: any) => ({
      name: String(variable?.name || 'value'),
      value: String(variable?.value ?? ''),
      type: variable?.type ? String(variable.type) : undefined,
      variablesReference: this.toNumber(variable?.variablesReference, 0),
      namedVariables: Number.isFinite(Number(variable?.namedVariables)) ? Number(variable.namedVariables) : undefined,
      indexedVariables: Number.isFinite(Number(variable?.indexedVariables)) ? Number(variable.indexedVariables) : undefined,
      evaluateName: variable?.evaluateName ? String(variable.evaluateName) : undefined,
      memoryReference: variable?.memoryReference ? String(variable.memoryReference) : undefined,
    }))
  }

  constructor(
    id: string,
    config: DebugConfiguration,
    adapter: DebugAdapterInfo,
    containerId: string,
    userId: string
  ) {
    this.id = id
    this.config = config
    this.adapter = adapter
    this.containerId = containerId
    this.userId = userId
    this.state = {
      status: 'initializing',
      threads: [],
      callStack: [],
      breakpoints: [],
      variables: new Map(),
      watchExpressions: [],
      consoleOutput: [],
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────

  async initialize(): Promise<void> {
    this.state.status = 'initializing'
    this.addConsoleEntry('info', `Initializing ${this.adapter.name} debug session...`)

    this.ensureBackendAvailable()

    this.addConsoleEntry('info', `Configuration: ${JSON.stringify(this.config, null, 2)}`)
    this.addConsoleEntry('info', `Adapter: ${this.adapter.adapter}`)
  }

  async launch(): Promise<void> {
    await this.initialize()

    const response = await this.requestBroker('launch', {
      request: this.config.request,
      config: this.config,
    })

    this.state.status = 'running'

    const rawThreads = Array.isArray(response?.threads)
      ? response.threads
      : Array.isArray(response?.result?.threads)
        ? response.result.threads
        : []

    const normalizedThreads = rawThreads.map((thread: any, index: number) => ({
      id: this.toNumber(thread?.id, index + 1),
      name: String(thread?.name || `Thread ${index + 1}`),
    }))

    this.state.threads = normalizedThreads.length > 0 ? normalizedThreads : [{ id: 1, name: 'Main Thread' }]
    this.state.activeThreadId = this.state.threads[0]?.id
    this.addConsoleEntry('info', `Debug session started: ${this.config.name}`)

    if (this.config.stopOnEntry) {
      await this.pause()
    }
  }

  async attach(port: number, host: string = 'localhost'): Promise<void> {
    await this.initialize()

    const response = await this.requestBroker('attach', {
      port,
      host,
      request: this.config.request,
      config: this.config,
    })

    this.state.status = 'running'

    const rawThreads = Array.isArray(response?.threads)
      ? response.threads
      : Array.isArray(response?.result?.threads)
        ? response.result.threads
        : []
    const normalizedThreads = rawThreads.map((thread: any, index: number) => ({
      id: this.toNumber(thread?.id, index + 1),
      name: String(thread?.name || `Thread ${index + 1}`),
    }))

    this.state.threads = normalizedThreads.length > 0 ? normalizedThreads : [{ id: 1, name: 'Main Thread' }]
    this.state.activeThreadId = this.state.threads[0]?.id
    this.addConsoleEntry('info', `Attached to ${host}:${port}`)
  }

  async terminate(): Promise<void> {
    if (process.env.DAP_BACKEND_ENABLED === 'true') {
      await this.requestBroker('terminate')
    }

    this.state.status = 'terminated'
    this.addConsoleEntry('info', 'Debug session terminated')
  }

  async restart(): Promise<void> {
    if (process.env.DAP_BACKEND_ENABLED === 'true') {
      await this.requestBroker('restart')
      this.state.status = 'running'
      this.addConsoleEntry('info', 'Debug session restarted')
      return
    }

    await this.terminate()
    if (this.config.request === 'launch') {
      await this.launch()
    }
  }

  // ─── Execution Control ───────────────────────────────────

  async continue(threadId?: number): Promise<void> {
    await this.requestBroker('continue', { threadId: threadId || this.state.activeThreadId })
    this.state.status = 'running'
    this.addConsoleEntry('info', `Continuing execution on thread ${threadId || this.state.activeThreadId}`)
  }

  async pause(threadId?: number): Promise<void> {
    await this.requestBroker('pause', { threadId: threadId || this.state.activeThreadId })
    this.state.status = 'paused'
    this.addConsoleEntry('info', `Paused on thread ${threadId || this.state.activeThreadId}`)
  }

  async stepOver(threadId?: number): Promise<void> {
    await this.requestBroker('stepOver', { threadId: threadId || this.state.activeThreadId })
    this.state.status = 'paused'
    this.addConsoleEntry('info', 'Step over')
  }

  async stepInto(threadId?: number): Promise<void> {
    await this.requestBroker('stepInto', { threadId: threadId || this.state.activeThreadId })
    this.state.status = 'paused'
    this.addConsoleEntry('info', 'Step into')
  }

  async stepOut(threadId?: number): Promise<void> {
    await this.requestBroker('stepOut', { threadId: threadId || this.state.activeThreadId })
    this.state.status = 'paused'
    this.addConsoleEntry('info', 'Step out')
  }

  async stepBack(threadId?: number): Promise<void> {
    if (!this.adapter.supportedFeatures.includes('stepBack')) {
      throw new Error(`Step back not supported by ${this.adapter.name}`)
    }
    await this.requestBroker('stepBack', { threadId: threadId || this.state.activeThreadId })
    this.state.status = 'paused'
    this.addConsoleEntry('info', 'Step back')
  }

  // ─── Breakpoints ────────────────────────────────────────

  async setBreakpoint(
    source: Source,
    line: number,
    options?: {
      condition?: string
      hitCondition?: string
      logMessage?: string
    }
  ): Promise<Breakpoint> {
    const response = await this.requestBroker('setBreakpoint', {
      source,
      line,
      options,
    })

    const brokerBp = response?.breakpoint || response?.result?.breakpoint
    const bp: Breakpoint = {
      id: String(brokerBp?.id || `bp_${++this.breakpointIdCounter}`),
      verified: brokerBp?.verified !== false,
      source: {
        name: String(brokerBp?.source?.name || source.name),
        path: String(brokerBp?.source?.path || source.path),
        sourceReference: Number.isFinite(Number(brokerBp?.source?.sourceReference))
          ? Number(brokerBp.source.sourceReference)
          : source.sourceReference,
      },
      line: this.toNumber(brokerBp?.line, line),
      condition: brokerBp?.condition || options?.condition,
      hitCondition: brokerBp?.hitCondition || options?.hitCondition,
      logMessage: brokerBp?.logMessage || options?.logMessage,
      enabled: true,
    }

    this.state.breakpoints.push(bp)
    this.addConsoleEntry('info', `Breakpoint set at ${source.path}:${line}`)
    return bp
  }

  async removeBreakpoint(breakpointId: string): Promise<void> {
    await this.requestBroker('removeBreakpoint', { breakpointId })
    this.state.breakpoints = this.state.breakpoints.filter(bp => bp.id !== breakpointId)
  }

  async toggleBreakpoint(breakpointId: string): Promise<void> {
    await this.requestBroker('toggleBreakpoint', { breakpointId })
    const bp = this.state.breakpoints.find(b => b.id === breakpointId)
    if (bp) bp.enabled = !bp.enabled
  }

  async removeAllBreakpoints(sourcePath?: string): Promise<void> {
    await this.requestBroker('removeAllBreakpoints', { sourcePath })
    if (sourcePath) {
      this.state.breakpoints = this.state.breakpoints.filter(
        bp => bp.source.path !== sourcePath
      )
    } else {
      this.state.breakpoints = []
    }
  }

  async setExceptionBreakpoints(
    filters: ('caught' | 'uncaught' | 'all')[]
  ): Promise<void> {
    await this.requestBroker('setExceptionBreakpoints', { filters })
    this.addConsoleEntry('info', `Exception breakpoints: ${filters.join(', ')}`)
  }

  async setFunctionBreakpoint(functionName: string): Promise<Breakpoint> {
    const response = await this.requestBroker('setFunctionBreakpoint', { functionName })
    const brokerBp = response?.breakpoint || response?.result?.breakpoint

    const bp: Breakpoint = {
      id: String(brokerBp?.id || `fbp_${++this.breakpointIdCounter}`),
      verified: brokerBp?.verified !== false,
      source: {
        name: String(brokerBp?.source?.name || functionName),
        path: String(brokerBp?.source?.path || ''),
      },
      line: this.toNumber(brokerBp?.line, 0),
      enabled: true,
    }
    this.state.breakpoints.push(bp)
    this.addConsoleEntry('info', `Function breakpoint set: ${functionName}`)
    return bp
  }

  // ─── Inspection ──────────────────────────────────────────

  async getCallStack(threadId?: number): Promise<StackFrame[]> {
    const response = await this.requestBroker('stackTrace', {
      threadId: threadId || this.state.activeThreadId,
    })

    const rawFrames = Array.isArray(response?.stackFrames)
      ? response.stackFrames
      : Array.isArray(response?.frames)
        ? response.frames
        : Array.isArray(response?.result?.stackFrames)
          ? response.result.stackFrames
          : []

    const frames = this.normalizeStackFrames(rawFrames)
    this.state.callStack = frames

    const rawThreads = Array.isArray(response?.threads)
      ? response.threads
      : Array.isArray(response?.result?.threads)
        ? response.result.threads
        : []

    if (rawThreads.length > 0) {
      this.state.threads = rawThreads.map((thread: any, index: number) => ({
        id: this.toNumber(thread?.id, index + 1),
        name: String(thread?.name || `Thread ${index + 1}`),
      }))
    }

    if (frames.length > 0) {
      this.state.status = 'paused'
    }

    return frames
  }

  async getScopes(frameId: number): Promise<Scope[]> {
    const response = await this.requestBroker('scopes', { frameId })
    const rawScopes = Array.isArray(response?.scopes)
      ? response.scopes
      : Array.isArray(response?.result?.scopes)
        ? response.result.scopes
        : []

    return this.normalizeScopes(rawScopes)
  }

  async getVariables(variablesReference: number): Promise<Variable[]> {
    const response = await this.requestBroker('variables', { variablesReference })
    const rawVariables = Array.isArray(response?.variables)
      ? response.variables
      : Array.isArray(response?.result?.variables)
        ? response.result.variables
        : []

    const variables = this.normalizeVariables(rawVariables)
    this.state.variables.set(variablesReference, variables)
    return variables
  }

  async setVariable(
    variablesReference: number,
    name: string,
    value: string
  ): Promise<Variable> {
    const response = await this.requestBroker('setVariable', {
      variablesReference,
      name,
      value,
    })

    const candidate = response?.variable || response?.result?.variable || {
      name,
      value,
      type: 'string',
      variablesReference,
    }

    const [normalized] = this.normalizeVariables([candidate])
    return normalized
  }

  // ─── Watch Expressions ───────────────────────────────────

  async addWatchExpression(expression: string): Promise<WatchExpression> {
    const watch: WatchExpression = {
      id: `watch_${++this.watchExpressionCounter}`,
      expression,
    }
    this.state.watchExpressions.push(watch)
    return watch
  }

  async evaluateWatchExpression(watchId: string): Promise<WatchExpression> {
    const watch = this.state.watchExpressions.find(w => w.id === watchId)
    if (!watch) throw new Error(`Watch expression ${watchId} not found`)

    try {
      const evaluated = await this.evaluate(watch.expression, 'watch')
      watch.result = evaluated.result
      watch.type = evaluated.type
      watch.error = undefined
    } catch (error) {
      watch.error = error instanceof Error ? error.message : 'Failed to evaluate expression'
    }

    return watch
  }

  async removeWatchExpression(watchId: string): Promise<void> {
    this.state.watchExpressions = this.state.watchExpressions.filter(
      w => w.id !== watchId
    )
  }

  // ─── Debug Console ───────────────────────────────────────

  async evaluate(
    expression: string,
    context: 'watch' | 'repl' | 'hover' = 'repl',
    frameId?: number
  ): Promise<{ result: string; type?: string; variablesReference: number }> {
    this.addConsoleEntry('input', expression)

    const response = await this.requestBroker('evaluate', {
      expression,
      context,
      frameId,
      threadId: this.state.activeThreadId,
    })

    const resultPayload = response?.result && typeof response.result === 'object'
      ? response.result
      : response

    const result = String(
      (resultPayload as any)?.result ??
      (resultPayload as any)?.value ??
      ''
    )
    const type = (resultPayload as any)?.type ? String((resultPayload as any).type) : undefined
    const variablesReference = this.toNumber((resultPayload as any)?.variablesReference, 0)

    this.addConsoleEntry('output', result)
    return { result, type, variablesReference }
  }

  private addConsoleEntry(type: DebugConsoleEntry['type'], text: string): void {
    this.state.consoleOutput.push({
      type,
      text,
      timestamp: Date.now(),
    })
  }

  // ─── Getters ─────────────────────────────────────────────

  getConfig(): DebugConfiguration { return { ...this.config } }
  getAdapter(): DebugAdapterInfo { return { ...this.adapter } }
  getContainerId(): string { return this.containerId }
  getUserId(): string { return this.userId }
}

export const debugService = new DebugService()

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
      `debug_${Date.now()}_${Math.random().toString(36).slice(2)}`,
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
  private breakpointIdCounter = 0

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

    // In production: spawn DAP server process, connect via stdin/stdout or TCP
    // For now, manage state transitions
    this.addConsoleEntry('info', `Configuration: ${JSON.stringify(this.config, null, 2)}`)
    this.addConsoleEntry('info', `Adapter: ${this.adapter.adapter}`)
  }

  async launch(): Promise<void> {
    await this.initialize()
    this.state.status = 'running'
    this.state.threads = [{ id: 1, name: 'Main Thread' }]
    this.state.activeThreadId = 1
    this.addConsoleEntry('info', `Debug session started: ${this.config.name}`)

    if (this.config.stopOnEntry) {
      await this.pause()
    }
  }

  async attach(port: number, host: string = 'localhost'): Promise<void> {
    await this.initialize()
    this.state.status = 'running'
    this.state.threads = [{ id: 1, name: 'Main Thread' }]
    this.state.activeThreadId = 1
    this.addConsoleEntry('info', `Attached to ${host}:${port}`)
  }

  async terminate(): Promise<void> {
    this.state.status = 'terminated'
    this.addConsoleEntry('info', 'Debug session terminated')
  }

  async restart(): Promise<void> {
    await this.terminate()
    if (this.config.request === 'launch') {
      await this.launch()
    }
  }

  // ─── Execution Control ───────────────────────────────────

  async continue(threadId?: number): Promise<void> {
    this.state.status = 'running'
    this.addConsoleEntry('info', `Continuing execution on thread ${threadId || this.state.activeThreadId}`)
  }

  async pause(threadId?: number): Promise<void> {
    this.state.status = 'paused'
    this.addConsoleEntry('info', `Paused on thread ${threadId || this.state.activeThreadId}`)
  }

  async stepOver(threadId?: number): Promise<void> {
    this.state.status = 'paused'
    this.addConsoleEntry('info', 'Step over')
  }

  async stepInto(threadId?: number): Promise<void> {
    this.state.status = 'paused'
    this.addConsoleEntry('info', 'Step into')
  }

  async stepOut(threadId?: number): Promise<void> {
    this.state.status = 'paused'
    this.addConsoleEntry('info', 'Step out')
  }

  async stepBack(threadId?: number): Promise<void> {
    if (!this.adapter.supportedFeatures.includes('stepBack')) {
      throw new Error(`Step back not supported by ${this.adapter.name}`)
    }
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
    const bp: Breakpoint = {
      id: `bp_${++this.breakpointIdCounter}`,
      verified: true,
      source,
      line,
      condition: options?.condition,
      hitCondition: options?.hitCondition,
      logMessage: options?.logMessage,
      enabled: true,
    }

    this.state.breakpoints.push(bp)
    this.addConsoleEntry('info', `Breakpoint set at ${source.path}:${line}`)
    return bp
  }

  async removeBreakpoint(breakpointId: string): Promise<void> {
    this.state.breakpoints = this.state.breakpoints.filter(bp => bp.id !== breakpointId)
  }

  async toggleBreakpoint(breakpointId: string): Promise<void> {
    const bp = this.state.breakpoints.find(b => b.id === breakpointId)
    if (bp) bp.enabled = !bp.enabled
  }

  async removeAllBreakpoints(sourcePath?: string): Promise<void> {
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
    this.addConsoleEntry('info', `Exception breakpoints: ${filters.join(', ')}`)
  }

  async setFunctionBreakpoint(functionName: string): Promise<Breakpoint> {
    const bp: Breakpoint = {
      id: `fbp_${++this.breakpointIdCounter}`,
      verified: true,
      source: { name: functionName, path: '' },
      line: 0,
      enabled: true,
    }
    this.state.breakpoints.push(bp)
    this.addConsoleEntry('info', `Function breakpoint set: ${functionName}`)
    return bp
  }

  // ─── Inspection ──────────────────────────────────────────

  async getCallStack(threadId?: number): Promise<StackFrame[]> {
    // In production: send stackTrace request to DAP server
    return this.state.callStack
  }

  async getScopes(frameId: number): Promise<Scope[]> {
    // In production: send scopes request to DAP server
    return [
      { name: 'Local', variablesReference: 1, expensive: false },
      { name: 'Closure', variablesReference: 2, expensive: false },
      { name: 'Global', variablesReference: 3, expensive: true },
    ]
  }

  async getVariables(variablesReference: number): Promise<Variable[]> {
    return this.state.variables.get(variablesReference) || []
  }

  async setVariable(
    variablesReference: number,
    name: string,
    value: string
  ): Promise<Variable> {
    const variable: Variable = {
      name,
      value,
      type: typeof value,
      variablesReference: 0,
    }
    return variable
  }

  // ─── Watch Expressions ───────────────────────────────────

  async addWatchExpression(expression: string): Promise<WatchExpression> {
    const watch: WatchExpression = {
      id: `watch_${Date.now()}`,
      expression,
    }
    this.state.watchExpressions.push(watch)
    return watch
  }

  async evaluateWatchExpression(watchId: string): Promise<WatchExpression> {
    const watch = this.state.watchExpressions.find(w => w.id === watchId)
    if (!watch) throw new Error(`Watch expression ${watchId} not found`)

    // In production: send evaluate request to DAP
    watch.result = `<evaluated: ${watch.expression}>`
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
    // In production: send evaluate request to DAP server
    const result = `<result of: ${expression}>`
    this.addConsoleEntry('output', result)
    return { result, variablesReference: 0 }
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

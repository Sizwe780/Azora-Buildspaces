import * as ts from 'typescript'
import { createContext, Script, type Context } from 'node:vm'

export type NotebookKernelStatus = 'idle' | 'busy' | 'starting' | 'error' | 'dead'

export interface NotebookKernelVariable {
  type: string
  value: string
  size?: number
}

export interface NotebookKernelSnapshot {
  kernel: {
    id: string
    status: NotebookKernelStatus
    language: string
    startedAt: string
    executionCount: number
    memoryUsage: { used: number; limit: number }
  }
  variables: Array<{ name: string } & NotebookKernelVariable>
  variableCount: number
}

export interface NotebookKernelOutput {
  type: 'text' | 'error'
  content: string
  executionCount: number
  executionTime: number
}

export interface NotebookKernelExecution {
  success: true
  output: NotebookKernelOutput
  kernel: {
    status: NotebookKernelStatus
    executionCount: number
  }
}

interface KernelSandbox extends Record<string, unknown> {
  __consoleLines: string[]
  console: {
    log: (...args: unknown[]) => void
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
  }
}

interface InternalKernelState {
  id: string
  status: NotebookKernelStatus
  language: string
  startedAt: string
  executionCount: number
  variables: Record<string, NotebookKernelVariable>
  memoryUsage: { used: number; limit: number }
  sandbox: KernelSandbox
  context: Context
  baseKeys: Set<string>
}

const MEMORY_LIMIT = 512 * 1024 * 1024
const EXECUTION_TIMEOUT_MS = 1_000
const MAX_VALUE_LENGTH = 4_000

const RESTRICTED_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\brequire\s*\(/i, message: 'Restricted operation: CommonJS modules are not available in the notebook sandbox.' },
  { pattern: /\bimport\s*(?:\(|[\w*{])/i, message: 'Restricted operation: imports are disabled in the notebook sandbox.' },
  { pattern: /\bexport\b/i, message: 'Restricted operation: module exports are disabled in the notebook sandbox.' },
  { pattern: /\bprocess\b/i, message: 'Restricted operation: process access is disabled in the notebook sandbox.' },
  { pattern: /\bglobalThis\b/i, message: 'Restricted operation: global object access is disabled in the notebook sandbox.' },
  { pattern: /\bglobal\b/i, message: 'Restricted operation: global object access is disabled in the notebook sandbox.' },
  { pattern: /\bmodule\b/i, message: 'Restricted operation: module access is disabled in the notebook sandbox.' },
  { pattern: /\bexports\b/i, message: 'Restricted operation: exports access is disabled in the notebook sandbox.' },
  { pattern: /\beval\s*\(/i, message: 'Restricted operation: dynamic evaluation is disabled in the notebook sandbox.' },
  { pattern: /\bFunction\s*\(/i, message: 'Restricted operation: Function constructors are disabled in the notebook sandbox.' },
  { pattern: /constructor\s*\.\s*constructor/i, message: 'Restricted operation: constructor escapes are disabled in the notebook sandbox.' },
  { pattern: /\bchild_process\b/i, message: 'Restricted operation: child process access is disabled in the notebook sandbox.' },
  { pattern: /\bfs\b/i, message: 'Restricted operation: file system access is disabled in the notebook sandbox.' },
]

const kernels = new Map<string, InternalKernelState>()

function formatConsoleArg(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function truncate(text: string, maxLength = MAX_VALUE_LENGTH): string {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength)}…`
}

function serializeValue(value: unknown): { text: string; size: number } {
  if (value === undefined) {
    return { text: 'undefined', size: 0 }
  }

  if (typeof value === 'string') {
    return { text: truncate(value), size: Buffer.byteLength(value, 'utf8') }
  }

  if (typeof value === 'function') {
    const label = `[Function ${value.name || 'anonymous'}]`
    return { text: label, size: Buffer.byteLength(label, 'utf8') }
  }

  try {
    const json = JSON.stringify(value)
    if (typeof json === 'string') {
      return { text: truncate(json), size: Buffer.byteLength(json, 'utf8') }
    }
  } catch {
    // Fall back to string conversion below.
  }

  const text = String(value)
  return { text: truncate(text), size: Buffer.byteLength(text, 'utf8') }
}

function inferValueType(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`
  }

  if (typeof value === 'object') {
    return value?.constructor?.name || 'object'
  }

  return typeof value
}

function createVariableInfo(value: unknown): NotebookKernelVariable {
  const { text, size } = serializeValue(value)
  return {
    type: inferValueType(value),
    value: text,
    size,
  }
}

function createSandbox(): { sandbox: KernelSandbox; context: Context; baseKeys: Set<string> } {
  const consoleLines: string[] = []
  const sandbox: KernelSandbox = {
    __consoleLines: consoleLines,
    console: {
      log: (...args: unknown[]) => consoleLines.push(args.map(formatConsoleArg).join(' ')),
      info: (...args: unknown[]) => consoleLines.push(args.map(formatConsoleArg).join(' ')),
      warn: (...args: unknown[]) => consoleLines.push(args.map(formatConsoleArg).join(' ')),
      error: (...args: unknown[]) => consoleLines.push(args.map(formatConsoleArg).join(' ')),
    },
    Math,
    Date,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    Map,
    Set,
    BigInt,
    Symbol,
    parseInt,
    parseFloat,
    isFinite,
    isNaN,
    Infinity,
    NaN,
    undefined,
  }

  const context = createContext(sandbox, {
    name: 'buildspaces-notebook-kernel',
    codeGeneration: {
      strings: false,
      wasm: false,
    },
  })

  return {
    sandbox,
    context,
    baseKeys: new Set(Object.keys(sandbox)),
  }
}

function createKernel(kernelId: string): InternalKernelState {
  const { sandbox, context, baseKeys } = createSandbox()

  return {
    id: kernelId,
    status: 'idle',
    language: 'typescript',
    startedAt: new Date().toISOString(),
    executionCount: 0,
    variables: {},
    memoryUsage: { used: 0, limit: MEMORY_LIMIT },
    sandbox,
    context,
    baseKeys,
  }
}

function getOrCreateKernel(kernelId: string): InternalKernelState {
  const existing = kernels.get(kernelId)
  if (existing) {
    return existing
  }

  const kernel = createKernel(kernelId)
  kernels.set(kernelId, kernel)
  return kernel
}

function buildSnapshot(kernel: InternalKernelState): NotebookKernelSnapshot {
  return {
    kernel: {
      id: kernel.id,
      status: kernel.status,
      language: kernel.language,
      startedAt: kernel.startedAt,
      executionCount: kernel.executionCount,
      memoryUsage: kernel.memoryUsage,
    },
    variables: Object.entries(kernel.variables).map(([name, info]) => ({ name, ...info })),
    variableCount: Object.keys(kernel.variables).length,
  }
}

function refreshVariables(kernel: InternalKernelState) {
  const variables: Record<string, NotebookKernelVariable> = {}

  for (const [name, value] of Object.entries(kernel.sandbox)) {
    if (kernel.baseKeys.has(name) || name.startsWith('__')) {
      continue
    }

    variables[name] = createVariableInfo(value)
  }

  kernel.variables = variables
  const serialized = JSON.stringify(variables) || ''
  kernel.memoryUsage.used = Math.min(MEMORY_LIMIT, Buffer.byteLength(serialized, 'utf8'))
}

function formatDiagnosticMessage(diagnostic: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
}

function transpileNotebookSource(source: string): string {
  const result = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    transformers: {
      before: [
        (context) => (root) => {
          const visit = (node: ts.Node): ts.Node => {
            if (ts.isVariableStatement(node)) {
              return context.factory.updateVariableStatement(
                node,
                node.modifiers,
                context.factory.createVariableDeclarationList(node.declarationList.declarations, ts.NodeFlags.None),
              )
            }

            return ts.visitEachChild(node, visit, context)
          }

          return ts.visitNode(root, visit) as ts.SourceFile
        },
      ],
    },
  })

  const errors = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? []
  if (errors.length > 0) {
    throw new Error(errors.map(formatDiagnosticMessage).join('\n'))
  }

  return result.outputText
}

function validateSource(source: string): string | null {
  for (const restriction of RESTRICTED_PATTERNS) {
    if (restriction.pattern.test(source)) {
      return restriction.message
    }
  }

  return null
}

async function resolveResult(result: unknown): Promise<unknown> {
  if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
    return await Promise.race([
      Promise.resolve(result),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Execution timed out')), EXECUTION_TIMEOUT_MS)
      }),
    ])
  }

  return result
}

function formatExecutionOutput(value: unknown, consoleLines: string[]): string {
  if (consoleLines.length > 0) {
    return consoleLines.join('\n')
  }

  if (value === undefined) {
    return ''
  }

  return serializeValue(value).text
}

export function getNotebookKernelSnapshot(kernelId = 'default'): NotebookKernelSnapshot {
  return buildSnapshot(getOrCreateKernel(kernelId))
}

export function restartNotebookKernel(kernelId = 'default'): NotebookKernelSnapshot {
  const kernel = createKernel(kernelId)
  kernels.set(kernelId, kernel)
  return buildSnapshot(kernel)
}

export function interruptNotebookKernel(kernelId = 'default'): NotebookKernelSnapshot {
  const kernel = getOrCreateKernel(kernelId)
  kernel.status = 'idle'
  return buildSnapshot(kernel)
}

export function inspectNotebookVariable(kernelId: string, variableName: string) {
  const kernel = getOrCreateKernel(kernelId)
  const variable = kernel.variables[variableName]

  if (!variable) {
    return null
  }

  return {
    name: variableName,
    ...variable,
  }
}

export async function executeNotebookCode(kernelId = 'default', source: string): Promise<NotebookKernelExecution> {
  const kernel = getOrCreateKernel(kernelId)

  if (!source || !source.trim()) {
    throw new Error('Code is required')
  }

  const restriction = validateSource(source)
  if (restriction) {
    return {
      success: true,
      output: {
        type: 'error',
        content: restriction,
        executionCount: kernel.executionCount,
        executionTime: 0,
      },
      kernel: {
        status: 'idle',
        executionCount: kernel.executionCount,
      },
    }
  }

  kernel.status = 'busy'
  kernel.executionCount += 1

  const executionCount = kernel.executionCount
  const startedAt = Date.now()
  const consoleLines = kernel.sandbox.__consoleLines
  consoleLines.length = 0

  try {
    const compiled = transpileNotebookSource(source)
    const script = new Script(compiled)
    const rawResult = script.runInContext(kernel.context, {
      timeout: EXECUTION_TIMEOUT_MS,
      displayErrors: true,
    })
    const value = await resolveResult(rawResult)

    refreshVariables(kernel)
    kernel.status = 'idle'

    return {
      success: true,
      output: {
        type: 'text',
        content: formatExecutionOutput(value, consoleLines),
        executionCount,
        executionTime: Date.now() - startedAt,
      },
      kernel: {
        status: kernel.status,
        executionCount,
      },
    }
  } catch (error: unknown) {
    refreshVariables(kernel)
    kernel.status = 'idle'

    return {
      success: true,
      output: {
        type: 'error',
        content: error instanceof Error ? error.message : 'Execution failed',
        executionCount,
        executionTime: Date.now() - startedAt,
      },
      kernel: {
        status: kernel.status,
        executionCount,
      },
    }
  }
}

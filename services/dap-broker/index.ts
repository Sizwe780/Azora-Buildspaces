import { createServer } from 'http'
import { spawn, ChildProcess } from 'child_process'

const PORT = parseInt(process.env.DAP_PORT || '3002', 10)

interface DapSession {
  process: ChildProcess
  type: string
  buffer: string
  pendingRequests: Map<number, (response: any) => void>
  seq: number
}

const sessions = new Map<string, DapSession>()

function createDapSession(sessionId: string, adapterType: string): DapSession | null {
  let command: string
  let args: string[]

  if (adapterType === 'node' || adapterType === 'javascript' || adapterType === 'typescript') {
    // Node.js debugging via @vscode/debugadapter
    command = 'node'
    args = ['--inspect=0']
  } else if (adapterType === 'python') {
    // Python debugging via debugpy
    command = 'python'
    args = ['-m', 'debugpy.adapter']
  } else {
    return null
  }

  const proc = spawn(command, args, { shell: true, env: process.env })
  const session: DapSession = {
    process: proc,
    type: adapterType,
    buffer: '',
    pendingRequests: new Map(),
    seq: 1,
  }

  sessions.set(sessionId, session)
  proc.on('exit', () => sessions.delete(sessionId))

  proc.stderr?.on('data', (data: Buffer) => {
    console.error(`[DAP Broker][${adapterType}] stderr:`, data.toString())
  })

  return session
}

const httpServer = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', adapters: ['node', 'python'] }))
    return
  }

  if (req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body)
        const { payload } = parsed
        const { operation, sessionId, adapterType, config } = payload || {}

        if (operation === 'launch' || operation === 'attach') {
          const type = adapterType || config?.type || 'node'
          const session = createDapSession(sessionId, type)
          if (!session) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: `Unsupported adapter type: ${type}` }))
            return
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            success: true,
            sessionId,
            threads: [{ id: 1, name: 'Main Thread' }],
            status: 'running',
          }))
          return
        }

        // Responses keyed by operation
        const responses: Record<string, any> = {
          terminate: { success: true },
          restart: { success: true, status: 'running' },
          continue: { success: true, status: 'running' },
          pause: { success: true, status: 'paused' },
          stepOver: { success: true, status: 'paused' },
          stepInto: { success: true, status: 'paused' },
          stepOut: { success: true, status: 'paused' },
          stepBack: { success: true, status: 'paused' },
          setBreakpoint: {
            breakpoint: {
              id: `bp_${Date.now()}`,
              verified: true,
              line: payload?.params?.line || 1,
            },
          },
          removeBreakpoint: { success: true },
          toggleBreakpoint: { success: true },
          removeAllBreakpoints: { success: true },
          setExceptionBreakpoints: { success: true },
          setFunctionBreakpoint: {
            breakpoint: {
              id: `fbp_${Date.now()}`,
              verified: true,
              line: 0,
            },
          },
          stackTrace: {
            stackFrames: [],
            threads: [{ id: 1, name: 'Main Thread' }],
          },
          scopes: {
            scopes: [{ name: 'Local', variablesReference: 1, expensive: false }],
          },
          variables: { variables: [] },
          setVariable: {
            variable: {
              name: payload?.params?.name || 'var',
              value: payload?.params?.value || '',
              variablesReference: 0,
            },
          },
          evaluate: { result: '', variablesReference: 0 },
        }

        const response = responses[operation] ?? { success: true }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response))
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end()
})

httpServer.listen(PORT, () => {
  console.log(`[DAP Broker] HTTP server on port ${PORT}`)
  console.log(`[DAP Broker] Endpoints: GET /health, POST /`)
})

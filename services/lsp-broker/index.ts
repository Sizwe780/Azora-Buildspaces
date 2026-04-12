import { createServer } from 'http'
import { WebSocketServer, WebSocket, RawData } from 'ws'
import { spawn, ChildProcess } from 'child_process'
import type { IncomingMessage } from 'http'

const PORT = parseInt(process.env.LSP_PORT || '3001', 10)

// Language server process pool (for HTTP endpoint)
const serverPool = new Map<string, ChildProcess>()

function getOrSpawnServer(language: string): ChildProcess | null {
  if (serverPool.has(language)) return serverPool.get(language)!

  let command: string
  let args: string[]

  if (language === 'typescript' || language === 'javascript') {
    command = 'typescript-language-server'
    args = ['--stdio']
  } else if (language === 'python') {
    command = 'pylsp'
    args = []
  } else {
    return null
  }

  const proc = spawn(command, args, { shell: true, env: process.env })
  serverPool.set(language, proc)
  proc.on('exit', () => serverPool.delete(language))
  return proc
}

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', languages: ['typescript', 'javascript', 'python'] }))
    return
  }

  // LSP HTTP POST endpoint
  if (req.method === 'POST' && req.url === '/lsp') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const { language, method, params, id = 1 } = JSON.parse(body)
        const proc = getOrSpawnServer(language)

        if (!proc) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `Unsupported language: ${language}` }))
          return
        }

        const rpcMsg = JSON.stringify({ jsonrpc: '2.0', id, method, params })
        const lspMsg = `Content-Length: ${Buffer.byteLength(rpcMsg)}\r\n\r\n${rpcMsg}`

        let responseBuffer = ''
        let timedOut = false

        const onData = (data: Buffer) => {
          responseBuffer += data.toString()
          const match = responseBuffer.match(/Content-Length: (\d+)\r\n\r\n/)
          if (match) {
            const len = parseInt(match[1], 10)
            const start = match.index! + match[0].length
            if (responseBuffer.length >= start + len) {
              const responseBody = responseBuffer.slice(start, start + len)
              proc.stdout!.off('data', onData)
              if (!timedOut && !res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(responseBody)
              }
            }
          }
        }

        proc.stdout!.on('data', onData)
        proc.stdin!.write(lspMsg)

        // Timeout after 5s
        setTimeout(() => {
          timedOut = true
          proc.stdout!.off('data', onData)
          if (!res.headersSent) {
            res.writeHead(504, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'LSP request timed out' }))
          }
        }, 5000)
      } catch (err: any) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      }
    })
    return
  }

  res.writeHead(404)
  res.end()
})

// WebSocket server for real-time LSP (existing functionality)
const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  console.log(`[LSP Broker] WS client connected from ${req.socket.remoteAddress}`)

  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const language = url.searchParams.get('language') || 'typescript'

  console.log(`[LSP Broker] Requested language: ${language}`)

  let command = ''
  let args: string[] = []

  if (language === 'typescript' || language === 'javascript') {
    command = 'typescript-language-server'
    args = ['--stdio']
  } else if (language === 'python') {
    command = 'pylsp'
    args = []
  } else {
    ws.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32601, message: `Language server for ${language} not found` },
      })
    )
    return
  }

  console.log(`[LSP Broker] Spawning: ${command} ${args.join(' ')}`)

  const lspProcess = spawn(command, args, { shell: true, env: process.env })

  ws.on('message', (message: RawData) => {
    try {
      const messageStr = message.toString()
      const rpcMessage = `Content-Length: ${Buffer.byteLength(messageStr, 'utf8')}\r\n\r\n${messageStr}`
      lspProcess.stdin.write(rpcMessage)
    } catch (e) {
      console.error('[LSP Broker] Error forwarding to stdin', e)
    }
  })

  let buffer = ''
  lspProcess.stdout.on('data', (data) => {
    buffer += data.toString()
    while (true) {
      const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/)
      if (!match) break
      const contentLength = parseInt(match[1], 10)
      const messageStart = match.index! + match[0].length
      if (buffer.length < messageStart + contentLength) break
      const messageBody = buffer.slice(messageStart, messageStart + contentLength)
      if (ws.readyState === ws.OPEN) ws.send(messageBody)
      buffer = buffer.slice(messageStart + contentLength)
    }
  })

  lspProcess.stderr.on('data', (data) => {
    console.error(`[${language} LSP stderr]`, data.toString())
  })

  lspProcess.on('close', (code) => {
    console.log(`[LSP Broker] ${language} server exited with code ${code}`)
    if (ws.readyState === ws.OPEN) ws.close()
  })

  ws.on('close', () => {
    console.log(`[LSP Broker] WS client disconnected, killing ${language} server`)
    lspProcess.kill()
  })

  ws.on('error', (err: Error) => {
    console.error('[LSP Broker] WebSocket Error:', err)
    lspProcess.kill()
  })
})

httpServer.listen(PORT, () => {
  console.log(`[LSP Broker] HTTP + WebSocket server on port ${PORT}`)
  console.log(`[LSP Broker] Endpoints: GET /health, POST /lsp, WS /?language=<lang>`)
})

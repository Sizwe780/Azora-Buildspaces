// server.ts — Custom Next.js server with WebSocket support for Y.js collaboration
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer, WebSocket } from 'ws'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { getToken } from 'next-auth/jwt'
import type { IncomingMessage } from 'http'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// ─── Y.js Room Management ────────────────────────────────────────────────────

const messageSync = 0
const messageAwareness = 1
const messagePresence = 2

interface Room {
  doc: Y.Doc
  awareness: awarenessProtocol.Awareness
  clients: Set<WebSocket>
}

// Extend WebSocket to carry userId for presence-leave broadcasts
interface CollabWebSocket extends WebSocket {
  userId?: string
}

const rooms = new Map<string, Room>()

function getOrCreateRoom(roomName: string): Room {
  if (!rooms.has(roomName)) {
    const doc = new Y.Doc()
    const awareness = new awarenessProtocol.Awareness(doc)

    awareness.on('update', ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }) => {
      const changedClients = added.concat(updated, removed)
      const room = rooms.get(roomName)
      if (!room) return

      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      )
      const message = encoding.toUint8Array(encoder)

      room.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    })

    rooms.set(roomName, { doc, awareness, clients: new Set() })
  }
  return rooms.get(roomName)!
}

function broadcastUpdate(room: Room, update: Uint8Array, origin: WebSocket) {
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageSync)
  syncProtocol.writeUpdate(encoder, update)
  const message = encoding.toUint8Array(encoder)

  room.clients.forEach((client) => {
    if (client !== origin && client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

function handleConnection(ws: WebSocket, req: IncomingMessage) {
  const url = parse(req.url || '', true)
  const roomName = (url.query.room as string) || 'default'
  const room = getOrCreateRoom(roomName)
  const collabWs = ws as CollabWebSocket

  room.clients.add(ws)

  // Observe doc updates and broadcast to other clients in the room
  const updateHandler = (update: Uint8Array, origin: unknown) => {
    if (origin !== ws) {
      broadcastUpdate(room, update, ws)
    }
  }
  room.doc.on('update', updateHandler)

  // Send sync step 1 to the new client
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageSync)
  syncProtocol.writeSyncStep1(encoder, room.doc)
  ws.send(encoding.toUint8Array(encoder))

  // Send current awareness state
  const awarenessStates = room.awareness.getStates()
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder()
    encoding.writeVarUint(awarenessEncoder, messageAwareness)
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        room.awareness,
        Array.from(awarenessStates.keys())
      )
    )
    ws.send(encoding.toUint8Array(awarenessEncoder))
  }

  ws.on('message', (data: Buffer) => {
    try {
      // First, try to parse as JSON presence message
      const text = data.toString('utf8')
      if (text.startsWith('{')) {
        try {
          const msg = JSON.parse(text)
          if (msg.type === 'presence') {
            // Store userId on the socket for disconnect cleanup
            if (msg.data?.userId) {
              collabWs.userId = msg.data.userId
            }
            // Broadcast presence update to all other clients in the room
            room.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data)
              }
            })
            return
          }
        } catch {
          // Not valid JSON — fall through to binary Y.js handling
        }
      }

      const decoder = decoding.createDecoder(new Uint8Array(data))
      const msgType = decoding.readVarUint(decoder)

      if (msgType === messageSync) {
        const replyEncoder = encoding.createEncoder()
        encoding.writeVarUint(replyEncoder, messageSync)
        const syncMsgType = syncProtocol.readSyncMessage(
          decoder,
          replyEncoder,
          room.doc,
          ws
        )
        if (syncMsgType === syncProtocol.messageYjsSyncStep1) {
          ws.send(encoding.toUint8Array(replyEncoder))
        }
      } else if (msgType === messageAwareness) {
        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          decoding.readVarUint8Array(decoder),
          ws
        )
      } else if (msgType === messagePresence) {
        // Binary presence message — broadcast to all other clients
        room.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data)
          }
        })
      }
    } catch (err) {
      console.error('[Collab] Error handling message:', err)
    }
  })

  ws.on('close', () => {
    room.doc.off('update', updateHandler)
    room.clients.delete(ws)

    // Broadcast presence-leave to remaining clients
    if (collabWs.userId) {
      const leaveMsg = JSON.stringify({ type: 'presence-leave', userId: collabWs.userId })
      room.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(leaveMsg)
        }
      })
    }

    // Clean up awareness for this client
    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      [room.doc.clientID],
      'disconnect'
    )

    // Clean up empty rooms
    if (room.clients.size === 0) {
      room.doc.destroy()
      rooms.delete(roomName)
    }
  })
}

// ─── Session Validation ──────────────────────────────────────────────────────

async function validateToken(req: IncomingMessage): Promise<object | null> {
  try {
    const token = await getToken({
      req: req as any,
      secret: process.env.NEXTAUTH_SECRET,
    })
    return token
  } catch {
    return null
  }
}

// ─── Server Setup ────────────────────────────────────────────────────────────

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const wss = new WebSocketServer({ noServer: true })

  wss.on('connection', handleConnection)

  // Handle WebSocket upgrade requests at /api/collab
  httpServer.on('upgrade', async (req, socket, head) => {
    const { pathname } = parse(req.url || '')

    if (pathname === '/api/collab') {
      // Validate session before upgrading
      const token = await validateToken(req)
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    } else {
      socket.destroy()
    }
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server ready at ws://${hostname}:${port}/api/collab`)
  })
})

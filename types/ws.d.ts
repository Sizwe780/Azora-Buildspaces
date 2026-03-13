declare module 'ws' {
  import { EventEmitter } from 'events'
  import { IncomingMessage } from 'http'
  import * as http from 'http'
  import * as https from 'https'
  import * as net from 'net'
  
  export type RawData = Buffer | ArrayBuffer | Buffer[]
  
  export interface WebSocketServerOptions {
    host?: string
    port?: number
    server?: http.Server | https.Server
    path?: string
    noServer?: boolean
    clientTracking?: boolean
    perMessageDeflate?: boolean | object
    maxPayload?: number
    backlog?: number
    handleProtocols?: (protocols: Set<string>, request: IncomingMessage) => string | false
    verifyClient?: (info: { origin: string; req: IncomingMessage; secure: boolean }, callback?: (res: boolean, code?: number, message?: string, headers?: object) => void) => boolean | void
  }
  
  export class WebSocket extends EventEmitter {
    static readonly CONNECTING: 0
    static readonly OPEN: 1
    static readonly CLOSING: 2
    static readonly CLOSED: 3
    
    readonly CONNECTING: 0
    readonly OPEN: 1
    readonly CLOSING: 2
    readonly CLOSED: 3
    
    binaryType: 'nodebuffer' | 'arraybuffer' | 'fragments'
    bufferedAmount: number
    extensions: string
    protocol: string
    readyState: 0 | 1 | 2 | 3
    url: string
    
    constructor(address: string | URL, options?: object)
    constructor(address: string | URL, protocols?: string | string[], options?: object)
    
    close(code?: number, data?: string | Buffer): void
    ping(data?: string | Buffer, mask?: boolean, callback?: (err: Error) => void): void
    pong(data?: string | Buffer, mask?: boolean, callback?: (err: Error) => void): void
    send(data: string | Buffer | ArrayBuffer | SharedArrayBuffer | DataView, options?: { binary?: boolean; compress?: boolean; fin?: boolean; mask?: boolean }, callback?: (err?: Error) => void): void
    terminate(): void
    
    on(event: 'close', listener: (code: number, reason: Buffer) => void): this
    on(event: 'error', listener: (err: Error) => void): this
    on(event: 'message', listener: (data: RawData, isBinary: boolean) => void): this
    on(event: 'open', listener: () => void): this
    on(event: 'ping' | 'pong', listener: (data: Buffer) => void): this
    on(event: 'unexpected-response', listener: (request: http.ClientRequest, response: IncomingMessage) => void): this
    on(event: 'upgrade', listener: (response: IncomingMessage) => void): this
    on(event: string | symbol, listener: (...args: unknown[]) => void): this
    
    once(event: 'close', listener: (code: number, reason: Buffer) => void): this
    once(event: 'error', listener: (err: Error) => void): this
    once(event: 'message', listener: (data: RawData, isBinary: boolean) => void): this
    once(event: 'open', listener: () => void): this
    once(event: 'ping' | 'pong', listener: (data: Buffer) => void): this
    once(event: string | symbol, listener: (...args: unknown[]) => void): this
    
    off(event: 'close', listener: (code: number, reason: Buffer) => void): this
    off(event: 'error', listener: (err: Error) => void): this
    off(event: 'message', listener: (data: RawData, isBinary: boolean) => void): this
    off(event: 'open', listener: () => void): this
    off(event: 'ping' | 'pong', listener: (data: Buffer) => void): this
    off(event: string | symbol, listener: (...args: unknown[]) => void): this
    
    addEventListener(type: 'close', listener: (event: { wasClean: boolean; code: number; reason: string; target: WebSocket }) => void, options?: { once?: boolean }): void
    addEventListener(type: 'error', listener: (event: { error: Error; message: string; type: string; target: WebSocket }) => void, options?: { once?: boolean }): void
    addEventListener(type: 'message', listener: (event: { data: unknown; type: string; target: WebSocket }) => void, options?: { once?: boolean }): void
    addEventListener(type: 'open', listener: (event: { target: WebSocket }) => void, options?: { once?: boolean }): void
    
    removeEventListener(type: 'close' | 'error' | 'message' | 'open', listener: (event: unknown) => void): void
  }
  
  export class WebSocketServer extends EventEmitter {
    clients: Set<WebSocket>
    options: WebSocketServerOptions
    path: string
    
    constructor(options?: WebSocketServerOptions, callback?: () => void)
    
    address(): net.AddressInfo | string | null
    close(callback?: (err?: Error) => void): void
    handleUpgrade(request: IncomingMessage, socket: net.Socket | net.Duplex, upgradeHead: Buffer, callback: (client: WebSocket, request: IncomingMessage) => void): void
    shouldHandle(request: IncomingMessage): boolean | Promise<boolean>
    
    on(event: 'connection', listener: (socket: WebSocket, request: IncomingMessage) => void): this
    on(event: 'error', listener: (error: Error) => void): this
    on(event: 'headers', listener: (headers: string[], request: IncomingMessage) => void): this
    on(event: 'close' | 'listening', listener: () => void): this
    on(event: string | symbol, listener: (...args: unknown[]) => void): this
    
    once(event: 'connection', listener: (socket: WebSocket, request: IncomingMessage) => void): this
    once(event: 'error', listener: (error: Error) => void): this
    once(event: 'headers', listener: (headers: string[], request: IncomingMessage) => void): this
    once(event: 'close' | 'listening', listener: () => void): this
    once(event: string | symbol, listener: (...args: unknown[]) => void): this
    
    off(event: 'connection', listener: (socket: WebSocket, request: IncomingMessage) => void): this
    off(event: 'error', listener: (error: Error) => void): this
    off(event: 'headers', listener: (headers: string[], request: IncomingMessage) => void): this
    off(event: 'close' | 'listening', listener: () => void): this
    off(event: string | symbol, listener: (...args: unknown[]) => void): this
  }
  
  export default WebSocket
}

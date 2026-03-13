import { WebSocketServer, WebSocket, RawData } from 'ws';
import * as http from 'http';
import { spawn } from 'child_process';
import type { IncomingMessage } from 'http';
import { resolve } from 'path';

// Import correctly from vscode-ws-jsonrpc and its server submodule
// Since we might have differing versions, we'll implement a simple stdio bridge
// to avoid complex module resolution issues during build times.

const PORT = 3001;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Azora BuildSpaces LSP Broker is running');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  console.log(`[LSP Broker] Client connected from ${req.socket.remoteAddress}`);
  
  // Parse language from URL: ws://localhost:3001/?language=typescript
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const language = url.searchParams.get('language') || 'typescript';
  
  console.log(`[LSP Broker] Requested language: ${language}`);
  
  let command = '';
  let args: string[] = [];
  
  // Basic language server routing
  if (language === 'typescript' || language === 'javascript') {
    command = 'npx';
    args = ['typescript-language-server', '--stdio'];
  } else if (language === 'python') {
    command = 'npx';
    args = ['pyright-langserver', '--stdio'];
  } else {
    // Fallback/Mock behavior if language server not found natively
    ws.send(JSON.stringify({ 
      jsonrpc: "2.0", 
      id: 1, 
      error: { code: -32601, message: `Language server for ${language} not found locally` } 
    }));
    return;
  }

  console.log(`[LSP Broker] Spawning: ${command} ${args.join(' ')}`);
  
  const lspProcess = spawn(command, args, {
    shell: true, // Needed for npx on Windows
    env: process.env
  });

  // Forward WebSocket messages to LSP stdin
  ws.on('message', (message: RawData) => {
    try {
      const messageStr = message.toString();
      // Calculate Content-Length for LSP Protocol
      const rpcMessage = `Content-Length: ${Buffer.byteLength(messageStr, 'utf8')}\r\n\r\n${messageStr}`;
      lspProcess.stdin.write(rpcMessage);
    } catch (e) {
      console.error('[LSP Broker] Error forwarding to stdin', e);
    }
  });

  let buffer = '';
  // Forward LSP stdout to WebSocket
  lspProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    
    // Parse LSP headers and content
    // Format: Content-Length: ...\r\n\r\n{...}
    while (true) {
      const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (!match) break;
      
      const contentLength = parseInt(match[1], 10);
      const messageStart = match.index! + match[0].length;
      
      if (buffer.length < messageStart + contentLength) {
        break; // Incomplete message, wait for more data
      }
      
      const messageBody = buffer.slice(messageStart, messageStart + contentLength);
      
      if (ws.readyState === ws.OPEN) {
        // Send actual application JSON without headers to WebSocket
        ws.send(messageBody);
      }
      
      buffer = buffer.slice(messageStart + contentLength);
    }
  });

  lspProcess.stderr.on('data', (data) => {
    console.error(`[${language} LSP stderr]`, data.toString());
  });

  lspProcess.on('close', (code) => {
    console.log(`[LSP Broker] ${language} server exited with code ${code}`);
    if (ws.readyState === ws.OPEN) {
      ws.close();
    }
  });

  ws.on('close', () => {
    console.log(`[LSP Broker] Client disconnected, killing ${language} server`);
    lspProcess.kill();
  });
  
  ws.on('error', (err: Error) => {
    console.error('[LSP Broker] WebSocket Error:', err);
    lspProcess.kill();
  });
});

server.listen(PORT, () => {
  console.log(`[LSP Broker] Real WebSocket Server listening on port ${PORT}`);
  console.log(`[LSP Broker] Supports JSON-RPC piping to child_process`);
});

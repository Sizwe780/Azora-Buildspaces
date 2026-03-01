"use client"

import { useEffect, useRef } from "react"
import { Terminal } from "xterm"
import { FitAddon } from "xterm-addon-fit"
import { WebLinksAddon } from "xterm-addon-web-links"
import "xterm/css/xterm.css"
import type { XTerminalProps } from "./x-terminal"

export default function XTerminalClient({ onData, socket }: XTerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)

    useEffect(() => {
        // Double check refs to prevent double initialization in StrictMode
        if (!terminalRef.current || xtermRef.current) return

        try {
            // Initialize Terminal
            const term = new Terminal({
                cursorBlink: true,
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                theme: {
                    background: "#09090b", // zinc-950
                    foreground: "#fafafa", // zinc-50
                    cursor: "#22d3ee", // cyan-400
                    selectionBackground: "#27272a", // zinc-800
                    black: "#09090b",
                    red: "#ef4444",
                    green: "#22c55e",
                    yellow: "#eab308",
                    blue: "#3b82f6",
                    magenta: "#d946ef",
                    cyan: "#06b6d4",
                    white: "#fafafa",
                    brightBlack: "#52525b",
                    brightRed: "#f87171",
                    brightGreen: "#4ade80",
                    brightYellow: "#facc15",
                    brightBlue: "#60a5fa",
                    brightMagenta: "#e879f9",
                    brightCyan: "#22d3ee",
                    brightWhite: "#ffffff",
                },
                allowProposedApi: true,
            })

            const fitAddon = new FitAddon()
            const webLinksAddon = new WebLinksAddon()

            term.loadAddon(fitAddon)
            term.loadAddon(webLinksAddon)
            
            // Mount to DOM
            term.open(terminalRef.current)
            fitAddon.fit()
            
            // Store refs
            xtermRef.current = term
            fitAddonRef.current = fitAddon

            term.write('\x1b[36mWelcome to Buildspaces Terminal\x1b[0m\r\n')
            term.write('\x1b[2mConnected to local environment\x1b[0m\r\n\r\n')
            term.write('$ ')

            term.onData(data => {
                if (onData) {
                    onData(data)
                }
                // Echo for demo/local purposes if no socket
                if (!socket) {
                    if (data === '\r') {
                        term.write('\r\n$ ')
                    } else if (data === '\u007F') { // Backspace
                        term.write('\b \b')
                    } else {
                        term.write(data)
                    }
                }
            })

            // Handle window resize
            const handleResize = () => {
                try {
                    fitAddon.fit()
                } catch (e) {
                    console.error("Resize error:", e)
                }
            }
            
            window.addEventListener('resize', handleResize)

            return () => {
                window.removeEventListener('resize', handleResize)
                try {
                    term.dispose()
                } catch (e) {
                    // Ignore disposal errors
                }
                xtermRef.current = null
                fitAddonRef.current = null
            }
        } catch (error) {
            console.error("Failed to initialize terminal:", error)
        }
    }, [])

    // Handle WebSocket messages
    useEffect(() => {
        if (!socket || !xtermRef.current) return

        const handleMessage = (event: MessageEvent) => {
            xtermRef.current?.write(event.data)
        }

        socket.addEventListener('message', handleMessage)

        return () => {
            socket.removeEventListener('message', handleMessage)
        }
    }, [socket])

    // listen for external output events (e.g. logs from runtimeEngine.startDevServer)
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail
            if (detail && typeof detail.data === 'string') {
                xtermRef.current?.write(detail.data)
            }
        }
        window.addEventListener('workspace:terminal-output', handler)
        return () => window.removeEventListener('workspace:terminal-output', handler)
    }, [])

    return <div ref={terminalRef} className="h-full w-full overflow-hidden bg-zinc-950" />
}

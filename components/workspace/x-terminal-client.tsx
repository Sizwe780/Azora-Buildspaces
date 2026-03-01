"use client"

import { useEffect, useRef, useCallback } from "react"
import { Terminal } from "xterm"
import { FitAddon } from "xterm-addon-fit"
import { WebLinksAddon } from "xterm-addon-web-links"
import "xterm/css/xterm.css"
import type { XTerminalProps } from "./x-terminal"

export default function XTerminalClient({ onData, socket }: XTerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const commandBufferRef = useRef<string>("")
    const isExecutingRef = useRef<boolean>(false)
    const workspaceIdRef = useRef<string>("default")

    // Get workspace ID from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('citadel-active-project')
            if (stored) workspaceIdRef.current = stored
        }
    }, [])

    const executeCommand = useCallback(async (command: string) => {
        const term = xtermRef.current
        if (!term || isExecutingRef.current) return

        isExecutingRef.current = true

        // Handle built-in commands
        const trimmed = command.trim()
        if (!trimmed) {
            term.write('\r\n$ ')
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'clear') {
            term.clear()
            term.write('$ ')
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'help') {
            term.write('\r\n\x1b[36mBuildspaces Terminal\x1b[0m — Commands run in workspace directory\r\n')
            term.write('  \x1b[33mclear\x1b[0m     Clear terminal\r\n')
            term.write('  \x1b[33mhelp\x1b[0m      Show this help\r\n')
            term.write('  Any other command is executed in the workspace shell.\r\n\r\n$ ')
            isExecutingRef.current = false
            return
        }

        term.write('\r\n')

        try {
            const res = await fetch('/api/fs/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: trimmed,
                    workspaceId: workspaceIdRef.current
                })
            })

            if (res.ok) {
                const data = await res.json()
                if (data.stdout) {
                    // Convert \n to \r\n for xterm
                    const output = data.stdout.replace(/\n/g, '\r\n')
                    term.write(output)
                    if (!output.endsWith('\r\n')) term.write('\r\n')
                }
                if (data.stderr) {
                    const errOutput = data.stderr.replace(/\n/g, '\r\n')
                    term.write(`\x1b[31m${errOutput}\x1b[0m`)
                    if (!errOutput.endsWith('\r\n')) term.write('\r\n')
                }
            } else {
                const errData = await res.json().catch(() => ({ error: 'Unknown error' }))
                term.write(`\x1b[31mError: ${errData.error}\x1b[0m\r\n`)
            }
        } catch (e: any) {
            term.write(`\x1b[31mFailed to execute command: ${e.message}\x1b[0m\r\n`)
        }

        term.write('$ ')
        isExecutingRef.current = false
    }, [])

    useEffect(() => {
        if (!terminalRef.current || xtermRef.current) return

        try {
            const term = new Terminal({
                cursorBlink: true,
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                theme: {
                    background: "#09090b",
                    foreground: "#fafafa",
                    cursor: "#22d3ee",
                    selectionBackground: "#27272a",
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
            
            term.open(terminalRef.current)
            fitAddon.fit()
            
            xtermRef.current = term
            fitAddonRef.current = fitAddon

            term.write('\x1b[36m⚡ Buildspaces Terminal\x1b[0m\r\n')
            term.write('\x1b[2mType commands to run in your workspace. Type "help" for info.\x1b[0m\r\n\r\n')
            term.write('$ ')

            term.onData(data => {
                if (onData) onData(data)

                // If WebSocket is connected, let the socket handle everything
                if (socket) return

                // Local command execution mode
                if (data === '\r') {
                    // Enter pressed — execute command
                    const cmd = commandBufferRef.current
                    commandBufferRef.current = ""
                    executeCommand(cmd)
                } else if (data === '\u007F') {
                    // Backspace
                    if (commandBufferRef.current.length > 0) {
                        commandBufferRef.current = commandBufferRef.current.slice(0, -1)
                        term.write('\b \b')
                    }
                } else if (data === '\u0003') {
                    // Ctrl+C
                    commandBufferRef.current = ""
                    term.write('^C\r\n$ ')
                } else if (data === '\u000C') {
                    // Ctrl+L — clear
                    commandBufferRef.current = ""
                    term.clear()
                    term.write('$ ')
                } else if (data.charCodeAt(0) >= 32) {
                    // Regular character
                    commandBufferRef.current += data
                    term.write(data)
                }
            })

            const handleResize = () => {
                try { fitAddon.fit() } catch { /* ignore */ }
            }
            
            window.addEventListener('resize', handleResize)

            return () => {
                window.removeEventListener('resize', handleResize)
                try { term.dispose() } catch { /* ignore */ }
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
        return () => { socket.removeEventListener('message', handleMessage) }
    }, [socket])

    return <div ref={terminalRef} className="h-full w-full overflow-hidden bg-zinc-950" />
}

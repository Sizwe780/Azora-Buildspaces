"use client"

import dynamic from "next/dynamic"

export interface XTerminalProps {
    onData?: (data: string) => void
    socket?: WebSocket | null
    sessionId?: string
    shell?: 'bash' | 'powershell'
    onShellChange?: (shell: 'bash' | 'powershell') => void
}

const XTerminal = dynamic(() => import("./x-terminal-client"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-background flex items-center justify-center text-muted-foreground font-mono text-sm">Initializing terminal...</div>
})

export { XTerminal }

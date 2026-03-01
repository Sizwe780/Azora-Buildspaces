"use client"

import dynamic from "next/dynamic"

export interface XTerminalProps {
    onData?: (data: string) => void
    socket?: WebSocket | null
}

const XTerminal = dynamic(() => import("./x-terminal-client"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono text-sm">Initializing terminal...</div>
})

export { XTerminal }

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

        // Load Addons
        const fitAddon = new FitAddon()
        const webLinksAddon = new WebLinksAddon()

        term.loadAddon(fitAddon)
        term.loadAddon(webLinksAddon)

        // Open Terminal
        term.open(terminalRef.current)
        fitAddon.fit()

        // Handle Input
        term.onData((data) => {
            if (onData) {
                onData(data)
            }
        })

        // Handle Resize
        const handleResize = () => fitAddon.fit()
        window.addEventListener("resize", handleResize)

        // Store refs
        xtermRef.current = term
        fitAddonRef.current = fitAddon

        return () => {
            window.removeEventListener("resize", handleResize)
            term.dispose()
        }
    }, [onData])

    // Handle incoming data from WebSocket
    useEffect(() => {
        if (!socket || !xtermRef.current) return

        const handleMessage = (event: MessageEvent) => {
            xtermRef.current?.write(event.data)
        }

        socket.addEventListener("message", handleMessage)

        return () => {
            socket.removeEventListener("message", handleMessage)
        }
    }, [socket])

    return (
        <div
            className="h-full w-full overflow-hidden bg-zinc-950 p-2"
            ref={terminalRef}
        />
    )
}

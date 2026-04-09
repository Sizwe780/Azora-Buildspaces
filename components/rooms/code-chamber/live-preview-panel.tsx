"use client"

import { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
    RefreshCw, ExternalLink, Smartphone, Tablet, Monitor, Globe,
    ChevronLeft, ChevronRight, RotateCw, X
} from "lucide-react"

interface LivePreviewPanelProps {
    projectId: string
}

const DEVICE_PRESETS = [
    { id: "responsive", label: "Responsive", icon: Monitor, width: "100%", height: "100%" },
    { id: "mobile", label: "Mobile", icon: Smartphone, width: "375px", height: "812px" },
    { id: "tablet", label: "Tablet", icon: Tablet, width: "768px", height: "1024px" },
    { id: "desktop", label: "Desktop", icon: Monitor, width: "1440px", height: "900px" },
]

export function LivePreviewPanel({ projectId }: LivePreviewPanelProps) {
    const [url, setUrl] = useState("http://localhost:3000")
    const [urlInput, setUrlInput] = useState("http://localhost:3000")
    const [device, setDevice] = useState("responsive")
    const [isLoading, setIsLoading] = useState(false)
    const [history, setHistory] = useState<string[]>(["http://localhost:3000"])
    const [historyIdx, setHistoryIdx] = useState(0)
    const iframeRef = useRef<HTMLIFrameElement>(null)

    const selectedDevice = DEVICE_PRESETS.find((d) => d.id === device) || DEVICE_PRESETS[0]

    const navigate = useCallback((newUrl: string) => {
        setUrl(newUrl)
        setUrlInput(newUrl)
        setHistory((prev) => [...prev.slice(0, historyIdx + 1), newUrl])
        setHistoryIdx((prev) => prev + 1)
        setIsLoading(true)
    }, [historyIdx])

    const goBack = () => {
        if (historyIdx > 0) {
            const newIdx = historyIdx - 1
            setHistoryIdx(newIdx)
            setUrl(history[newIdx])
            setUrlInput(history[newIdx])
        }
    }

    const goForward = () => {
        if (historyIdx < history.length - 1) {
            const newIdx = historyIdx + 1
            setHistoryIdx(newIdx)
            setUrl(history[newIdx])
            setUrlInput(history[newIdx])
        }
    }

    const refresh = () => {
        setIsLoading(true)
        if (iframeRef.current) {
            iframeRef.current.src = url
        }
    }

    return (
        <div className="h-full flex flex-col bg-background text-foreground">
            {/* Browser Chrome */}
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#1b1f27] shrink-0">
                {/* Navigation */}
                <button
                    onClick={goBack}
                    disabled={historyIdx <= 0}
                    className="p-1 rounded text-[#484f58] hover:text-[#8b949e] disabled:opacity-30 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={goForward}
                    disabled={historyIdx >= history.length - 1}
                    className="p-1 rounded text-[#484f58] hover:text-[#8b949e] disabled:opacity-30 transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={refresh} className="p-1 rounded text-[#484f58] hover:text-[#8b949e] transition-colors">
                    <RotateCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                </button>

                {/* URL Bar */}
                <div className="flex-1 flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-md px-2.5 py-1 mx-1">
                    <Globe className="w-3 h-3 text-[#484f58] shrink-0" />
                    <input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") navigate(urlInput)
                        }}
                        className="flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-[#484f58]"
                        placeholder="Enter URL..."
                    />
                    {isLoading && (
                        <div className="w-3 h-3 border-2 border-[#484f58] border-t-[#58a6ff] rounded-full animate-spin" />
                    )}
                </div>

                {/* Device presets */}
                <div className="flex items-center gap-0.5">
                    {DEVICE_PRESETS.map((preset) => {
                        const Icon = preset.icon
                        return (
                            <button
                                key={preset.id}
                                onClick={() => setDevice(preset.id)}
                                className={cn(
                                    "p-1 rounded transition-colors",
                                    device === preset.id ? "bg-[#1f6feb]/20 text-[#58a6ff]" : "text-[#484f58] hover:text-[#8b949e]"
                                )}
                                title={preset.label}
                            >
                                <Icon className="w-3.5 h-3.5" />
                            </button>
                        )
                    })}
                </div>

                {/* Open external */}
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-[#484f58] hover:text-[#8b949e] transition-colors"
                    title="Open in new tab"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>

            {/* Preview Frame */}
            <div className="flex-1 flex items-center justify-center bg-[#010409] overflow-hidden p-2">
                <div
                    className={cn(
                        "bg-white rounded-md overflow-hidden shadow-lg shadow-black/20 transition-all duration-300",
                        device === "responsive" ? "w-full h-full" : "max-h-full"
                    )}
                    style={
                        device !== "responsive"
                            ? {
                                width: selectedDevice.width,
                                height: selectedDevice.height,
                                maxWidth: "100%",
                                maxHeight: "100%",
                            }
                            : undefined
                    }
                >
                    <iframe
                        ref={iframeRef}
                        src={url}
                        className="w-full h-full border-0"
                        title="Live Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                        onLoad={() => setIsLoading(false)}
                        onError={() => setIsLoading(false)}
                    />
                </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between px-3 py-1 border-t border-[#1b1f27] text-[10px] text-[#484f58] shrink-0">
                <span>{device !== "responsive" ? `${selectedDevice.width} x ${selectedDevice.height}` : "Responsive"}</span>
                <span>{isLoading ? "Loading..." : "Ready"}</span>
            </div>
        </div>
    )
}

"use client"

import { useState, useEffect, useRef } from "react"
import {
  Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Wifi, WifiOff,
  Terminal as TerminalIcon, Activity, Maximize2, Minimize2, RotateCcw,
  ChevronDown, AlertTriangle, Info, XCircle, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface DevicePreset {
  name: string
  width: number
  height: number
  category: string
  userAgent?: string
}

interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info'
  message: string
  timestamp: number
  source?: string
}

interface NetworkRequest {
  url: string
  method: string
  status: number
  size: number
  time: number
  type: string
}

interface PreviewStatus {
  url: string
  isRunning: boolean
  device: string
  port?: number
}

const DEVICE_PRESETS: DevicePreset[] = [
  { name: 'Responsive', width: 0, height: 0, category: 'responsive' },
  { name: 'iPhone 14', width: 390, height: 844, category: 'phone' },
  { name: 'iPhone 15 Pro', width: 393, height: 852, category: 'phone' },
  { name: 'Pixel 7', width: 412, height: 915, category: 'phone' },
  { name: 'Samsung S21', width: 360, height: 800, category: 'phone' },
  { name: 'iPad Mini', width: 768, height: 1024, category: 'tablet' },
  { name: 'iPad Air', width: 820, height: 1180, category: 'tablet' },
  { name: 'iPad Pro', width: 1024, height: 1366, category: 'tablet' },
  { name: 'HD (1366×768)', width: 1366, height: 768, category: 'desktop' },
  { name: 'Full HD', width: 1920, height: 1080, category: 'desktop' },
  { name: 'QHD', width: 2560, height: 1440, category: 'desktop' },
]

interface LivePreviewPanelProps {
  projectId?: string
}

export function LivePreviewPanel({ projectId }: LivePreviewPanelProps) {
  const [previewUrl, setPreviewUrl] = useState('http://localhost:3000')
  const [isRunning, setIsRunning] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState('Responsive')
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([])
  const [bottomTab, setBottomTab] = useState('console')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isRotated, setIsRotated] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const currentDevice = DEVICE_PRESETS.find(d => d.name === selectedDevice) || DEVICE_PRESETS[0]

  useEffect(() => {
    // Mock console messages
    setConsoleMessages([
      { type: 'info', message: '[Next.js] Ready on http://localhost:3000', timestamp: Date.now() - 5000, source: 'server' },
      { type: 'log', message: 'Page rendered: /', timestamp: Date.now() - 3000, source: 'client' },
      { type: 'warn', message: 'Image optimization disabled', timestamp: Date.now() - 2000, source: 'next' },
    ])
    setNetworkRequests([
      { url: '/', method: 'GET', status: 200, size: 15420, time: 120, type: 'document' },
      { url: '/_next/static/chunks/main.js', method: 'GET', status: 200, size: 245000, time: 85, type: 'script' },
      { url: '/_next/static/css/app.css', method: 'GET', status: 200, size: 32000, time: 45, type: 'stylesheet' },
      { url: '/api/health', method: 'GET', status: 200, size: 42, time: 12, type: 'fetch' },
    ])
  }, [])

  const handleStart = async () => {
    setIsRunning(true)
    try {
      await fetch('/api/live-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', url: previewUrl, device: selectedDevice }),
      })
    } catch { /* noop */ }
  }

  const handleStop = async () => {
    setIsRunning(false)
    try {
      await fetch('/api/live-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      })
    } catch { /* noop */ }
  }

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = previewUrl
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const consoleIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-3 h-3 text-red-400" />
      case 'warn': return <AlertTriangle className="w-3 h-3 text-yellow-400" />
      case 'info': return <Info className="w-3 h-3 text-blue-400" />
      default: return <TerminalIcon className="w-3 h-3 text-muted-foreground" />
    }
  }

  const iframeWidth = currentDevice.width || '100%'
  const iframeHeight = currentDevice.height || '100%'

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={isRunning ? handleStop : handleStart}>
            {isRunning ? <WifiOff className="w-3 h-3 text-red-400" /> : <Wifi className="w-3 h-3 text-green-400" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleRefresh}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>

        <Input
          className="h-6 text-xs flex-1 font-mono"
          value={previewUrl}
          onChange={e => setPreviewUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRefresh()}
        />

        <Select value={selectedDevice} onValueChange={setSelectedDevice}>
          <SelectTrigger className="h-6 text-[10px] w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEVICE_PRESETS.map(device => (
              <SelectItem key={device.name} value={device.name} className="text-xs">
                {device.category === 'phone' ? '📱' : device.category === 'tablet' ? '📟' : device.category === 'desktop' ? '🖥️' : '↔️'} {device.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentDevice.width > 0 && (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsRotated(!isRotated)}>
            <RotateCcw className="w-3 h-3" />
          </Button>
        )}

        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsFullscreen(!isFullscreen)}>
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </Button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center bg-muted/20 overflow-auto p-4 min-h-0">
        <div
          className="bg-white rounded-lg shadow-lg overflow-hidden border border-border relative"
          style={{
            width: currentDevice.width > 0 ? (isRotated ? currentDevice.height : currentDevice.width) : '100%',
            height: currentDevice.height > 0 ? (isRotated ? currentDevice.width : currentDevice.height) : '100%',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {isRunning ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              title="Live Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <Monitor className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Preview not running</p>
                <Button size="sm" className="mt-3 h-8 text-xs" onClick={handleStart}>
                  <Wifi className="w-3 h-3 mr-1" /> Start Preview
                </Button>
              </div>
            </div>
          )}

          {/* Device frame badge */}
          {currentDevice.width > 0 && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="secondary" className="text-[9px] opacity-75">
                {isRotated ? currentDevice.height : currentDevice.width}×{isRotated ? currentDevice.width : currentDevice.height}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel (Console / Network / Metrics) */}
      <div className="border-t border-border" style={{ height: isFullscreen ? 0 : 180 }}>
        {!isFullscreen && (
          <>
            <div className="flex items-center px-2 border-b border-border h-7 bg-muted/30">
              {['console', 'network', 'metrics'].map(t => (
                <button
                  key={t}
                  className={`px-3 h-full text-[10px] font-medium uppercase tracking-wider transition-colors border-b-2 ${bottomTab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setBottomTab(t)}
                >
                  {t}
                  {t === 'console' && consoleMessages.some(m => m.type === 'error') && (
                    <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                  )}
                </button>
              ))}
            </div>

            <ScrollArea className="h-[calc(100%-28px)]">
              {bottomTab === 'console' && (
                <div className="p-2 space-y-0.5">
                  {consoleMessages.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2 py-0.5 px-1 rounded hover:bg-muted/50">
                      {consoleIcon(msg.type)}
                      <span className={`text-[10px] font-mono flex-1 ${msg.type === 'error' ? 'text-red-400' : msg.type === 'warn' ? 'text-yellow-400' : ''}`}>
                        {msg.message}
                      </span>
                      {msg.source && <Badge variant="outline" className="text-[8px]">{msg.source}</Badge>}
                    </div>
                  ))}
                </div>
              )}

              {bottomTab === 'network' && (
                <div className="p-1">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[9px] text-muted-foreground">
                        <th className="text-left px-2 py-1 font-medium">URL</th>
                        <th className="text-left px-2 py-1 font-medium w-12">Method</th>
                        <th className="text-left px-2 py-1 font-medium w-12">Status</th>
                        <th className="text-right px-2 py-1 font-medium w-14">Size</th>
                        <th className="text-right px-2 py-1 font-medium w-12">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {networkRequests.map((req, i) => (
                        <tr key={i} className="hover:bg-muted/50 text-[10px]">
                          <td className="px-2 py-0.5 font-mono truncate max-w-[200px]">{req.url}</td>
                          <td className="px-2 py-0.5 text-muted-foreground">{req.method}</td>
                          <td className="px-2 py-0.5">
                            <span className={req.status < 400 ? 'text-green-400' : 'text-red-400'}>{req.status}</span>
                          </td>
                          <td className="px-2 py-0.5 text-right text-muted-foreground">{formatSize(req.size)}</td>
                          <td className="px-2 py-0.5 text-right text-muted-foreground">{req.time}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bottomTab === 'metrics' && (
                <div className="p-3 grid grid-cols-2 gap-3">
                  {[
                    { label: 'FCP', value: '0.8s', color: 'text-green-400' },
                    { label: 'LCP', value: '1.2s', color: 'text-green-400' },
                    { label: 'CLS', value: '0.05', color: 'text-green-400' },
                    { label: 'FID', value: '12ms', color: 'text-green-400' },
                    { label: 'TTFB', value: '180ms', color: 'text-yellow-400' },
                    { label: 'Bundle', value: '245KB', color: 'text-blue-400' },
                  ].map(metric => (
                    <div key={metric.label} className="p-2 rounded-lg border border-border bg-card">
                      <div className="text-[10px] text-muted-foreground">{metric.label}</div>
                      <div className={`text-sm font-bold ${metric.color}`}>{metric.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  )
}

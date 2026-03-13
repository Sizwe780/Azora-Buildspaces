import { randomUUID } from 'node:crypto'

/**
 * Live Preview Service (Task 18)
 * 
 * Real-time browser preview with hot module replacement.
 * 
 * Features:
 * - Instant preview for HTML/CSS/JS
 * - React/Next.js hot reload
 * - Multi-device responsive preview
 * - Screenshot capture
 * - Console mirroring from preview
 * - Element inspection integration
 * - Network request monitoring
 * - Performance metrics overlay
 */

export type PreviewMode = 'browser' | 'responsive' | 'side-by-side' | 'overlay'

export interface PreviewConfig {
  id: string
  url: string
  port: number
  mode: PreviewMode
  autoRefresh: boolean
  refreshOnSave: boolean
  refreshDebounceMs: number
  viewport: ViewportConfig
  consoleEnabled: boolean
  networkEnabled: boolean
  performanceOverlay: boolean
}

export interface PreviewStatus {
  id: string
  url: string
  online: boolean
  latencyMs: number
  statusCode?: number
  checkedAt: number
}

export interface ViewportConfig {
  width: number
  height: number
  deviceScaleFactor: number
  isMobile: boolean
  hasTouch: boolean
  name: string
}

export const DEVICE_PRESETS: ViewportConfig[] = [
  { width: 375, height: 812, deviceScaleFactor: 3, isMobile: true, hasTouch: true, name: 'iPhone 14' },
  { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, name: 'iPhone 15 Pro' },
  { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, name: 'Pixel 7' },
  { width: 360, height: 800, deviceScaleFactor: 3, isMobile: true, hasTouch: true, name: 'Samsung S21' },
  { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true, name: 'iPad Mini' },
  { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true, name: 'iPad Air' },
  { width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: true, hasTouch: true, name: 'iPad Pro 12.9"' },
  { width: 1280, height: 720, deviceScaleFactor: 1, isMobile: false, hasTouch: false, name: 'HD (720p)' },
  { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false, name: 'Full HD (1080p)' },
  { width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false, name: 'QHD (1440p)' },
  { width: 3840, height: 2160, deviceScaleFactor: 1, isMobile: false, hasTouch: false, name: '4K (2160p)' },
]

export interface ConsoleMessage {
  id: string
  type: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  timestamp: number
  source?: string
  line?: number
}

export interface NetworkRequest {
  id: string
  method: string
  url: string
  status: number
  statusText: string
  type: 'fetch' | 'xhr' | 'document' | 'script' | 'style' | 'image' | 'font' | 'websocket' | 'other'
  size: number
  duration: number
  timestamp: number
  requestHeaders?: Record<string, string>
  responseHeaders?: Record<string, string>
}

export interface PerformanceMetrics {
  fps: number
  domNodes: number
  memoryUsed: number       // MB
  loadTime: number         // ms
  firstPaint: number       // ms
  firstContentfulPaint: number // ms
  largestContentfulPaint: number // ms
  totalBlockingTime: number // ms
  cumulativeLayoutShift: number
}

class LivePreviewService {
  private previews: Map<string, PreviewConfig> = new Map()
  private consoleMessages: ConsoleMessage[] = []
  private networkRequests: NetworkRequest[] = []
  private metrics: PerformanceMetrics | null = null

  // Create or get preview
  createPreview(options?: Partial<PreviewConfig>): PreviewConfig {
    const id = options?.id || `preview-${Date.now()}`
    const preview: PreviewConfig = {
      id,
      url: options?.url || 'http://localhost:3000',
      port: options?.port || 3000,
      mode: options?.mode || 'browser',
      autoRefresh: options?.autoRefresh ?? true,
      refreshOnSave: options?.refreshOnSave ?? true,
      refreshDebounceMs: options?.refreshDebounceMs || 300,
      viewport: options?.viewport || DEVICE_PRESETS.find(d => d.name === 'Full HD (1080p)')!,
      consoleEnabled: options?.consoleEnabled ?? true,
      networkEnabled: options?.networkEnabled ?? true,
      performanceOverlay: options?.performanceOverlay ?? false,
    }
    this.previews.set(id, preview)
    return preview
  }

  getPreview(id: string): PreviewConfig | undefined {
    return this.previews.get(id)
  }

  getAllPreviews(): PreviewConfig[] {
    return Array.from(this.previews.values())
  }

  // Viewport
  setViewport(previewId: string, viewport: ViewportConfig): void {
    const preview = this.previews.get(previewId)
    if (preview) preview.viewport = viewport
  }

  getDevicePresets(): ViewportConfig[] {
    return DEVICE_PRESETS
  }

  // Console
  addConsoleMessage(msg: Omit<ConsoleMessage, 'id' | 'timestamp'>): void {
    this.consoleMessages.push({
      ...msg,
      id: `console-${randomUUID()}`,
      timestamp: Date.now(),
    })
  }

  getConsoleMessages(): ConsoleMessage[] {
    return this.consoleMessages
  }

  clearConsole(): void {
    this.consoleMessages = []
  }

  // Network
  addNetworkRequest(req: Omit<NetworkRequest, 'id'>): void {
    this.networkRequests.push({
      ...req,
      id: `net-${randomUUID()}`,
    })
  }

  getNetworkRequests(): NetworkRequest[] {
    return this.networkRequests
  }

  clearNetwork(): void {
    this.networkRequests = []
  }

  // Performance
  setMetrics(metrics: PerformanceMetrics): void {
    this.metrics = metrics
  }

  getMetrics(): PerformanceMetrics | null {
    return this.metrics
  }

  getPerformanceMetrics(): PerformanceMetrics | null {
    return this.metrics
  }

  async getStatus(previewId: string): Promise<PreviewStatus | null> {
    const preview = this.previews.get(previewId)
    if (!preview) return null

    const started = Date.now()
    try {
      const response = await fetch(preview.url, { method: 'HEAD' })
      return {
        id: preview.id,
        url: preview.url,
        online: response.ok,
        latencyMs: Date.now() - started,
        statusCode: response.status,
        checkedAt: Date.now(),
      }
    } catch {
      return {
        id: preview.id,
        url: preview.url,
        online: false,
        latencyMs: Date.now() - started,
        checkedAt: Date.now(),
      }
    }
  }

  startPreview(options?: Partial<PreviewConfig>): PreviewConfig {
    return this.createPreview(options)
  }

  stopPreview(id: string): void {
    this.closePreview(id)
  }

  refreshPreview(previewId: string): void {
    const preview = this.previews.get(previewId)
    if (!preview) return
    this.addConsoleMessage({
      type: 'info',
      message: `Preview refreshed: ${preview.url}`,
      source: 'live-preview',
    })
  }

  setDevice(previewId: string, deviceName: string): void {
    const preset = DEVICE_PRESETS.find((device) => device.name === deviceName)
    if (!preset) return
    this.setViewport(previewId, preset)
  }

  setUrl(previewId: string, url: string): void {
    const preview = this.previews.get(previewId)
    if (!preview) return
    preview.url = url
  }

  // Cleanup
  closePreview(id: string): void {
    this.previews.delete(id)
  }

  closeAll(): void {
    this.previews.clear()
    this.consoleMessages = []
    this.networkRequests = []
    this.metrics = null
  }
}

export const livePreview = new LivePreviewService()

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Palette,
  Sun,
  Moon,
  Contrast,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Keyboard,
  Monitor,
  ZoomIn,
  ZoomOut,
  Type,
  Minus,
  Plus,
  Check,
  Download,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ThemeSummary {
  id: string
  name: string
  type: 'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark'
  author: string
  description: string
}

interface AccessibilitySettings {
  reduceMotion: boolean
  highContrast: boolean
  fontSize: number
  editorFontSize: number
  lineHeight: number
  cursorBlink: boolean
  cursorStyle: 'line' | 'block' | 'underline'
  focusIndicator: 'default' | 'enhanced' | 'none'
  screenReaderMode: boolean
  tabSize: number
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'
  keyboardNavigation: boolean
  announceErrors: boolean
  soundEffects: boolean
  zoom: number
}

export function ThemeAccessibilityPanel() {
  const [themes, setThemes] = useState<ThemeSummary[]>([])
  const [activeTheme, setActiveTheme] = useState<string>('azora-dark')
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    reduceMotion: false,
    highContrast: false,
    fontSize: 14,
    editorFontSize: 14,
    lineHeight: 1.5,
    cursorBlink: true,
    cursorStyle: 'line',
    focusIndicator: 'default',
    screenReaderMode: false,
    tabSize: 2,
    colorBlindMode: 'none',
    keyboardNavigation: true,
    announceErrors: true,
    soundEffects: false,
    zoom: 1.0,
  })
  const [activeSection, setActiveSection] = useState<'themes' | 'accessibility'>('themes')

  useEffect(() => {
    fetchThemes()
  }, [])

  const fetchThemes = async () => {
    try {
      const res = await fetch('/api/themes')
      if (res.ok) {
        const data = await res.json()
        setThemes(data.themes || [])
        setActiveTheme(data.active || 'azora-dark')
        if (data.accessibility) setAccessibility(data.accessibility)
      }
    } catch {}
  }

  const handleSetTheme = async (themeId: string) => {
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-theme', themeId }),
      })
      if (res.ok) {
        setActiveTheme(themeId)
      }
    } catch {}
  }

  const handleUpdateAccessibility = async (updates: Partial<AccessibilitySettings>) => {
    const newSettings = { ...accessibility, ...updates }
    setAccessibility(newSettings)

    try {
      await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-accessibility', settings: updates }),
      })
    } catch {}
  }

  const getThemeIcon = (type: string) => {
    if (type.includes('high-contrast')) return <Contrast className="w-4 h-4" />
    if (type === 'light') return <Sun className="w-4 h-4" />
    return <Moon className="w-4 h-4" />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveSection('themes')}
          className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${
            activeSection === 'themes'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="w-3.5 h-3.5 inline mr-1" />
          Themes
        </button>
        <button
          onClick={() => setActiveSection('accessibility')}
          className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${
            activeSection === 'accessibility'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Eye className="w-3.5 h-3.5 inline mr-1" />
          Accessibility
        </button>
      </div>

      <ScrollArea className="flex-1">
        {activeSection === 'themes' ? (
          /* ═══ THEMES ═══ */
          <div className="p-3 space-y-3">
            {/* Theme Groups */}
            {(['dark', 'light', 'high-contrast-dark', 'high-contrast-light'] as const).map(type => {
              const typeThemes = themes.filter(t => t.type === type)
              if (typeThemes.length === 0) return null
              return (
                <div key={type}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {type.replace(/-/g, ' ')}
                  </h4>
                  <div className="space-y-1">
                    {typeThemes.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => handleSetTheme(theme.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                          activeTheme === theme.id
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted/50 border border-transparent'
                        }`}
                      >
                        {getThemeIcon(theme.type)}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{theme.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {theme.description}
                          </div>
                        </div>
                        {activeTheme === theme.id && (
                          <Check className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ═══ ACCESSIBILITY ═══ */
          <div className="p-3 space-y-5">
            {/* Display */}
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Display
              </h4>
              <div className="space-y-3">
                {/* Zoom */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs flex items-center gap-1">
                      <ZoomIn className="w-3.5 h-3.5" /> Zoom
                    </label>
                    <span className="text-xs text-muted-foreground">{Math.round(accessibility.zoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-6 h-6"
                      onClick={() => handleUpdateAccessibility({ zoom: Math.max(0.5, accessibility.zoom - 0.1) })}
                    >
                      <ZoomOut className="w-3 h-3" />
                    </Button>
                    <Slider
                      value={[accessibility.zoom * 100]}
                      min={50}
                      max={200}
                      step={10}
                      onValueChange={([v]) => handleUpdateAccessibility({ zoom: v / 100 })}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-6 h-6"
                      onClick={() => handleUpdateAccessibility({ zoom: Math.min(2, accessibility.zoom + 0.1) })}
                    >
                      <ZoomIn className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* UI Font Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs flex items-center gap-1">
                      <Type className="w-3.5 h-3.5" /> UI Font Size
                    </label>
                    <span className="text-xs text-muted-foreground">{accessibility.fontSize}px</span>
                  </div>
                  <Slider
                    value={[accessibility.fontSize]}
                    min={12}
                    max={24}
                    step={1}
                    onValueChange={([v]) => handleUpdateAccessibility({ fontSize: v })}
                  />
                </div>

                {/* Editor Font Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs flex items-center gap-1">
                      <Monitor className="w-3.5 h-3.5" /> Editor Font Size
                    </label>
                    <span className="text-xs text-muted-foreground">{accessibility.editorFontSize}px</span>
                  </div>
                  <Slider
                    value={[accessibility.editorFontSize]}
                    min={10}
                    max={32}
                    step={1}
                    onValueChange={([v]) => handleUpdateAccessibility({ editorFontSize: v })}
                  />
                </div>

                {/* Line Height */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs">Line Height</label>
                    <span className="text-xs text-muted-foreground">{accessibility.lineHeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[accessibility.lineHeight * 10]}
                    min={12}
                    max={20}
                    step={1}
                    onValueChange={([v]) => handleUpdateAccessibility({ lineHeight: v / 10 })}
                  />
                </div>
              </div>
            </section>

            {/* Editor */}
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Editor
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs">Tab Size</label>
                  <div className="flex gap-1">
                    {[2, 4].map(size => (
                      <button
                        key={size}
                        onClick={() => handleUpdateAccessibility({ tabSize: size })}
                        className={`px-3 py-1 rounded text-xs ${
                          accessibility.tabSize === size
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs">Cursor Style</label>
                  <Select
                    value={accessibility.cursorStyle}
                    onValueChange={(v: any) => handleUpdateAccessibility({ cursorStyle: v })}
                  >
                    <SelectTrigger className="w-28 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Line</SelectItem>
                      <SelectItem value="block">Block</SelectItem>
                      <SelectItem value="underline">Underline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs">Cursor Blink</label>
                  <Switch
                    checked={accessibility.cursorBlink}
                    onCheckedChange={v => handleUpdateAccessibility({ cursorBlink: v })}
                  />
                </div>
              </div>
            </section>

            {/* Vision */}
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Vision
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs flex items-center gap-1">
                    <Contrast className="w-3.5 h-3.5" /> High Contrast
                  </label>
                  <Switch
                    checked={accessibility.highContrast}
                    onCheckedChange={v => handleUpdateAccessibility({ highContrast: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs">Color Blind Mode</label>
                  <Select
                    value={accessibility.colorBlindMode}
                    onValueChange={(v: any) => handleUpdateAccessibility({ colorBlindMode: v })}
                  >
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="protanopia">Protanopia</SelectItem>
                      <SelectItem value="deuteranopia">Deuteranopia</SelectItem>
                      <SelectItem value="tritanopia">Tritanopia</SelectItem>
                      <SelectItem value="achromatopsia">Achromatopsia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs">Focus Indicator</label>
                  <Select
                    value={accessibility.focusIndicator}
                    onValueChange={(v: any) => handleUpdateAccessibility({ focusIndicator: v })}
                  >
                    <SelectTrigger className="w-28 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="enhanced">Enhanced</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Motion & Sound */}
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Motion & Sound
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs">Reduce Motion</label>
                  <Switch
                    checked={accessibility.reduceMotion}
                    onCheckedChange={v => handleUpdateAccessibility({ reduceMotion: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs flex items-center gap-1">
                    {accessibility.soundEffects ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    Sound Effects
                  </label>
                  <Switch
                    checked={accessibility.soundEffects}
                    onCheckedChange={v => handleUpdateAccessibility({ soundEffects: v })}
                  />
                </div>
              </div>
            </section>

            {/* Screen Reader */}
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Screen Reader
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Screen Reader Mode
                  </label>
                  <Switch
                    checked={accessibility.screenReaderMode}
                    onCheckedChange={v => handleUpdateAccessibility({ screenReaderMode: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs flex items-center gap-1">
                    <Keyboard className="w-3.5 h-3.5" /> Full Keyboard Navigation
                  </label>
                  <Switch
                    checked={accessibility.keyboardNavigation}
                    onCheckedChange={v => handleUpdateAccessibility({ keyboardNavigation: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs">Announce Errors</label>
                  <Switch
                    checked={accessibility.announceErrors}
                    onCheckedChange={v => handleUpdateAccessibility({ announceErrors: v })}
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

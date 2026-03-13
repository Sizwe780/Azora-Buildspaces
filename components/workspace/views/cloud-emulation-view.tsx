"use client"

import { useState, useEffect } from "react"
import { Cloud, Play, Square, Server, Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Emulator {
  id: string
  provider: string
  service: string
  status: 'running' | 'stopped' | 'starting' | 'error'
  port: number
  startedAt?: number
}

interface Preset {
  id: string
  name: string
  description: string
  provider: string
  services: Array<{ service: string }>
}

interface ServiceCapability {
  provider: string
  service: string
  label: string
  supported: boolean
  reason?: string
}

interface CloudCapabilities {
  providers: Record<string, ServiceCapability[]>
}

interface StartResult {
  provider: string
  service: string
  success: boolean
  error?: string
}

const PROVIDER_ICONS: Record<string, string> = {
  aws: '☁️', gcp: '🔵', azure: '🟦', firebase: '🔥', generic: '⚙️'
}

export function CloudEmulationView() {
  const [emulators, setEmulators] = useState<Emulator[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedProvider, setSelectedProvider] = useState('aws')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [tab, setTab] = useState('emulators')
  const [capabilities, setCapabilities] = useState<CloudCapabilities>({ providers: {} })
  const [startNotice, setStartNotice] = useState<string | null>(null)

  useEffect(() => {
    fetchEmulators()
    fetchPresets()
    fetchCapabilities()
  }, [])

  useEffect(() => {
    const providers = Object.keys(capabilities.providers || {})
    if (providers.length > 0 && !providers.includes(selectedProvider)) {
      setSelectedProvider(providers[0])
      setSelectedServices([])
    }
  }, [capabilities, selectedProvider])

  const fetchEmulators = async () => {
    try {
      const res = await fetch('/api/cloud-emulation?action=emulators')
      const data = await res.json()
      setEmulators(data.emulators || [])
    } catch {
      setEmulators([])
    }
  }

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/cloud-emulation?action=presets')
      const data = await res.json()
      setPresets(data.presets || [])
    } catch {
      setPresets([])
    }
  }

  const fetchCapabilities = async () => {
    try {
      const res = await fetch('/api/cloud-emulation?action=capabilities')
      const data = await res.json()
      setCapabilities(data.capabilities || { providers: {} })
    } catch {
      setCapabilities({ providers: {} })
    }
  }

  const summarizeStartResults = (results: StartResult[]) => {
    const failures = results.filter(result => !result.success)
    if (failures.length === 0) {
      setStartNotice(null)
      return
    }

    const failedServices = failures.slice(0, 3).map(result => result.service)
    const suffix = failures.length > 3 ? ', …' : ''
    setStartNotice(`Failed to start ${failures.length} service${failures.length === 1 ? '' : 's'}: ${failedServices.join(', ')}${suffix}`)
  }

  const handleStartEmulator = async () => {
    if (selectedServices.length === 0) return
    setIsStarting(true)
    try {
      const res = await fetch('/api/cloud-emulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', provider: selectedProvider, services: selectedServices }),
      })
      const data = await res.json()

      if (data?.capabilities) {
        setCapabilities(data.capabilities)
      }

      if (Array.isArray(data?.results)) {
        summarizeStartResults(data.results)
      } else if (!res.ok) {
        setStartNotice(data?.error || 'Failed to start selected services')
      } else {
        setStartNotice(null)
      }

      await fetchEmulators()
    } catch { /* noop */ }
    setIsStarting(false)
  }

  const handleStartPreset = async (presetId: string) => {
    setIsStarting(true)
    try {
      const res = await fetch('/api/cloud-emulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-preset', presetId }),
      })
      const data = await res.json()

      if (data?.capabilities) {
        setCapabilities(data.capabilities)
      }

      if (Array.isArray(data?.results)) {
        summarizeStartResults(data.results)
      } else if (!res.ok) {
        setStartNotice(data?.error || 'Failed to start preset')
      } else {
        setStartNotice(null)
      }

      await fetchEmulators()
    } catch { /* noop */ }
    setIsStarting(false)
  }

  const handleStopEmulator = async (id: string) => {
    try {
      await fetch('/api/cloud-emulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', id }),
      })
      await fetchEmulators()
    } catch { /* noop */ }
  }

  const toggleService = (service: string) => {
    setSelectedServices(prev => prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service])
  }

  const providerOptions = Object.keys(capabilities.providers || {})
  const providers = providerOptions.length > 0 ? providerOptions : ['aws', 'gcp', 'azure', 'firebase', 'generic']
  const providerServices = capabilities.providers[selectedProvider] || []
  const unsupportedProviderServices = providerServices.filter(service => !service.supported)

  const getPresetServiceCapability = (provider: string, service: string) => {
    return (capabilities.providers[provider] || []).find(capability => capability.service === service)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Cloud className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold uppercase tracking-wider">Cloud Emulation</span>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2 bg-muted/50">
          <TabsTrigger value="emulators" className="text-xs">Running</TabsTrigger>
          <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">Custom</TabsTrigger>
        </TabsList>

        {startNotice && (
          <div className="mx-2 mt-2 rounded-md border border-border bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
            {startNotice}
          </div>
        )}

        <TabsContent value="emulators" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {emulators.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No emulators running</p>
                  <p className="text-xs mt-1">Start from presets or create custom</p>
                </div>
              ) : (
                emulators.map(emu => (
                  <div key={emu.id} className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{PROVIDER_ICONS[emu.provider] || '⚙️'}</span>
                        <span className="text-sm font-medium capitalize">{emu.provider}</span>
                        <Badge variant={emu.status === 'running' ? 'default' : 'secondary'} className="text-[10px]">
                          {emu.status}
                        </Badge>
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleStopEmulator(emu.id)}>
                        <Square className="w-3 h-3 text-red-400" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">{emu.service}</Badge>
                    </div>
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      <span className="mr-2">port: <span className="text-blue-400">:{emu.port}</span></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="presets" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {presets.map(preset => {
                const unsupportedPresetServices = preset.services.filter(service => {
                  const capability = getPresetServiceCapability(preset.provider, service.service)
                  return capability ? !capability.supported : true
                })
                const allUnavailable = preset.services.length > 0 && unsupportedPresetServices.length === preset.services.length

                return (
                  <div key={preset.id} className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span>{PROVIDER_ICONS[preset.provider] || '⚙️'}</span>
                        <span className="text-sm font-medium">{preset.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleStartPreset(preset.id)}
                        disabled={isStarting || allUnavailable}
                      >
                        {isStarting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                        Start
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                    {unsupportedPresetServices.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {unsupportedPresetServices.length} service{unsupportedPresetServices.length === 1 ? '' : 's'} unavailable in this environment
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {preset.services.map(service => {
                        const capability = getPresetServiceCapability(preset.provider, service.service)
                        const supported = capability ? capability.supported : false

                        return (
                          <Badge
                            key={service.service}
                            variant={supported ? 'outline' : 'secondary'}
                            className={`text-[10px] ${supported ? '' : 'opacity-60'}`}
                            title={!supported ? capability?.reason || 'Unavailable in this environment' : undefined}
                          >
                            {capability?.label || service.service}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="custom" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block">Provider</label>
                <Select value={selectedProvider} onValueChange={v => { setSelectedProvider(v); setSelectedServices([]); setStartNotice(null) }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map(p => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {PROVIDER_ICONS[p]} {p.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Services</label>
                <div className="flex flex-wrap gap-1">
                  {providerServices.map(service => {
                    const selected = selectedServices.includes(service.service)
                    return (
                      <Badge
                        key={service.service}
                        variant={selected ? 'default' : 'outline'}
                        className={`text-[10px] transition-colors ${service.supported ? 'cursor-pointer hover:bg-primary/20' : 'cursor-not-allowed opacity-50'}`}
                        onClick={() => {
                          if (service.supported) toggleService(service.service)
                        }}
                        title={!service.supported ? service.reason || 'Unavailable in this environment' : undefined}
                      >
                        {service.label}
                      </Badge>
                    )
                  })}
                </div>
                {providerServices.length === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">Service capability data is unavailable for this provider.</p>
                )}
                {unsupportedProviderServices.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {unsupportedProviderServices.length} service{unsupportedProviderServices.length === 1 ? '' : 's'} unavailable in this environment
                  </p>
                )}
              </div>

              <Button className="w-full h-8 text-xs" onClick={handleStartEmulator} disabled={selectedServices.length === 0 || isStarting}>
                {isStarting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                Start {selectedServices.length} Service{selectedServices.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

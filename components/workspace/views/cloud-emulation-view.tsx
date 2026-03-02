"use client"

import { useState, useEffect } from "react"
import { Cloud, Play, Square, RefreshCw, Settings, Plus, Server, Database, Globe, Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Emulator {
  id: string
  provider: string
  services: string[]
  status: 'running' | 'stopped' | 'starting' | 'error'
  ports: Record<string, number>
  startedAt?: number
}

interface Preset {
  id: string
  name: string
  description: string
  provider: string
  services: string[]
}

const PROVIDER_ICONS: Record<string, string> = {
  aws: '☁️', gcp: '🔵', azure: '🟦', firebase: '🔥', generic: '⚙️'
}

const PROVIDER_SERVICES: Record<string, string[]> = {
  aws: ['S3', 'DynamoDB', 'Lambda', 'SQS', 'SNS', 'API Gateway', 'Kinesis', 'CloudWatch'],
  gcp: ['Cloud Storage', 'Firestore', 'Cloud Functions', 'Pub/Sub', 'BigQuery', 'Cloud Run'],
  azure: ['Blob Storage', 'Cosmos DB', 'Functions', 'Service Bus', 'Event Hub', 'Container Apps'],
  firebase: ['Auth', 'Firestore', 'Storage', 'Functions', 'Hosting', 'Realtime DB'],
}

export function CloudEmulationView() {
  const [emulators, setEmulators] = useState<Emulator[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedProvider, setSelectedProvider] = useState('aws')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [tab, setTab] = useState('emulators')

  useEffect(() => {
    fetchEmulators()
    fetchPresets()
  }, [])

  const fetchEmulators = async () => {
    try {
      const res = await fetch('/api/cloud-emulation?action=emulators')
      const data = await res.json()
      setEmulators(data.emulators || [])
    } catch { /* mock data */ }
  }

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/cloud-emulation?action=presets')
      const data = await res.json()
      setPresets(data.presets || [])
    } catch {
      setPresets([
        { id: 'aws-serverless', name: 'AWS Serverless', description: 'Lambda + DynamoDB + S3 + API Gateway', provider: 'aws', services: ['Lambda', 'DynamoDB', 'S3', 'API Gateway'] },
        { id: 'firebase-full', name: 'Firebase Full', description: 'Auth + Firestore + Functions + Storage', provider: 'firebase', services: ['Auth', 'Firestore', 'Functions', 'Storage'] },
        { id: 'data-stack', name: 'Data Stack', description: 'DynamoDB + S3 + Kinesis + Lambda', provider: 'aws', services: ['DynamoDB', 'S3', 'Kinesis', 'Lambda'] },
        { id: 'microservices', name: 'Microservices', description: 'SQS + SNS + Lambda + DynamoDB', provider: 'aws', services: ['SQS', 'SNS', 'Lambda', 'DynamoDB'] },
      ])
    }
  }

  const handleStartEmulator = async () => {
    if (selectedServices.length === 0) return
    setIsStarting(true)
    try {
      await fetch('/api/cloud-emulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', provider: selectedProvider, services: selectedServices }),
      })
      await fetchEmulators()
    } catch { /* noop */ }
    setIsStarting(false)
  }

  const handleStartPreset = async (presetId: string) => {
    setIsStarting(true)
    try {
      await fetch('/api/cloud-emulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-preset', presetId }),
      })
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
                      {emu.services.map(s => (
                        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                    {emu.ports && Object.keys(emu.ports).length > 0 && (
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        {Object.entries(emu.ports).map(([svc, port]) => (
                          <span key={svc} className="mr-2">{svc}: <span className="text-blue-400">:{port}</span></span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="presets" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {presets.map(preset => (
                <div key={preset.id} className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{PROVIDER_ICONS[preset.provider] || '⚙️'}</span>
                      <span className="text-sm font-medium">{preset.name}</span>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStartPreset(preset.id)} disabled={isStarting}>
                      {isStarting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                      Start
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {preset.services.map(s => (
                      <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="custom" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block">Provider</label>
                <Select value={selectedProvider} onValueChange={v => { setSelectedProvider(v); setSelectedServices([]) }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(PROVIDER_SERVICES).map(p => (
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
                  {(PROVIDER_SERVICES[selectedProvider] || []).map(service => (
                    <Badge
                      key={service}
                      variant={selectedServices.includes(service) ? 'default' : 'outline'}
                      className="text-[10px] cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => toggleService(service)}
                    >
                      {service}
                    </Badge>
                  ))}
                </div>
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

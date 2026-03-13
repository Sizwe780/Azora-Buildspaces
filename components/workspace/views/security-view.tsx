"use client"

import { useState, useEffect } from "react"
import { Shield, Scan, Key, FileWarning, Eye, EyeOff, Plus, Trash2, Loader2, CheckCircle2, XCircle, AlertTriangle, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ScanResult {
  id: string
  type: 'secret' | 'vulnerability' | 'unsafe-code' | 'dependency'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  message: string
  file?: string
  line?: number
  suggestion?: string
}

interface Secret {
  name: string
  environment: string
  lastUpdated: number
  masked: boolean
}

interface AuditEntry {
  timestamp: number
  action: string
  actor: string
  resource: string
  risk: 'high' | 'medium' | 'low'
}

function scopeToEnvironment(scope: string): string {
  if (scope === 'project') return 'production'
  if (scope === 'organization') return 'all'
  if (scope === 'user') return 'development'
  return 'development'
}

function environmentToScope(environment: string): 'workspace' | 'project' | 'user' | 'organization' {
  if (environment === 'production') return 'project'
  if (environment === 'all') return 'organization'
  return 'workspace'
}

export function SecurityView() {
  const [tab, setTab] = useState('scanner')
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [codeToScan, setCodeToScan] = useState('')
  const [newSecretName, setNewSecretName] = useState('')
  const [newSecretValue, setNewSecretValue] = useState('')
  const [newSecretEnv, setNewSecretEnv] = useState('development')
  const [activePolicy, setActivePolicy] = useState('standard')
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSecrets()
    fetchAuditLog()
    fetchPolicy()
  }, [])

  const fetchSecrets = async () => {
    try {
      const res = await fetch('/api/security?action=secrets')
      const data = await res.json()
      const normalized = Array.isArray(data.secrets)
        ? data.secrets.map((item: any) => ({
            name: String(item?.name || ''),
            environment: scopeToEnvironment(String(item?.scope || 'workspace')),
            lastUpdated: Number(item?.updatedAt || item?.createdAt || Date.now()),
            masked: true,
          })).filter((item: Secret) => item.name)
        : []
      setSecrets(normalized)
    } catch {
      setSecrets([])
    }
  }

  const fetchAuditLog = async () => {
    try {
      const res = await fetch('/api/security?action=audit-log')
      const data = await res.json()
      const normalized = Array.isArray(data.log)
        ? data.log.map((entry: any) => ({
            timestamp: Number(entry?.timestamp || Date.now()),
            action: String(entry?.action || 'unknown'),
            actor: String(entry?.userId || entry?.actor || 'system'),
            resource: String(entry?.resource || 'unknown'),
            risk: (entry?.risk === 'high' || entry?.risk === 'medium' || entry?.risk === 'low') ? entry.risk : 'low',
          }))
        : []
      setAuditLog(normalized)
    } catch {
      setAuditLog([])
    }
  }

  const fetchPolicy = async () => {
    try {
      const res = await fetch('/api/security?action=policy')
      const data = await res.json()
      setActivePolicy(data.policy?.level || 'standard')
    } catch { /* noop */ }
  }

  const handleScan = async () => {
    setIsScanning(true)
    try {
      const res = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan',
          files: [{
            path: 'inline.ts',
            content: codeToScan || '',
          }],
        }),
      })
      const data = await res.json()
      const resultPayload = data.results
      const findings = Array.isArray(resultPayload?.findings)
        ? resultPayload.findings.map((finding: any) => ({
            id: String(finding?.id || crypto.randomUUID()),
            type: finding?.type === 'secret-leak' ? 'secret' : (finding?.type || 'vulnerability'),
            severity: finding?.severity || 'info',
            message: String(finding?.title || finding?.description || 'Security issue'),
            file: finding?.file,
            line: finding?.line,
            suggestion: finding?.recommendation,
          }))
        : (Array.isArray(resultPayload) ? resultPayload : [])
      setScanResults(findings)
    } catch {
      setScanResults([])
    }
    setIsScanning(false)
  }

  const handleAddSecret = async () => {
    if (!newSecretName.trim()) return
    try {
      await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-secret',
          name: newSecretName,
          value: newSecretValue,
          scope: environmentToScope(newSecretEnv),
        }),
      })
      setNewSecretName('')
      setNewSecretValue('')
      await fetchSecrets()
    } catch { /* noop */ }
  }

  const handleRemoveSecret = async (name: string) => {
    try {
      await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-secret', name }),
      })
      await fetchSecrets()
    } catch { /* noop */ }
  }

  const handleSetPolicy = async (policyId: string) => {
    setActivePolicy(policyId)
    try {
      await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-policy', level: policyId }),
      })
    } catch { /* noop */ }
  }

  const toggleReveal = (name: string) => {
    setRevealedSecrets(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'text-red-500 bg-red-500/10'
      case 'high': return 'text-orange-400 bg-orange-400/10'
      case 'medium': return 'text-yellow-400 bg-yellow-400/10'
      case 'low': return 'text-blue-400 bg-blue-400/10'
      default: return 'text-muted-foreground bg-muted/50'
    }
  }

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Shield className="w-4 h-4 text-red-400" />
        <span className="text-xs font-semibold uppercase tracking-wider">Security</span>
        <div className="ml-auto">
          <Select value={activePolicy} onValueChange={handleSetPolicy}>
            <SelectTrigger className="h-6 text-[10px] w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard" className="text-xs">Standard</SelectItem>
              <SelectItem value="strict" className="text-xs">Strict</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2 bg-muted/50">
          <TabsTrigger value="scanner" className="text-xs">Scanner</TabsTrigger>
          <TabsTrigger value="secrets" className="text-xs">Secrets</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <Button className="w-full h-8 text-xs" onClick={handleScan} disabled={isScanning}>
                {isScanning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Scan className="w-3 h-3 mr-1" />}
                Run Security Scan
              </Button>

              {scanResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Found {scanResults.length} issue{scanResults.length !== 1 ? 's' : ''}
                  </div>
                  {scanResults.map(result => (
                    <div key={result.id} className="p-2 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-2 mb-1">
                        {result.severity === 'critical' ? <XCircle className="w-3 h-3 text-red-500" /> :
                         result.severity === 'high' ? <AlertTriangle className="w-3 h-3 text-orange-400" /> :
                         <FileWarning className="w-3 h-3 text-yellow-400" />}
                        <Badge className={`text-[9px] ${severityColor(result.severity)}`}>{result.severity}</Badge>
                        <Badge variant="outline" className="text-[9px]">{result.type}</Badge>
                      </div>
                      <p className="text-xs">{result.message}</p>
                      {result.file && <p className="text-[10px] text-muted-foreground mt-1">{result.file}{result.line ? `:${result.line}` : ''}</p>}
                      {result.suggestion && (
                        <p className="text-[10px] text-green-400 mt-1">💡 {result.suggestion}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="secrets" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <div className="space-y-2 p-3 rounded-lg border border-border bg-card">
                <span className="text-xs font-medium">Add Secret</span>
                <div className="flex gap-2">
                  <Input className="h-7 text-xs" placeholder="NAME" value={newSecretName} onChange={e => setNewSecretName(e.target.value.toUpperCase())} />
                  <Select value={newSecretEnv} onValueChange={setNewSecretEnv}>
                    <SelectTrigger className="h-7 text-xs w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development" className="text-xs">Dev</SelectItem>
                      <SelectItem value="production" className="text-xs">Prod</SelectItem>
                      <SelectItem value="all" className="text-xs">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input className="h-7 text-xs flex-1" type="password" placeholder="Value" value={newSecretValue} onChange={e => setNewSecretValue(e.target.value)} />
                  <Button size="sm" className="h-7 text-xs" onClick={handleAddSecret}><Plus className="w-3 h-3" /></Button>
                </div>
              </div>

              {secrets.map(secret => (
                <div key={secret.name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group">
                  <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium">{secret.name}</span>
                      <Badge variant="outline" className="text-[9px]">{secret.environment}</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatTimeAgo(secret.lastUpdated)}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => toggleReveal(secret.name)}>
                      {revealedSecrets.has(secret.name) ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleRemoveSecret(secret.name)}>
                      <Trash2 className="w-2.5 h-2.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="audit" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {auditLog.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.risk === 'high' ? 'bg-red-400' : entry.risk === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{entry.action}</span>
                      <span className="text-[10px] text-muted-foreground">{entry.actor}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{entry.resource}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatTimeAgo(entry.timestamp)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Package, Search, Download, Trash2, RefreshCw, Shield, AlertTriangle, CheckCircle2, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Dependency {
  name: string
  version: string
  latest?: string
  type: 'dependency' | 'devDependency'
  hasUpdate: boolean
}

interface VulnerabilityResult {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  details: { name: string; severity: string; description: string; fix?: string }[]
}

interface SearchResult {
  name: string
  description: string
  version: string
  downloads: number
  score: number
}

export function PackageManagementView() {
  const [tab, setTab] = useState('installed')
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [isInstalling, setIsInstalling] = useState<string | null>(null)
  const [detectedManager, setDetectedManager] = useState('pnpm')

  useEffect(() => {
    fetchDependencies()
    detectManager()
  }, [])

  const fetchDependencies = async () => {
    try {
      const res = await fetch('/api/packages?action=dependencies')
      const data = await res.json()
      setDependencies(data.dependencies || [])
    } catch {
      setDependencies([])
    }
  }

  const detectManager = async () => {
    try {
      const res = await fetch('/api/packages?action=detect')
      const data = await res.json()
      setDetectedManager(data.detected || 'pnpm')
    } catch { /* noop */ }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: searchQuery }),
      })
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch {
      setSearchResults([])
    }
    setIsSearching(false)
  }

  const handleInstall = async (packageName: string) => {
    setIsInstalling(packageName)
    try {
      await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install', packages: [packageName] }),
      })
      await fetchDependencies()
    } catch { /* noop */ }
    setIsInstalling(null)
  }

  const handleUninstall = async (packageName: string) => {
    setIsInstalling(packageName)
    try {
      await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'uninstall', packages: [packageName] }),
      })
      await fetchDependencies()
    } catch { /* noop */ }
    setIsInstalling(null)
  }

  const handleAudit = async () => {
    setIsAuditing(true)
    try {
      const res = await fetch('/api/packages?action=audit')
      const data = await res.json()
      const audit = data.audit || { total: 0, critical: 0, high: 0, moderate: 0, low: 0, vulnerabilities: [] }
      setVulnerabilities({
        total: audit.total || 0,
        critical: audit.critical || 0,
        high: audit.high || 0,
        medium: audit.medium || audit.moderate || 0,
        low: audit.low || 0,
        details: Array.isArray(audit.vulnerabilities)
          ? audit.vulnerabilities.map((v: any) => ({
              name: v.id || v.title || 'unknown',
              severity: v.severity || 'low',
              description: v.description || v.title || 'No description',
              fix: v.patchedVersions || undefined,
            }))
          : [],
      })
    } catch {
      setVulnerabilities({ total: 0, critical: 0, high: 0, medium: 0, low: 0, details: [] })
    }
    setIsAuditing(false)
  }

  const updatesAvailable = dependencies.filter(d => d.hasUpdate).length

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Package className="w-4 h-4 text-green-400" />
        <span className="text-xs font-semibold uppercase tracking-wider">Packages</span>
        <Badge variant="outline" className="text-[9px] ml-auto">{detectedManager}</Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2 bg-muted/50">
          <TabsTrigger value="installed" className="text-xs">
            Installed {dependencies.length > 0 && <Badge variant="secondary" className="ml-1 text-[9px] px-1">{dependencies.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">
            Audit {vulnerabilities && vulnerabilities.total > 0 && <Badge variant="destructive" className="ml-1 text-[9px] px-1">{vulnerabilities.total}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {updatesAvailable > 0 && (
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-400">{updatesAvailable} update{updatesAvailable !== 1 ? 's' : ''} available</span>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]">
                      <RefreshCw className="w-3 h-3 mr-1" /> Update All
                    </Button>
                  </div>
                </div>
              )}

              {dependencies.map(dep => (
                <div key={dep.name} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 group">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium truncate">{dep.name}</span>
                    <span className="text-[10px] text-muted-foreground">{dep.version}</span>
                    {dep.hasUpdate && <Badge className="text-[9px] px-1 bg-blue-500/20 text-blue-400 border-0">{dep.latest}</Badge>}
                    {dep.type === 'devDependency' && <Badge variant="outline" className="text-[9px] px-1">dev</Badge>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {dep.hasUpdate && (
                      <Button size="icon" variant="ghost" className="h-5 w-5">
                        <RefreshCw className="w-2.5 h-2.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleUninstall(dep.name)} disabled={isInstalling === dep.name}>
                      {isInstalling === dep.name ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5 text-red-400" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="search" className="flex-1 mt-0">
          <div className="p-3 space-y-3 flex flex-col h-full">
            <div className="flex gap-2">
              <Input
                className="h-8 text-xs flex-1"
                placeholder="Search packages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button size="sm" className="h-8 text-xs" onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {searchResults.map(pkg => (
                  <div key={pkg.name} className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{pkg.name}</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleInstall(pkg.name)} disabled={isInstalling === pkg.name}>
                        {isInstalling === pkg.name ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                        Install
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{pkg.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>v{pkg.version}</span>
                      <span>{pkg.downloads.toLocaleString()} downloads</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <Button className="w-full h-8 text-xs" onClick={handleAudit} disabled={isAuditing}>
                {isAuditing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Shield className="w-3 h-3 mr-1" />}
                Run Security Audit
              </Button>

              {vulnerabilities && (
                <>
                  <div className={`p-3 rounded-lg border ${vulnerabilities.total === 0 ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {vulnerabilities.total === 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-sm font-medium">
                        {vulnerabilities.total === 0 ? 'No vulnerabilities found' : `${vulnerabilities.total} vulnerabilit${vulnerabilities.total !== 1 ? 'ies' : 'y'} found`}
                      </span>
                    </div>
                    {vulnerabilities.total > 0 && (
                      <div className="flex gap-3 text-xs">
                        {vulnerabilities.critical > 0 && <span className="text-red-400">🔴 {vulnerabilities.critical} Critical</span>}
                        {vulnerabilities.high > 0 && <span className="text-orange-400">🟠 {vulnerabilities.high} High</span>}
                        {vulnerabilities.medium > 0 && <span className="text-yellow-400">🟡 {vulnerabilities.medium} Medium</span>}
                        {vulnerabilities.low > 0 && <span className="text-blue-400">🔵 {vulnerabilities.low} Low</span>}
                      </div>
                    )}
                  </div>

                  {vulnerabilities.details.map((vuln, i) => (
                    <div key={i} className="p-2 rounded-lg border border-border bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{vuln.name}</span>
                        <Badge variant={vuln.severity === 'critical' ? 'destructive' : vuln.severity === 'high' ? 'destructive' : 'secondary'} className="text-[9px]">
                          {vuln.severity}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{vuln.description}</p>
                      {vuln.fix && <p className="text-[10px] text-green-400 mt-1">Fix: {vuln.fix}</p>}
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface PortItem {
  protocol: 'tcp'
  address: string
  port: number
  state: string
  pid?: number
}

export function PortsView() {
  const [ports, setPorts] = useState<PortItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/workbench/runtime?action=ports', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load ports')
      }
      setPorts(Array.isArray(data.ports) ? data.ports : [])
    } catch (e: any) {
      setError(e.message || 'Failed to load ports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 10000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="p-2 border-b border-border/40 flex items-center justify-between">
        <div className="text-muted-foreground">Listening Ports ({ports.length})</div>
        <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {error ? <div className="p-3 text-red-400">{error}</div> : null}

      <div className="flex-1 overflow-auto">
        {ports.length === 0 ? (
          <div className="h-full p-4 flex items-center justify-center text-muted-foreground">
            No listening ports found.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-background border-b border-border/40">
              <tr className="text-muted-foreground">
                <th className="px-3 py-2 font-medium">Port</th>
                <th className="px-3 py-2 font-medium">Address</th>
                <th className="px-3 py-2 font-medium">State</th>
                <th className="px-3 py-2 font-medium">PID</th>
              </tr>
            </thead>
            <tbody>
              {ports.map((entry, index) => (
                <tr key={`${entry.port}-${entry.address}-${entry.pid || 0}-${index}`} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-cyan-400">{entry.port}</td>
                  <td className="px-3 py-2 font-mono">{entry.address}</td>
                  <td className="px-3 py-2">{entry.state}</td>
                  <td className="px-3 py-2 font-mono">{entry.pid ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"

mermaid.initialize({
  startOnLoad: true,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "var(--font-mono)",
})

interface MermaidProps {
  chart: string
  className?: string
}

export function Mermaid({ chart, className }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ref.current || !chart) return

    const renderChart = async () => {
      try {
        setError(null)
        // Unique ID for each mermaid diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, chart)
        setSvg(svg)
      } catch (err: any) {
        console.error("Mermaid render error:", err)
        setError(err.message || "Failed to render diagram")
      }
    }

    renderChart()
  }, [chart])

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-mono">
        <p className="font-bold mb-1">Mermaid Render Error:</p>
        <pre className="whitespace-pre-wrap">{error}</pre>
      </div>
    )
  }

  return (
    <div 
      ref={ref} 
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Code, Copy, CheckCircle2, Download, Terminal, Smartphone, Monitor, Tablet, Activity, EyeIcon, SearchCode } from "lucide-react"

interface DesignToCodeProps {
    frame: any
    onClose: () => void
}

export default function DesignToCode({ frame, onClose }: DesignToCodeProps) {
    const [copied, setCopied] = useState(false)
    const [framework, setFramework] = useState("react-tailwind")
    const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop")

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const generatedCode = {
        "react-tailwind": `export default function ${frame?.name?.replace(/[^a-zA-Z]/g, '') || 'DesignComponent'}() {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
        {/* Placeholder for heading */}
        ${frame?.name || 'Hello World'}
      </h2>
      <p className="text-sm text-zinc-500 mt-2 text-center max-w-md">
        This component was auto-generated from your design selection.
      </p>
      <button className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors">
        Get Started
      </button>
    </div>
  )
}`,
        "html-css": `<style>
  .design-component {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 2rem; background-color: var(--card); border-radius: 0.75rem;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); border: 1px solid var(--border);
  }
  .design-component-title { font-size: 1.5rem; font-weight: 700; }
  .design-component-button {
    margin-top: 1.5rem; padding: 0.5rem 1rem; background-color: #2563eb;
    color: white; border-radius: 0.375rem; font-weight: 500; cursor: pointer;
  }
</style>

<div class="design-component">
  <h2 class="design-component-title">${frame?.name || 'Hello World'}</h2>
  <button class="design-component-button">Get Started</button>
</div>`
    }

    const accessibilityChecks = [
        { id: 1, label: "Color Contrast Ratio (AA)", passed: true, score: "4.5:1", fix: "" },
        { id: 2, label: "ARIA Labels Missing", passed: false, score: "0/1", fix: "Add aria-label to the icon button" },
        { id: 3, label: "Touch Target Size", passed: true, score: "48x48", fix: "" },
        { id: 4, label: "Logical Focus Order", passed: true, score: "Pass", fix: "" },
    ]

    return (
        <div className="h-full flex flex-col bg-zinc-950/50">
            <div className="flex items-center justify-between p-3 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <Code className="w-4 h-4 text-blue-400" />
                    Inspect & Export
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
                    <Button variant="ghost" size="icon" className={`h-6 w-6 rounded-sm ${device === 'desktop' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`} onClick={() => setDevice('desktop')}>
                        <Monitor className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className={`h-6 w-6 rounded-sm ${device === 'tablet' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`} onClick={() => setDevice('tablet')}>
                        <Tablet className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className={`h-6 w-6 rounded-sm ${device === 'mobile' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`} onClick={() => setDevice('mobile')}>
                        <Smartphone className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="code" className="flex-1 flex flex-col min-h-0">
                <div className="px-3 pt-2 border-b border-zinc-800">
                    <TabsList className="bg-transparent h-8 p-0 gap-4">
                        <TabsTrigger value="code" className="h-8 px-0 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none bg-transparent gap-1.5 text-xs text-zinc-500">
                            <Terminal className="w-3.5 h-3.5" />
                            Generated Code
                        </TabsTrigger>
                        <TabsTrigger value="a11y" className="h-8 px-0 border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none bg-transparent gap-1.5 text-xs text-zinc-500">
                            <Activity className="w-3.5 h-3.5" />
                            Accessibility (A11y)
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="code" className="flex-1 flex flex-col min-h-0 m-0 outline-none p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <select
                            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={framework}
                            onChange={(e) => setFramework(e.target.value)}
                        >
                            <option value="react-tailwind">React + Tailwind</option>
                            <option value="html-css">HTML / CSS</option>
                        </select>

                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 border-zinc-800 hover:bg-zinc-800" onClick={() => handleCopy(generatedCode[framework as keyof typeof generatedCode])}>
                                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                {copied ? "Copied!" : "Copy"}
                            </Button>
                            <Button size="sm" className="h-7 text-[10px] gap-1.5 bg-blue-600 hover:bg-blue-700">
                                <SearchCode className="w-3 h-3" />
                                Send to Chamber
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 border border-zinc-800 rounded-md bg-[#0d0d0d]">
                        <pre className="p-4 text-[11px] font-mono text-zinc-300">
                            <code>{generatedCode[framework as keyof typeof generatedCode]}</code>
                        </pre>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="a11y" className="flex-1 min-h-0 m-0 outline-none overflow-y-auto p-4 space-y-4">
                    <div className="flex items-start gap-4 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <span className="text-emerald-400 font-bold text-sm">85</span>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-200">A11y Score</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Your design mostly complies with WCAG AA standards. Fix the warnings below to reach 100.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {accessibilityChecks.map(check => (
                            <div key={check.id} className={`p-3 rounded-md border text-sm ${check.passed ? 'bg-zinc-900/30 border-zinc-800/80' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-2">
                                        {check.passed ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <Activity className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <div className="font-medium text-xs text-zinc-200">{check.label}</div>
                                            {!check.passed && <div className="text-[10px] text-amber-400/80 mt-1">Found issue: {check.fix}</div>}
                                        </div>
                                    </div>
                                    {check.score && (
                                        <Badge variant="outline" className={`text-[9px] ${check.passed ? 'text-zinc-500 border-zinc-800' : 'text-amber-500 border-amber-500/30'}`}>
                                            {check.score}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}


"use client"

import { useState } from "react"
import { Shield, Coins, Zap, Check, Gauge, CheckSquare, Layers, Lock, Cpu, Brain, Flame, FileText, ArrowRight, Expand } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"

type ModelProvider = "Azure OpenAI" | "Anthropic" | "Anthropic Amazon" | "Google Vertex" | "Local OSS"

interface ModelSpecs {
  id: string
  name: string
  provider: ModelProvider
  contextWindow: number
  costInput: number // per 1k
  costOutput: number // per 1k
  latencyAvg: number // ms
  strengths: string[]
  paramsCount?: string
  tier: "Premium" | "Standard" | "Economy" | "Local"
  license: string
  metrics: {
    coding: number
    reasoning: number
    math: number
    speed: number
  }
}

const AVAILABLE_MODELS: ModelSpecs[] = [
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "Azure OpenAI",
    contextWindow: 128000,
    costInput: 0.01,
    costOutput: 0.03,
    latencyAvg: 1150,
    tier: "Premium",
    license: "Proprietary",
    paramsCount: "1.7T (est/MoE)",
    strengths: ["Complex Architecture", "JSON Mode", "Function Calling"],
    metrics: { coding: 92, reasoning: 95, math: 90, speed: 75 }
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    contextWindow: 200000,
    costInput: 0.015,
    costOutput: 0.075,
    latencyAvg: 1450,
    tier: "Premium",
    license: "Proprietary",
    strengths: ["Deep Reasoning", "Nuanced Code", "Massive Context"],
    metrics: { coding: 94, reasoning: 96, math: 85, speed: 60 }
  },
  {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic Amazon",
    contextWindow: 200000,
    costInput: 0.00025,
    costOutput: 0.00125,
    latencyAvg: 450,
    tier: "Economy",
    license: "Proprietary",
    strengths: ["Ultra-fast", "Parsing", "Cost-efficiency"],
    metrics: { coding: 78, reasoning: 75, math: 65, speed: 98 }
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google Vertex",
    contextWindow: 1000000,
    costInput: 0.007,
    costOutput: 0.021,
    latencyAvg: 1300,
    tier: "Premium",
    license: "Proprietary",
    strengths: ["Multi-modal", "1M+ Context", "System Analysis"],
    metrics: { coding: 88, reasoning: 90, math: 88, speed: 70 }
  },
  {
    id: "llama-3-70b",
    name: "Llama 3 70B",
    provider: "Local OSS",
    contextWindow: 8192,
    costInput: 0,
    costOutput: 0,
    latencyAvg: 850,
    tier: "Local",
    license: "Meta Llama",
    paramsCount: "70B",
    strengths: ["Data Privacy", "No API Cost", "Open Weights"],
    metrics: { coding: 85, reasoning: 86, math: 80, speed: 85 }
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Local OSS",
    contextWindow: 32000,
    costInput: 0,
    costOutput: 0,
    latencyAvg: 900,
    tier: "Local",
    license: "Apache 2.0",
    paramsCount: "123B",
    strengths: ["Multilingual", "Fast Inference", "Enterprise Grade"],
    metrics: { coding: 86, reasoning: 84, math: 82, speed: 82 }
  }
]

export default function ModelComparison() {
  const [selectedModels, setSelectedModels] = useState<string[]>(["gpt-4-turbo", "claude-3-opus"])
  const [activeBenchmark, setActiveBenchmark] = useState<"Radar" | "Pricing" | "Context">("Radar")

  const handleToggleModel = (id: string) => {
    if (selectedModels.includes(id)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter(m => m !== id))
      }
    } else {
      if (selectedModels.length < 3) {
        setSelectedModels([...selectedModels, id])
      }
    }
  }

  const formatCost = (cost: number) => cost === 0 ? "Free" : `$${cost.toFixed(3)}`
  const formatContext = (ctx: number) => {
    if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(1)}M`
    return `${Math.round(ctx / 1000)}K`
  }

  const getProviderColor = (provider: ModelProvider) => {
    switch (provider) {
      case "Azure OpenAI": return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
      case "Anthropic":
      case "Anthropic Amazon": return "text-orange-400 border-orange-400/30 bg-orange-400/10"
      case "Google Vertex": return "text-blue-400 border-blue-400/30 bg-blue-400/10"
      case "Local OSS": return "text-purple-400 border-purple-400/30 bg-purple-400/10"
      default: return "text-zinc-400 border-zinc-400/30 bg-zinc-400/10"
    }
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-100">
            <Layers className="w-5 h-5 text-blue-400" />
            Model Benchmark & Comparison
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">Evaluate models across capabilities, context size, and economic constraints.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-5 overflow-x-auto pb-2 tailwind-scrollbar-hide">
        {AVAILABLE_MODELS.map(model => {
          const isSelected = selectedModels.includes(model.id)
          return (
            <button
              key={model.id}
              onClick={() => handleToggleModel(model.id)}
              className={`shrink-0 flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all max-w-[200px] w-[180px] ${
                isSelected 
                  ? "border-blue-500/50 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.1)]" 
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
              }`}
            >
              <div className={`w-4 h-4 rounded-sm flex items-center justify-center border shrink-0 ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-zinc-700 bg-zinc-950"}`}>
                {isSelected && <Check className="w-3 h-3" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-200 truncate shadow-sm">{model.name}</div>
                <div className="text-[10px] text-zinc-500 truncate">{model.provider}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Left Side: Side-by-side comparison */}
        <div className="lg:col-span-2 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/50 flex">
          {selectedModels.map((modelId, index) => {
            const model = AVAILABLE_MODELS.find(m => m.id === modelId)!
            return (
              <div key={model.id} className={`flex-1 min-w-[280px] flex flex-col border-r border-zinc-800 last:border-r-0`}>
                <div className="p-4 border-b border-zinc-800 bg-zinc-900/40">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm text-zinc-100">{model.name}</h3>
                    <Badge variant="outline" className={`text-[9px] h-4 py-0 ${getProviderColor(model.provider)}`}>
                      {model.provider}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[9px] font-normal border-zinc-800 bg-zinc-950 text-zinc-400">
                      {model.tier} Tier
                    </Badge>
                    <Badge variant="outline" className="text-[9px] font-normal border-zinc-800 bg-zinc-950 text-zinc-400">
                      <Lock className="w-2.5 h-2.5 mr-1" /> {model.license}
                    </Badge>
                    {model.paramsCount && (
                      <Badge variant="outline" className="text-[9px] font-normal border-zinc-800 bg-zinc-950 text-zinc-400">
                        {model.paramsCount} Params
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-5 flex-1 overflow-y-auto">
                  {/* Economics & Limits */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> Constraints
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-md p-2">
                        <div className="text-[10px] text-zinc-500 mb-0.5">Context Window</div>
                        <div className="font-mono text-xs font-semibold text-zinc-200">{formatContext(model.contextWindow)}</div>
                      </div>
                      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-md p-2">
                        <div className="text-[10px] text-zinc-500 mb-0.5">Avg Latency</div>
                        <div className="font-mono text-xs font-semibold text-zinc-200">{model.latencyAvg}ms</div>
                      </div>
                      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-md p-2">
                        <div className="text-[10px] text-zinc-500 mb-0.5 mt-1">Input / 1k</div>
                        <div className="font-mono text-xs font-semibold text-emerald-400">{formatCost(model.costInput)}</div>
                      </div>
                      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-md p-2">
                        <div className="text-[10px] text-zinc-500 mb-0.5 mt-1">Output / 1k</div>
                        <div className="font-mono text-xs font-semibold text-red-400">{formatCost(model.costOutput)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Capabilities Scores */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Gauge className="w-3 h-3" /> Capabilities
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-zinc-400">Coding Generation</span>
                          <span className="text-zinc-300 font-mono">{model.metrics.coding}/100</span>
                        </div>
                        <Progress value={model.metrics.coding} className="h-1.5 bg-zinc-900" />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1 mt-1.5">
                          <span className="text-zinc-400">Deep Reasoning</span>
                          <span className="text-zinc-300 font-mono">{model.metrics.reasoning}/100</span>
                        </div>
                        <Progress value={model.metrics.reasoning} className="h-1.5 bg-zinc-900" />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1 mt-1.5">
                          <span className="text-zinc-400">Math & Logic (GSM8k)</span>
                          <span className="text-zinc-300 font-mono">{model.metrics.math}/100</span>
                        </div>
                        <Progress value={model.metrics.math} className="h-1.5 bg-zinc-900" />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1 mt-1.5">
                          <span className="text-zinc-400">Inference Speed</span>
                          <span className="text-zinc-300 font-mono">{model.metrics.speed}/100</span>
                        </div>
                        <Progress value={model.metrics.speed} className="h-1.5 bg-zinc-900" />
                      </div>
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3 h-3" /> Key Strengths
                    </h4>
                    <ul className="space-y-1">
                      {model.strengths.map(s => (
                        <li key={s} className="flex items-start gap-1.5 text-xs text-zinc-300">
                          <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                </div>
              </div>
            )
          })}
          
          {selectedModels.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-16">
              <Brain className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Select up to 3 models above to compare.</p>
            </div>
          )}
        </div>

        {/* Right Side: Execution Mock or Extra Meta */}
        <div className="flex flex-col gap-4">
           <Card className="bg-zinc-900/40 border-zinc-800 shadow-sm shrink-0">
              <CardHeader className="p-3 pb-2 border-b border-zinc-800/50">
                <CardTitle className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Routing Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 text-xs text-zinc-400 leading-relaxed bg-zinc-950/20">
                {selectedModels.length > 0 ? (
                  <>
                    <p className="mb-2">Based on your selection, an optimal cascading router pattern:</p>
                    <div className="bg-zinc-950 border border-zinc-800 p-2 rounded text-[11px] font-mono mb-2 divide-y divide-zinc-800">
                       <div className="pb-1.5 text-blue-400">1. Attempt: {AVAILABLE_MODELS.find(m => m.id === selectedModels[0])?.name} (Primary)</div>
                       {selectedModels[1] && <div className="py-1.5 text-emerald-400">2. Fallback: {AVAILABLE_MODELS.find(m => m.id === selectedModels[1])?.name}</div>}
                       {selectedModels[2] && <div className="pt-1.5 text-amber-400">3. Fallback: {AVAILABLE_MODELS.find(m => m.id === selectedModels[2])?.name}</div>}
                    </div>
                  </>
                ) : (
                  "Select models to see router recommendations."
                )}
              </CardContent>
           </Card>

           <Card className="bg-zinc-900/40 border-zinc-800 shadow-sm flex-1 flex flex-col">
              <CardHeader className="p-3 pb-2 border-b border-zinc-800/50 flex-row justify-between items-center">
                <CardTitle className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  A/B Test Execution
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-zinc-200">
                  <Expand className="w-3 h-3" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex items-center justify-center">
                <div className="text-center p-6 opacity-40">
                  <Cpu className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                  <p className="text-[11px] text-zinc-400">Run parallel tests against the chosen models using a Prompt Template.</p>
                  <Button variant="outline" size="sm" className="mt-3 text-[10px] h-6 px-3 border-zinc-700" disabled>Coming Soon</Button>
                </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}

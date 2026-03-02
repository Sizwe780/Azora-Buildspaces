"use client"

import { useState } from "react"
import {
  ChevronRight,
  ChevronDown,
  Eye,
  Plus,
  X,
  Play,
  Pause,
  SkipForward,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  Square,
  Bug,
  Variable,
  Layers,
  Terminal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Debug state types
interface DebugVariable {
  name: string
  value: string
  type: string
  children?: DebugVariable[]
  changed?: boolean
}

interface CallStackFrame {
  id: number
  name: string
  file: string
  line: number
  column: number
  isActive?: boolean
}

interface WatchExpression {
  id: string
  expression: string
  value: string
  type: string
  error?: boolean
}

interface Breakpoint {
  id: string
  file: string
  line: number
  enabled: boolean
  condition?: string
  hitCount?: number
}

// Demo data
const demoLocals: DebugVariable[] = [
  { name: "count", value: "42", type: "number", changed: true },
  { name: "message", value: '"Hello, Azora!"', type: "string" },
  { name: "isLoading", value: "false", type: "boolean" },
  {
    name: "user",
    value: "Object",
    type: "object",
    children: [
      { name: "id", value: '"usr_abc123"', type: "string" },
      { name: "name", value: '"Developer"', type: "string" },
      { name: "role", value: '"admin"', type: "string" },
      {
        name: "preferences",
        value: "Object",
        type: "object",
        children: [
          { name: "theme", value: '"dark"', type: "string" },
          { name: "fontSize", value: "14", type: "number" },
        ],
      },
    ],
  },
  {
    name: "items",
    value: "Array(3)",
    type: "array",
    children: [
      { name: "0", value: '"React"', type: "string" },
      { name: "1", value: '"Next.js"', type: "string" },
      { name: "2", value: '"TypeScript"', type: "string" },
    ],
  },
]

const demoCallStack: CallStackFrame[] = [
  { id: 1, name: "handleSubmit", file: "form.tsx", line: 42, column: 8, isActive: true },
  { id: 2, name: "processData", file: "utils.ts", line: 128, column: 12 },
  { id: 3, name: "validateInput", file: "validation.ts", line: 56, column: 4 },
  { id: 4, name: "onFormChange", file: "hooks.ts", line: 23, column: 6 },
  { id: 5, name: "useFormHandler", file: "hooks.ts", line: 8, column: 2 },
]

const demoWatchExpressions: WatchExpression[] = [
  { id: "w1", expression: "count * 2", value: "84", type: "number" },
  { id: "w2", expression: "user.name", value: '"Developer"', type: "string" },
  { id: "w3", expression: "items.length", value: "3", type: "number" },
]

const demoBreakpoints: Breakpoint[] = [
  { id: "bp1", file: "form.tsx", line: 42, enabled: true },
  { id: "bp2", file: "utils.ts", line: 128, enabled: true, condition: "count > 10" },
  { id: "bp3", file: "validation.ts", line: 56, enabled: false },
  { id: "bp4", file: "hooks.ts", line: 23, enabled: true, hitCount: 5 },
]

// Variable tree node component
function VariableNode({ variable, depth = 0 }: { variable: DebugVariable; depth?: number }) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = variable.children && variable.children.length > 0

  const typeColor = (() => {
    switch (variable.type) {
      case "string": return "text-emerald-400"
      case "number": return "text-blue-400"
      case "boolean": return "text-amber-400"
      case "object": return "text-violet-400"
      case "array": return "text-cyan-400"
      default: return "text-muted-foreground"
    }
  })()

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-0.5 px-2 hover:bg-accent/30 cursor-pointer text-[12px] transition-colors group",
          variable.changed && "bg-yellow-500/5"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand/Collapse */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )
          ) : null}
        </span>

        {/* Name */}
        <span className={cn("font-medium", variable.changed && "text-yellow-300")}>
          {variable.name}
        </span>
        <span className="text-muted-foreground/50 mx-0.5">=</span>

        {/* Value */}
        <span className={cn("truncate", typeColor)}>{variable.value}</span>

        {/* Type hint on hover */}
        <span className="text-[10px] text-muted-foreground/40 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {variable.type}
        </span>
      </div>

      {/* Children */}
      {expanded && variable.children?.map((child, i) => (
        <VariableNode key={`${child.name}-${i}`} variable={child} depth={depth + 1} />
      ))}
    </div>
  )
}

interface DebugVariablesPanelProps {
  isDebugging?: boolean
}

export function DebugVariablesPanel({ isDebugging = true }: DebugVariablesPanelProps) {
  const [activeTab, setActiveTab] = useState<"variables" | "watch" | "callstack" | "breakpoints">("variables")
  const [watchInput, setWatchInput] = useState("")
  const [watchExpressions, setWatchExpressions] = useState(demoWatchExpressions)
  const [breakpoints, setBreakpoints] = useState(demoBreakpoints)
  const [variableScope, setVariableScope] = useState<"locals" | "closure" | "global">("locals")

  const tabs = [
    { id: "variables" as const, label: "Variables", icon: Variable },
    { id: "watch" as const, label: "Watch", icon: Eye },
    { id: "callstack" as const, label: "Call Stack", icon: Layers },
    { id: "breakpoints" as const, label: "Breakpoints", icon: Bug },
  ]

  const addWatch = () => {
    if (!watchInput.trim()) return
    setWatchExpressions((prev) => [
      ...prev,
      {
        id: `w${Date.now()}`,
        expression: watchInput,
        value: "evaluating...",
        type: "unknown",
      },
    ])
    setWatchInput("")
  }

  const removeWatch = (id: string) => {
    setWatchExpressions((prev) => prev.filter((w) => w.id !== id))
  }

  const toggleBreakpoint = (id: string) => {
    setBreakpoints((prev) =>
      prev.map((bp) => (bp.id === id ? { ...bp, enabled: !bp.enabled } : bp))
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full bg-background">
        {/* Debug Controls */}
        {isDebugging && (
          <div className="flex items-center justify-center gap-1 px-2 py-1.5 border-b border-border/30 bg-primary/5">
            {[
              { icon: Play, label: "Continue (F5)", color: "text-emerald-400 hover:bg-emerald-500/20" },
              { icon: SkipForward, label: "Step Over (F10)", color: "hover:bg-accent/50" },
              { icon: ArrowDownToLine, label: "Step Into (F11)", color: "hover:bg-accent/50" },
              { icon: ArrowUpFromLine, label: "Step Out (Shift+F11)", color: "hover:bg-accent/50" },
              { icon: RotateCcw, label: "Restart (Ctrl+Shift+F5)", color: "text-emerald-400 hover:bg-emerald-500/20" },
              { icon: Square, label: "Stop (Shift+F5)", color: "text-red-400 hover:bg-red-500/20" },
            ].map(({ icon: Icon, label, color }) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn("w-7 h-7 rounded", color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">
                  {label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border/30">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-[11px] transition-colors border-b-2",
                activeTab === id
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/20"
              )}
              onClick={() => setActiveTab(id)}
            >
              <Icon className="w-3 h-3" />
              {label}
              {id === "breakpoints" && (
                <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                  {breakpoints.filter((b) => b.enabled).length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {activeTab === "variables" && (
            <div className="py-1">
              {/* Scope selector */}
              <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/20">
                {(["locals", "closure", "global"] as const).map((scope) => (
                  <button
                    key={scope}
                    className={cn(
                      "px-2 py-0.5 text-[10px] rounded capitalize transition-colors",
                      variableScope === scope
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setVariableScope(scope)}
                  >
                    {scope}
                  </button>
                ))}
              </div>

              {demoLocals.map((v, i) => (
                <VariableNode key={`${v.name}-${i}`} variable={v} />
              ))}
            </div>
          )}

          {activeTab === "watch" && (
            <div className="py-1">
              {/* Add Watch Input */}
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/20">
                <Input
                  value={watchInput}
                  onChange={(e) => setWatchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addWatch()}
                  placeholder="Add expression..."
                  className="h-6 text-[12px] bg-transparent border-border/40"
                />
                <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0" onClick={addWatch}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              {watchExpressions.map((expr) => (
                <div
                  key={expr.id}
                  className="flex items-center gap-2 px-3 py-1 hover:bg-accent/20 group text-[12px]"
                >
                  <span className="text-foreground font-medium">{expr.expression}</span>
                  <span className="text-muted-foreground/40">=</span>
                  <span className={cn("truncate", expr.error ? "text-red-400" : "text-blue-400")}>
                    {expr.value}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100"
                    onClick={() => removeWatch(expr.id)}
                  >
                    <X className="w-2.5 h-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "callstack" && (
            <div className="py-1">
              {demoCallStack.map((frame) => (
                <div
                  key={frame.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-[12px] cursor-pointer hover:bg-accent/20 transition-colors",
                    frame.isActive && "bg-primary/10 border-l-2 border-primary"
                  )}
                >
                  <span className={cn("font-medium", frame.isActive ? "text-primary" : "text-foreground")}>
                    {frame.name}
                  </span>
                  <span className="text-muted-foreground/50 text-[10px] ml-auto">
                    {frame.file}:{frame.line}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "breakpoints" && (
            <div className="py-1">
              {breakpoints.map((bp) => (
                <div
                  key={bp.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/20 group text-[12px]"
                >
                  <input
                    type="checkbox"
                    checked={bp.enabled}
                    onChange={() => toggleBreakpoint(bp.id)}
                    className="w-3.5 h-3.5 rounded border-border/60 accent-red-500"
                  />
                  <div className={cn("w-2 h-2 rounded-full shrink-0", bp.enabled ? "bg-red-500" : "bg-muted-foreground/30")} />
                  <span className="text-foreground">{bp.file}</span>
                  <span className="text-muted-foreground/50">:{bp.line}</span>
                  {bp.condition && (
                    <Badge variant="outline" className="h-4 px-1 text-[9px] border-amber-500/30 text-amber-400">
                      {bp.condition}
                    </Badge>
                  )}
                  {bp.hitCount && (
                    <Badge variant="outline" className="h-4 px-1 text-[9px] border-blue-500/30 text-blue-400">
                      hits: {bp.hitCount}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}

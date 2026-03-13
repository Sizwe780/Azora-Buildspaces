"use client"

import { useState } from "react"
import {
  Sparkles, FileCode, Terminal, GitBranch, Puzzle, Keyboard,
  BookOpen, Zap, Users, Rocket, ArrowRight, X
} from "lucide-react"
import { cn } from "@/lib/utils"

interface WelcomeTabProps {
  onClose?: () => void
  onOpenFile?: (path: string) => void
  onAction?: (action: string) => void
}

const QUICK_ACTIONS = [
  { id: 'new-file', icon: FileCode, label: 'New File', shortcut: 'Ctrl+N', description: 'Create an empty file' },
  { id: 'open-terminal', icon: Terminal, label: 'Open Terminal', shortcut: 'Ctrl+`', description: 'Open integrated terminal' },
  { id: 'git-clone', icon: GitBranch, label: 'Clone Repo', shortcut: '', description: 'Clone a Git repository' },
  { id: 'extensions', icon: Puzzle, label: 'Extensions', shortcut: 'Ctrl+Shift+X', description: 'Browse extensions' },
  { id: 'keybindings', icon: Keyboard, label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', description: 'Customize shortcuts' },
  { id: 'docs', icon: BookOpen, label: 'Documentation', shortcut: '', description: 'Read the docs' },
]

const RECENT_FILES = [
  'src/app/page.tsx',
  'src/components/layout.tsx',
  'package.json',
  'README.md',
]

export function WelcomeTab({ onClose, onOpenFile, onAction }: WelcomeTabProps) {
  const [showTips, setShowTips] = useState(true)

  return (
    <div className="h-full overflow-auto bg-editor-background">
      <div className="max-w-2xl mx-auto py-12 px-6">
        {/* Close button */}
        {onClose && (
          <div className="flex justify-end mb-4">
            <button onClick={onClose} className="p-1 rounded hover:bg-muted/50 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 border border-primary/20 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Welcome to Azora Buildspaces</h1>
          <p className="text-sm text-muted-foreground">Your AI-powered cloud development environment</p>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => onAction?.(action.id)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-colors text-left group"
              >
                <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{action.label}</div>
                  <div className="text-[11px] text-muted-foreground">{action.description}</div>
                </div>
                {action.shortcut && (
                  <kbd className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                    {action.shortcut}
                  </kbd>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Files */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-primary" />
            Recent Files
          </h2>
          <div className="space-y-1">
            {RECENT_FILES.map(file => (
              <button
                key={file}
                onClick={() => onOpenFile?.(file)}
                className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted/50 text-left group"
              >
                <FileCode className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{file}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground ml-auto transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Tips */}
        {showTips && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Tips & Tricks
              </h3>
              <button onClick={() => setShowTips(false)} className="text-xs text-muted-foreground hover:text-foreground">Hide</button>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Press <kbd className="font-mono bg-muted/50 px-1 rounded">Ctrl+Shift+P</kbd> to open the Command Palette</li>
              <li>Press <kbd className="font-mono bg-muted/50 px-1 rounded">Ctrl+P</kbd> to quickly open files</li>
              <li>Press <kbd className="font-mono bg-muted/50 px-1 rounded">Ctrl+G</kbd> to go to a specific line</li>
              <li>Press <kbd className="font-mono bg-muted/50 px-1 rounded">Ctrl+K Z</kbd> to enter Zen Mode</li>
              <li>Use <kbd className="font-mono bg-muted/50 px-1 rounded">F2</kbd> to rename symbols across files</li>
              <li>Split editors with <kbd className="font-mono bg-muted/50 px-1 rounded">Ctrl+\</kbd></li>
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Real-time Collaboration</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI-Powered</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Earn AZR Tokens</span>
          </div>
        </div>
      </div>
    </div>
  )
}

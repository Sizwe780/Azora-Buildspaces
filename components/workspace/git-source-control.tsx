"use client"

import { useState } from "react"
import {
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Plus,
  Minus,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronRight,
  FileCode,
  FilePlus2,
  FileX2,
  FileEdit,
  Upload,
  Download,
  RefreshCw,
  MoreHorizontal,
  MessageSquare,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useWorkbench } from "@/lib/stores/workbench-store"

type FileStatus = "modified" | "added" | "deleted" | "renamed" | "untracked"

interface GitFile {
  path: string
  status: FileStatus
  staged: boolean
  additions: number
  deletions: number
}

interface GitCommitEntry {
  hash: string
  message: string
  author: string
  date: string
  branch?: string
}

const statusConfig: Record<FileStatus, { icon: any; color: string; label: string }> = {
  modified: { icon: FileEdit, color: "text-amber-400", label: "M" },
  added: { icon: FilePlus2, color: "text-emerald-400", label: "A" },
  deleted: { icon: FileX2, color: "text-red-400", label: "D" },
  renamed: { icon: FileCode, color: "text-blue-400", label: "R" },
  untracked: { icon: FilePlus2, color: "text-emerald-300", label: "U" },
}

const demoFiles: GitFile[] = [
  { path: "components/workspace/editor-panel.tsx", status: "modified", staged: true, additions: 24, deletions: 8 },
  { path: "lib/stores/workbench-store.ts", status: "modified", staged: true, additions: 45, deletions: 12 },
  { path: "components/workspace/layout/title-bar.tsx", status: "added", staged: false, additions: 178, deletions: 0 },
  { path: "components/workspace/notifications-center.tsx", status: "added", staged: false, additions: 256, deletions: 0 },
  { path: "components/workspace/diff-editor.tsx", status: "added", staged: false, additions: 198, deletions: 0 },
  { path: "lib/services/old-service.ts", status: "deleted", staged: false, additions: 0, deletions: 87 },
  { path: "components/workspace/debug-variables-panel.tsx", status: "added", staged: false, additions: 312, deletions: 0 },
]

const demoCommits: GitCommitEntry[] = [
  { hash: "a1b2c3d", message: "feat: Add premium UI components for Code Chamber", author: "Developer", date: "2 minutes ago", branch: "HEAD" },
  { hash: "e4f5g6h", message: "fix: Resolve TypeScript errors in API routes", author: "Developer", date: "15 minutes ago" },
  { hash: "i7j8k9l", message: "feat: Add Tasks 20-24 services and views", author: "Developer", date: "1 hour ago" },
  { hash: "m0n1o2p", message: "refactor: Upgrade activity bar with overflow menu", author: "Developer", date: "2 hours ago" },
  { hash: "q3r4s5t", message: "chore: Initial workspace setup", author: "Developer", date: "1 day ago" },
]

export function GitSourceControlView() {
  const [commitMessage, setCommitMessage] = useState("")
  const [activeTab, setActiveTab] = useState<"changes" | "commits" | "branches">("changes")
  const [expandStaged, setExpandStaged] = useState(true)
  const [expandUnstaged, setExpandUnstaged] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const { openDiffEditor } = useWorkbench()

  const staged = demoFiles.filter((f) => f.staged)
  const unstaged = demoFiles.filter((f) => !f.staged)

  const totalAdditions = demoFiles.reduce((acc, f) => acc + f.additions, 0)
  const totalDeletions = demoFiles.reduce((acc, f) => acc + f.deletions, 0)

  const handleFileClick = (file: GitFile) => {
    setSelectedFile(file.path)
    // Open diff editor for modified files
    if (file.status === "modified") {
      const fileName = file.path.split("/").pop() || file.path
      openDiffEditor(
        `${fileName} (HEAD)`,
        `${fileName} (Working)`,
      )
    }
  }

  const renderFileItem = (file: GitFile) => {
    const config = statusConfig[file.status]
    const Icon = config.icon
    const fileName = file.path.split("/").pop() || file.path
    const dirPath = file.path.split("/").slice(0, -1).join("/")

    return (
      <div
        key={file.path}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 hover:bg-accent/20 cursor-pointer text-[12px] transition-colors group",
          selectedFile === file.path && "bg-primary/10"
        )}
        onClick={() => handleFileClick(file)}
      >
        <Icon className={cn("w-3.5 h-3.5 shrink-0", config.color)} />
        <span className="text-foreground truncate">{fileName}</span>
        <span className="text-muted-foreground/40 text-[10px] truncate">{dirPath}</span>

        <div className="flex items-center gap-1 ml-auto shrink-0">
          {/* Diff stats */}
          {file.additions > 0 && (
            <span className="text-[10px] text-emerald-400">+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className="text-[10px] text-red-400">-{file.deletions}</span>
          )}

          {/* Status badge */}
          <span className={cn("text-[10px] font-bold w-4 text-center", config.color)}>
            {config.label}
          </span>

          {/* Actions on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {file.staged ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-5 h-5">
                    <Minus className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">Unstage</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-5 h-5">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-[11px]">Stage</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-5 h-5">
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-[11px]">Discard</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-3 py-2 border-b border-border/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Source Control</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {demoFiles.length} changes
              </Badge>
            </div>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">Refresh</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">Pull</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6">
                    <Upload className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">Push</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Commit Message Input */}
          <div className="relative">
            <Input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Message (Ctrl+Enter to commit)"
              className="h-8 text-[12px] pr-8 bg-input/50 border-border/40"
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-6 h-6 absolute right-1 top-1/2 -translate-y-1/2",
                commitMessage ? "text-primary" : "text-muted-foreground"
              )}
              disabled={!commitMessage}
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Branch & Stats */}
          <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              <span>main</span>
              <span className="text-primary">↑2 ↓0</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">+{totalAdditions}</span>
              <span className="text-red-400">-{totalDeletions}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/30">
          {(["changes", "commits", "branches"] as const).map((tab) => (
            <button
              key={tab}
              className={cn(
                "flex-1 py-1.5 text-[11px] capitalize transition-colors border-b-2",
                activeTab === tab
                  ? "text-foreground border-primary font-medium"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {activeTab === "changes" && (
            <div>
              {/* Staged Changes */}
              {staged.length > 0 && (
                <div>
                  <button
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent/10 uppercase tracking-wide"
                    onClick={() => setExpandStaged(!expandStaged)}
                  >
                    {expandStaged ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Staged Changes
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-auto">
                      {staged.length}
                    </Badge>
                  </button>
                  {expandStaged && staged.map(renderFileItem)}
                </div>
              )}

              {/* Unstaged Changes */}
              {unstaged.length > 0 && (
                <div>
                  <button
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent/10 uppercase tracking-wide"
                    onClick={() => setExpandUnstaged(!expandUnstaged)}
                  >
                    {expandUnstaged ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Changes
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-auto">
                      {unstaged.length}
                    </Badge>
                  </button>
                  {expandUnstaged && unstaged.map(renderFileItem)}
                </div>
              )}
            </div>
          )}

          {activeTab === "commits" && (
            <div className="py-1">
              {demoCommits.map((commit) => (
                <div
                  key={commit.hash}
                  className="flex items-start gap-2 px-3 py-2 hover:bg-accent/20 cursor-pointer transition-colors border-b border-border/10"
                >
                  <GitCommit className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] text-foreground truncate">{commit.message}</p>
                      {commit.branch && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px] border-primary/30 text-primary shrink-0">
                          {commit.branch}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="font-mono text-primary/60">{commit.hash}</span>
                      <span>·</span>
                      <span>{commit.author}</span>
                      <span>·</span>
                      <Clock className="w-2.5 h-2.5" />
                      <span>{commit.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "branches" && (
            <div className="py-2">
              {[
                { name: "main", current: true, ahead: 2, behind: 0 },
                { name: "feature/code-chamber-ui", current: false, ahead: 0, behind: 5 },
                { name: "develop", current: false, ahead: 1, behind: 3 },
                { name: "release/v2.0", current: false, ahead: 0, behind: 0 },
              ].map((branch) => (
                <div
                  key={branch.name}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 hover:bg-accent/20 cursor-pointer text-[12px] transition-colors",
                    branch.current && "bg-primary/5 border-l-2 border-primary"
                  )}
                >
                  <GitBranch className={cn("w-3.5 h-3.5 shrink-0", branch.current ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("truncate", branch.current ? "text-primary font-medium" : "text-foreground")}>
                    {branch.name}
                  </span>
                  {branch.current && (
                    <Badge variant="outline" className="h-4 px-1 text-[9px] border-primary/30 text-primary">
                      current
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 ml-auto text-[10px] text-muted-foreground">
                    {branch.ahead > 0 && <span className="text-emerald-400">↑{branch.ahead}</span>}
                    {branch.behind > 0 && <span className="text-amber-400">↓{branch.behind}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}

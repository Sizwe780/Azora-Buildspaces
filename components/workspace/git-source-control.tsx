"use client"

import { useState, useEffect, useCallback } from "react"
import {
  GitBranch,
  GitCommit,
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
  Clock,
  Loader2,
  AlertCircle,
  Archive,
  Trash2,
  ArrowDown,
  Copy,
  FolderPlus,
  Sparkles,
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

interface GitBranchEntry {
  name: string
  current: boolean
  ahead?: number
  behind?: number
}

interface GitStashEntry {
  index: number
  message: string
  branch: string
}

const PROJECT_ID = "current"

const statusConfig: Record<FileStatus, { icon: any; color: string; label: string }> = {
  modified: { icon: FileEdit, color: "text-amber-400", label: "M" },
  added: { icon: FilePlus2, color: "text-emerald-400", label: "A" },
  deleted: { icon: FileX2, color: "text-red-400", label: "D" },
  renamed: { icon: FileCode, color: "text-blue-400", label: "R" },
  untracked: { icon: FilePlus2, color: "text-emerald-300", label: "U" },
}

export function GitSourceControlView() {
  const [commitMessage, setCommitMessage] = useState("")
  const [activeTab, setActiveTab] = useState<"changes" | "commits" | "branches" | "stash">("changes")
  const [expandStaged, setExpandStaged] = useState(true)
  const [expandUnstaged, setExpandUnstaged] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const { openDiffEditor, setGitBranchInfo } = useWorkbench()

  // Real data from backend APIs
  const [files, setFiles] = useState<GitFile[]>([])
  const [commits, setCommits] = useState<GitCommitEntry[]>([])
  const [branches, setBranches] = useState<GitBranchEntry[]>([])
  const [stashes, setStashes] = useState<GitStashEntry[]>([])
  const [currentBranch, setCurrentBranch] = useState("main")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showCreateBranch, setShowCreateBranch] = useState(false)
  const [newBranchName, setNewBranchName] = useState("")
  const [stashMessage, setStashMessage] = useState("")
  const [agenticSummary, setAgenticSummary] = useState<string | null>(null)
  const [agenticLoading, setAgenticLoading] = useState(false)

  // ── API helper ──
  const gitApi = useCallback(async (endpoint: string, options?: RequestInit) => {
    const res = await fetch(`/api/projects/${PROJECT_ID}/git/${endpoint}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(data.error || `Git API error: ${res.status}`)
    }
    return res.json()
  }, [])

  // ── Refresh status (real git) ──
  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await gitApi("status")
      const allFiles: GitFile[] = []

      if (data.stagedFiles) {
        for (const f of data.stagedFiles) {
          const path = typeof f === "string" ? f : f.path
          allFiles.push({ path, status: "modified", staged: true, additions: 0, deletions: 0 })
        }
      }
      if (data.unstagedFiles) {
        for (const f of data.unstagedFiles) {
          const path = typeof f === "string" ? f : f.path
          if (!allFiles.find((x) => x.path === path)) {
            allFiles.push({ path, status: "modified", staged: false, additions: 0, deletions: 0 })
          }
        }
      }

      setFiles(allFiles)
      setCurrentBranch(data.branch || "main")
      // Push branch name to workbench store for status bar
      setGitBranchInfo(data.branch || "main", 0, 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [gitApi])

  // ── Refresh commits ──
  const refreshCommits = useCallback(async () => {
    try {
      const data = await gitApi("log?limit=30")
      setCommits(data.commits || [])
    } catch { /* ignore */ }
  }, [gitApi])

  // ── Refresh branches ──
  const refreshBranches = useCallback(async () => {
    try {
      const data = await gitApi("branches")
      setBranches(data.branches || [])
      // Update workbench store with current branch info for status bar
      const current = (data.branches || []).find((b: GitBranchEntry) => b.current)
      if (current) {
        setGitBranchInfo(current.name, current.ahead || 0, current.behind || 0)
      }
    } catch { /* ignore */ }
  }, [gitApi, setGitBranchInfo])

  // ── Mutations ──
  const stageFile = async (path: string) => {
    try {
      setActionLoading(`stage-${path}`)
      await gitApi("stage", { method: "POST", body: JSON.stringify({ files: [path] }) })
      await refreshStatus()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  const unstageFile = async (path: string) => {
    try {
      setActionLoading(`unstage-${path}`)
      await gitApi("unstage", { method: "POST", body: JSON.stringify({ files: [path] }) })
      await refreshStatus()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  const stageAll = async () => {
    try {
      setActionLoading("stage-all")
      await gitApi("stage", { method: "POST", body: JSON.stringify({ files: [] }) })
      await refreshStatus()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  const discardFile = async (path: string) => {
    try {
      setActionLoading(`discard-${path}`)
      await gitApi("checkout", { method: "POST", body: JSON.stringify({ files: [path] }) })
      await refreshStatus()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  const commitChanges = async () => {
    if (!commitMessage.trim()) return
    try {
      setActionLoading("commit")
      await gitApi("commit", { method: "POST", body: JSON.stringify({ message: commitMessage }) })
      setCommitMessage("")
      setAgenticSummary(null)
      await refreshStatus()
      await refreshCommits()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  // ── Agentic Staging: Elara summarizes changes before commit ──
  const agenticStaging = async () => {
    try {
      setAgenticLoading(true)
      setAgenticSummary(null)

      // Get list of changed files for context
      const changedFiles = files.map(f => `${f.status}: ${f.path}`).join("\n")

      const res = await fetch("/api/agents/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          context: {
            message: `Summarize the following git changes for a commit message. Be concise (1-2 sentences). Changed files:\n${changedFiles}`,
            agent: "elara",
          },
          sessionId: "agentic-staging-" + Date.now(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const summary = data.message || data.result || "Changes ready for commit."
        setAgenticSummary(summary)
        // Auto-fill commit message with the summary
        if (!commitMessage.trim()) {
          setCommitMessage(summary)
        }
      } else {
        // Fallback: generate a simple summary locally
        const staged = files.filter(f => f.staged)
        const unstaged = files.filter(f => !f.staged)
        const summary = `${staged.length} staged, ${unstaged.length} unstaged changes across ${files.length} files`
        setAgenticSummary(summary)
      }
    } catch {
      setAgenticSummary("Unable to generate summary. Review changes manually.")
    } finally {
      setAgenticLoading(false)
    }
  }

  const pullChanges = async () => {
    try {
      setActionLoading("pull")
      await gitApi("sync", { method: "POST", body: JSON.stringify({ action: "pull" }) })
      await refreshStatus()
      await refreshCommits()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  const pushChanges = async () => {
    try {
      setActionLoading("push")
      await gitApi("sync", { method: "POST", body: JSON.stringify({ action: "push" }) })
      await refreshStatus()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  // ── Branch checkout ──
  const checkoutBranch = async (branch: string) => {
    try {
      setActionLoading(`checkout-${branch}`)
      await gitApi("checkout", { method: "POST", body: JSON.stringify({ branch }) })
      await refreshStatus()
      await refreshBranches()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  const createBranch = async () => {
    if (!newBranchName.trim()) return
    try {
      setActionLoading("create-branch")
      await gitApi("checkout", { method: "POST", body: JSON.stringify({ branch: newBranchName.trim(), create: true }) })
      setNewBranchName("")
      setShowCreateBranch(false)
      await refreshStatus()
      await refreshBranches()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  // ── Stash operations ──
  const refreshStashes = useCallback(async () => {
    try {
      const data = await gitApi("stash")
      setStashes(data.stashes || [])
    } catch { /* ignore */ }
  }, [gitApi])

  const stashPush = async () => {
    try {
      setActionLoading("stash-push")
      await gitApi("stash", { method: "POST", body: JSON.stringify({ action: "push", message: stashMessage || undefined }) })
      setStashMessage("")
      await refreshStashes()
      await refreshStatus()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  const stashPop = async (stashId?: string) => {
    try {
      setActionLoading(`stash-pop-${stashId || 0}`)
      await gitApi("stash", { method: "POST", body: JSON.stringify({ action: "pop", stashId }) })
      await refreshStashes()
      await refreshStatus()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  const stashApply = async (stashId?: string) => {
    try {
      setActionLoading(`stash-apply-${stashId || 0}`)
      await gitApi("stash", { method: "POST", body: JSON.stringify({ action: "apply", stashId }) })
      await refreshStashes()
      await refreshStatus()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  const stashDrop = async (stashId: string) => {
    try {
      setActionLoading(`stash-drop-${stashId}`)
      await gitApi("stash", { method: "POST", body: JSON.stringify({ action: "drop", stashId }) })
      await refreshStashes()
    } catch (err: any) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  // ── Lifecycle ──
  useEffect(() => {
    refreshStatus()
    refreshCommits()
    refreshBranches()
    refreshStashes()
  }, [refreshStatus, refreshCommits, refreshBranches, refreshStashes])

  useEffect(() => {
    const interval = setInterval(refreshStatus, 10000)
    return () => clearInterval(interval)
  }, [refreshStatus])

  // ── Computed ──
  const staged = files.filter((f) => f.staged)
  const unstaged = files.filter((f) => !f.staged)
  const totalAdditions = files.reduce((a, f) => a + f.additions, 0)
  const totalDeletions = files.reduce((a, f) => a + f.deletions, 0)

  const handleFileClick = async (file: GitFile) => {
    setSelectedFile(file.path)
    if (file.status === "modified") {
      const fileName = file.path.split("/").pop() || file.path
      try {
        const data = await gitApi(`diff?file=${encodeURIComponent(file.path)}`)
        openDiffEditor(
          `HEAD:${file.path}`,
          file.path,
          typeof data.originalContent === "string" ? data.originalContent : "",
          typeof data.modifiedContent === "string" ? data.modifiedContent : ""
        )
        return
      } catch {
        openDiffEditor(`${fileName} (HEAD)`, `${fileName} (Working)`)
      }
    }
  }

  // ── Render helpers ──
  const renderFileItem = (file: GitFile) => {
    const config = statusConfig[file.status]
    const Icon = config.icon
    const fileName = file.path.split("/").pop() || file.path
    const dirPath = file.path.split("/").slice(0, -1).join("/")
    const busy =
      actionLoading === `stage-${file.path}` ||
      actionLoading === `unstage-${file.path}` ||
      actionLoading === `discard-${file.path}`

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
          {file.additions > 0 && <span className="text-[10px] text-emerald-400">+{file.additions}</span>}
          {file.deletions > 0 && <span className="text-[10px] text-red-400">-{file.deletions}</span>}
          <span className={cn("text-[10px] font-bold w-4 text-center", config.color)}>{config.label}</span>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {busy ? (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            ) : file.staged ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-5 h-5" onClick={(e) => { e.stopPropagation(); unstageFile(file.path) }}>
                    <Minus className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">Unstage</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-5 h-5" onClick={(e) => { e.stopPropagation(); stageFile(file.path) }}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-[11px]">Stage</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-5 h-5" onClick={(e) => { e.stopPropagation(); discardFile(file.path) }}>
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-[11px]">Discard Changes</TooltipContent>
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
                {files.length} changes
              </Badge>
            </div>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={refreshStatus} disabled={loading}>
                    <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">Refresh</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={pullChanges} disabled={actionLoading === "pull"}>
                    {actionLoading === "pull" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">Pull</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={pushChanges} disabled={actionLoading === "push"}>
                    {actionLoading === "push" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">Push</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Commit message */}
          <div className="relative">
            <Input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Message (Ctrl+Enter to commit)"
              className="h-8 text-[12px] pr-8 bg-input/50 border-border/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) commitChanges()
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn("w-6 h-6 absolute right-1 top-1/2 -translate-y-1/2", commitMessage ? "text-primary" : "text-muted-foreground")}
              disabled={!commitMessage || actionLoading === "commit"}
              onClick={commitChanges}
            >
              {actionLoading === "commit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {/* Agentic Staging — Elara summarizes before commit */}
          <div className="mt-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 rounded"
              onClick={agenticStaging}
              disabled={agenticLoading || files.length === 0}
            >
              {agenticLoading ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Elara analyzing...</>
              ) : (
                <><Sparkles className="w-3 h-3 mr-1.5" />Agentic Staging</>
              )}
            </Button>
            {agenticSummary && (
              <div className="mt-1.5 px-2 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded text-[11px] text-zinc-300 leading-relaxed">
                <span className="text-emerald-400 font-medium">Elara: </span>
                {agenticSummary}
              </div>
            )}
          </div>

          {/* Branch & diff stats */}
          <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              <span>{currentBranch}</span>
            </div>
            <div className="flex items-center gap-2">
              {totalAdditions > 0 && <span className="text-emerald-400">+{totalAdditions}</span>}
              {totalDeletions > 0 && <span className="text-red-400">-{totalDeletions}</span>}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2 text-[11px] text-red-400">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{error}</span>
            <Button variant="ghost" size="icon" className="w-4 h-4 ml-auto shrink-0" onClick={() => setError(null)}>
              <span className="text-[10px]">×</span>
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border/30">
          {(["changes", "commits", "branches", "stash"] as const).map((tab) => (
            <button
              key={tab}
              className={cn(
                "flex-1 py-1.5 text-[11px] capitalize transition-colors border-b-2",
                activeTab === tab ? "text-foreground border-primary font-medium" : "text-muted-foreground border-transparent hover:text-foreground"
              )}
              onClick={() => {
                setActiveTab(tab)
                if (tab === "commits") refreshCommits()
                if (tab === "branches") refreshBranches()
                if (tab === "stash") refreshStashes()
              }}
            >
              {tab === "stash" ? `stash (${stashes.length})` : tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {activeTab === "changes" && (
            <div>
              {loading && files.length === 0 && (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-[12px] gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading git status...
                </div>
              )}
              {!loading && files.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-[12px] gap-2">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span>No changes detected</span>
                </div>
              )}
              {unstaged.length > 0 && (
                <div className="px-2 py-1">
                  <Button variant="ghost" size="sm" className="w-full h-6 text-[10px] justify-start gap-1" onClick={stageAll} disabled={!!actionLoading}>
                    <Plus className="w-3 h-3" /> Stage All Changes
                  </Button>
                </div>
              )}
              {staged.length > 0 && (
                <div>
                  <button className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent/10 uppercase tracking-wide" onClick={() => setExpandStaged(!expandStaged)}>
                    {expandStaged ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Staged Changes
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-auto">{staged.length}</Badge>
                  </button>
                  {expandStaged && staged.map(renderFileItem)}
                </div>
              )}
              {unstaged.length > 0 && (
                <div>
                  <button className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent/10 uppercase tracking-wide" onClick={() => setExpandUnstaged(!expandUnstaged)}>
                    {expandUnstaged ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Changes
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-auto">{unstaged.length}</Badge>
                  </button>
                  {expandUnstaged && unstaged.map(renderFileItem)}
                </div>
              )}
            </div>
          )}

          {activeTab === "commits" && (
            <div className="py-1">
              {commits.length === 0 && (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-[12px]">No commits found</div>
              )}
              {commits.map((commit) => (
                <div key={commit.hash} className="flex items-start gap-2 px-3 py-2 hover:bg-accent/20 cursor-pointer transition-colors border-b border-border/10">
                  <GitCommit className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground truncate">{commit.message}</p>
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
              {/* Create Branch */}
              <div className="px-3 mb-2">
                {showCreateBranch ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="new-branch-name"
                      className="h-7 text-[11px] flex-1 bg-input/50"
                      onKeyDown={(e) => { if (e.key === "Enter") createBranch(); if (e.key === "Escape") setShowCreateBranch(false) }}
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={createBranch} disabled={!newBranchName.trim() || actionLoading === "create-branch"}>
                      {actionLoading === "create-branch" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="w-full h-6 text-[10px] justify-start gap-1" onClick={() => setShowCreateBranch(true)}>
                    <FolderPlus className="w-3 h-3" /> Create Branch
                  </Button>
                )}
              </div>

              {branches.length === 0 && (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-[12px]">No branches found</div>
              )}
              {branches.map((branch) => (
                <div
                  key={branch.name}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 hover:bg-accent/20 cursor-pointer text-[12px] transition-colors group",
                    branch.current && "bg-primary/5 border-l-2 border-primary"
                  )}
                  onClick={() => !branch.current && checkoutBranch(branch.name)}
                  title={branch.current ? "Current branch" : `Checkout ${branch.name}`}
                >
                  <GitBranch className={cn("w-3.5 h-3.5 shrink-0", branch.current ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("truncate", branch.current ? "text-primary font-medium" : "text-foreground")}>{branch.name}</span>
                  {branch.current && <Badge variant="outline" className="h-4 px-1 text-[9px] border-primary/30 text-primary">current</Badge>}
                  {actionLoading === `checkout-${branch.name}` && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  <div className="flex items-center gap-1 ml-auto text-[10px] text-muted-foreground">
                    {(branch.ahead ?? 0) > 0 && <span className="text-emerald-400">↑{branch.ahead}</span>}
                    {(branch.behind ?? 0) > 0 && <span className="text-amber-400">↓{branch.behind}</span>}
                    {!branch.current && (
                      <span className="opacity-0 group-hover:opacity-100 text-[9px] text-primary transition-opacity">checkout →</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "stash" && (
            <div className="py-2">
              {/* Stash push */}
              <div className="px-3 mb-2 space-y-1">
                <div className="flex items-center gap-1">
                  <Input
                    value={stashMessage}
                    onChange={(e) => setStashMessage(e.target.value)}
                    placeholder="Stash message (optional)"
                    className="h-7 text-[11px] flex-1 bg-input/50"
                    onKeyDown={(e) => { if (e.key === "Enter") stashPush() }}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-6 h-6" onClick={stashPush} disabled={actionLoading === "stash-push" || files.length === 0}>
                        {actionLoading === "stash-push" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[11px]">Stash Changes</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {stashes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-[12px] gap-2">
                  <Archive className="w-5 h-5 opacity-40" />
                  <span>No stashes</span>
                </div>
              )}
              {stashes.map((stash) => {
                const stashId = `stash@{${stash.index}}`
                return (
                  <div key={stash.index} className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/20 text-[12px] transition-colors border-b border-border/10 group">
                    <Archive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground truncate">{stash.message || `WIP on ${stash.branch}`}</p>
                      <span className="text-[10px] text-muted-foreground font-mono">{stashId}</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => stashApply(stashId)} disabled={!!actionLoading}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-[11px]">Apply (keep stash)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => stashPop(stashId)} disabled={!!actionLoading}>
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-[11px]">Pop (apply & remove)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-5 h-5 text-red-400" onClick={() => stashDrop(stashId)} disabled={!!actionLoading}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-[11px]">Drop stash</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}

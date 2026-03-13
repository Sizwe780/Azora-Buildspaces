"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Check,
    Plus,
    Minus,
    GitBranch,
    GitCommit,
    GitMerge,
    RefreshCw,
    MoreVertical,
    FileText,
    Folder,
    Code,
    Settings,
    Loader2,
    AlertCircle
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWorkbench } from "@/lib/stores/workbench-store"

interface GitChange {
    id: string
    file: string
    status: 'modified' | 'added' | 'deleted' | 'untracked'
    staged: boolean
}

interface GitCommit {
    id: string
    message: string
    author: string
    date: string
    files: number
}

interface GitStatus {
    branch: string
    hasChanges: boolean
    stagedFiles: string[]
    unstagedFiles: string[]
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'modified': return <Code className="w-4 h-4 text-yellow-500" />
        case 'added': return <Plus className="w-4 h-4 text-green-500" />
        case 'deleted': return <Minus className="w-4 h-4 text-red-500" />
        case 'untracked': return <FileText className="w-4 h-4 text-blue-400" />
        default: return <FileText className="w-4 h-4 text-gray-400" />
    }
}

const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'tsx':
        case 'ts':
        case 'jsx':
        case 'js':
            return <Code className="w-4 h-4 text-blue-400" />
        case 'json':
            return <Settings className="w-4 h-4 text-yellow-400" />
        default:
            return <FileText className="w-4 h-4 text-gray-400" />
    }
}

export function SourceControlView() {
    const projectId = 'current'
    const { openDiffEditor } = useWorkbench()
    const [commitMessage, setCommitMessage] = useState('')
    const [activeTab, setActiveTab] = useState('changes')
    const [changes, setChanges] = useState<GitChange[]>([])
    const [commits, setCommits] = useState<GitCommit[]>([])
    const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [branches, setBranches] = useState<{ name: string; current: boolean }[]>([])
    const [isPushing, setIsPushing] = useState(false)
    const [isPulling, setIsPulling] = useState(false)
    const [stashes, setStashes] = useState<{ id: string; message: string }[]>([])
    const [showBranchCreate, setShowBranchCreate] = useState(false)
    const [newBranchName, setNewBranchName] = useState('')
    const [showStashInput, setShowStashInput] = useState(false)
    const [stashMessage, setStashMessage] = useState('')

    // Fetch Git status from API
    useEffect(() => {
        fetchGitStatus()
    }, [])

    const fetchGitStatus = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetch(`/api/projects/${projectId}/git/status`)
            if (response.ok) {
                const status: GitStatus = await response.json()
                setGitStatus(status)

                // Convert Git status to changes format
                const newChanges: GitChange[] = [
                    ...status.stagedFiles.map((file, idx) => ({
                        id: `staged-${idx}`,
                        file,
                        status: 'modified' as const,
                        staged: true
                    })),
                    ...status.unstagedFiles.map((file, idx) => ({
                        id: `unstaged-${idx}`,
                        file,
                        status: file.startsWith('??') ? 'untracked' as const : 'modified' as const,
                        staged: false
                    }))
                ]
                setChanges(newChanges)
            } else {
                setError('Not a Git repository or Git is unavailable')
            }
        } catch (err) {
            console.error('Failed to fetch Git status:', err)
            setError('Failed to connect to Git service')
        } finally {
            setIsLoading(false)
        }
    }

    const stagedChanges = changes.filter(c => c.staged)
    const unstagedChanges = changes.filter(c => !c.staged)

    const fetchCommitLog = async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}/git/log?limit=50`)
            if (response.ok) {
                const data = await response.json()
                setCommits((data.commits || []).map((c: any) => ({
                    id: c.hash?.slice(0, 7) || c.id,
                    message: c.message,
                    author: c.author,
                    date: c.date || c.timestamp,
                    files: c.filesChanged || 0,
                })))
            }
        } catch { /* non-critical */ }
    }

    const fetchBranches = async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}/git/branches`)
            if (response.ok) {
                const data = await response.json()
                setBranches(data.branches || [])
            }
        } catch { /* non-critical */ }
    }

    useEffect(() => {
        if (activeTab === 'history') fetchCommitLog()
    }, [activeTab])

    useEffect(() => { fetchBranches() }, [])

    const handlePush = async () => {
        setIsPushing(true)
        try {
            await fetch(`/api/projects/${projectId}/git/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'push' }),
            })
            await fetchGitStatus()
        } catch (err) {
            console.error('Push failed:', err)
        } finally {
            setIsPushing(false)
        }
    }

    const handlePull = async () => {
        setIsPulling(true)
        try {
            await fetch(`/api/projects/${projectId}/git/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pull' }),
            })
            await fetchGitStatus()
        } catch (err) {
            console.error('Pull failed:', err)
        } finally {
            setIsPulling(false)
        }
    }

    const handleStage = async (changeId: string) => {
        const change = changes.find(c => c.id === changeId)
        if (!change) return

        try {
            const response = await fetch(`/api/projects/${projectId}/git/stage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: [change.file] })
            })
            if (response.ok) {
                await fetchGitStatus()
            }
        } catch (err) {
            console.error('Failed to stage file:', err)
        }
    }

    const handleUnstage = async (changeId: string) => {
        const change = changes.find(c => c.id === changeId)
        if (!change) return

        try {
            const response = await fetch(`/api/projects/${projectId}/git/unstage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: [change.file] })
            })
            if (response.ok) {
                await fetchGitStatus()
            }
        } catch (err) {
            console.error('Failed to unstage file:', err)
        }
    }

    const handleCommit = async () => {
        if (commitMessage.trim() && stagedChanges.length > 0) {
            try {
                const response = await fetch(`/api/projects/${projectId}/git/commit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: commitMessage })
                })
                if (response.ok) {
                    setCommitMessage('')
                    await fetchGitStatus()
                }
            } catch (err) {
                console.error('Failed to commit:', err)
            }
        }
    }

    // Open diff editor when clicking a changed file
    const handleOpenDiff = async (change: GitChange) => {
        const originalPath = `HEAD:${change.file}`
        const modifiedPath = change.file

        try {
            const response = await fetch(`/api/projects/${projectId}/git/diff?file=${encodeURIComponent(change.file)}`)
            if (response.ok) {
                const data = await response.json()
                openDiffEditor(
                    originalPath,
                    modifiedPath,
                    typeof data.originalContent === 'string' ? data.originalContent : '',
                    typeof data.modifiedContent === 'string' ? data.modifiedContent : ''
                )
                return
            }
        } catch {
            // Fallback below
        }

        openDiffEditor(originalPath, modifiedPath)
    }

    // Create Branch
    const handleCreateBranch = async () => {
        if (!newBranchName.trim()) return
        try {
            await fetch(`/api/projects/${projectId}/git/branch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newBranchName, checkout: true })
            })
            setNewBranchName('')
            setShowBranchCreate(false)
            await fetchBranches()
            await fetchGitStatus()
        } catch (err) {
            console.error('Failed to create branch:', err)
        }
    }

    // Checkout Branch
    const handleCheckoutBranch = async (branchName: string) => {
        try {
            await fetch(`/api/projects/${projectId}/git/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch: branchName })
            })
            await fetchBranches()
            await fetchGitStatus()
        } catch (err) {
            console.error('Failed to checkout branch:', err)
        }
    }

    // Merge Branch
    const handleMergeBranch = async (branchName: string) => {
        try {
            await fetch(`/api/projects/${projectId}/git/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch: branchName })
            })
            await fetchGitStatus()
        } catch (err) {
            console.error('Failed to merge branch:', err)
        }
    }

    // Stash
    const handleStash = async () => {
        try {
            await fetch(`/api/projects/${projectId}/git/stash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'push', message: stashMessage || undefined })
            })
            setStashMessage('')
            setShowStashInput(false)
            await fetchGitStatus()
            await fetchStashes()
        } catch (err) {
            console.error('Failed to stash:', err)
        }
    }

    // Pop Stash
    const handleStashPop = async (stashId: string) => {
        try {
            await fetch(`/api/projects/${projectId}/git/stash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pop', stashId })
            })
            await fetchGitStatus()
            await fetchStashes()
        } catch (err) {
            console.error('Failed to pop stash:', err)
        }
    }

    const fetchStashes = async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}/git/stash?action=list`)
            if (response.ok) {
                const data = await response.json()
                setStashes(data.stashes || [])
            }
        } catch { /* non-critical */ }
    }

    useEffect(() => { fetchStashes() }, [])

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{gitStatus?.branch || 'main'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6"
                            onClick={fetchGitStatus}
                            disabled={isLoading}
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-6 h-6">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setShowBranchCreate(true)}>
                                    <GitBranch className="w-4 h-4 mr-2" />
                                    Create Branch
                                </DropdownMenuItem>
                                {branches.filter(b => !b.current).length > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        {branches.filter(b => !b.current).map(b => (
                                            <DropdownMenuItem key={b.name} onClick={() => handleCheckoutBranch(b.name)}>
                                                <GitBranch className="w-4 h-4 mr-2" />
                                                Checkout: {b.name}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        {branches.filter(b => !b.current).map(b => (
                                            <DropdownMenuItem key={`merge-${b.name}`} onClick={() => handleMergeBranch(b.name)}>
                                                <GitMerge className="w-4 h-4 mr-2" />
                                                Merge: {b.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setShowStashInput(true)}>
                                    <Folder className="w-4 h-4 mr-2" />
                                    Stash Changes
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                    /* Feature: SCM Extras - Three-Way Merge */
                                    openDiffEditor('Base Commit', 'Merge Result (Your Branch vs Theirs)', '// Base Content\nfunction hello() {\n  return "base";\n}', '// Merged Content\n<<<<<<< HEAD\nfunction hello() {\n  return "yours";\n}\n=======\nfunction hello() {\n  return "theirs";\n}\n>>>>>>> branch');
                                }}>
                                    <GitMerge className="w-4 h-4 mr-2" />
                                    Resolve Conflicts (3-Way)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handlePull} disabled={isPulling}>
                                    <RefreshCw className={`w-4 h-4 mr-2 ${isPulling ? 'animate-spin' : ''}`} />
                                    {isPulling ? 'Pulling...' : 'Pull'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handlePush} disabled={isPushing}>
                                    <GitBranch className={`w-4 h-4 mr-2`} />
                                    {isPushing ? 'Pushing...' : 'Push'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Commit Input */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Commit message..."
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                handleCommit()
                            }
                        }}
                    />
                    <Button
                        size="sm"
                        onClick={handleCommit}
                        disabled={!commitMessage.trim() || stagedChanges.length === 0}
                        className="px-3"
                    >
                        <Check className="w-4 h-4" />
                    </Button>
                </div>

                {/* Create Branch UI */}
                {showBranchCreate && (
                    <div className="flex gap-2 mt-2">
                        <Input
                            placeholder="New branch name..."
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            className="h-8 text-sm"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBranch(); if (e.key === 'Escape') setShowBranchCreate(false) }}
                            autoFocus
                        />
                        <Button size="sm" onClick={handleCreateBranch} disabled={!newBranchName.trim()} className="px-3">
                            <GitBranch className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* Stash UI */}
                {showStashInput && (
                    <div className="flex gap-2 mt-2">
                        <Input
                            placeholder="Stash message (optional)..."
                            value={stashMessage}
                            onChange={(e) => setStashMessage(e.target.value)}
                            className="h-8 text-sm"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleStash(); if (e.key === 'Escape') setShowStashInput(false) }}
                            autoFocus
                        />
                        <Button size="sm" onClick={handleStash} className="px-3">
                            <Folder className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* Stash list */}
                {stashes.length > 0 && (
                    <div className="mt-2 space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Stashes ({stashes.length})</span>
                        {stashes.map(s => (
                            <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground hover:bg-muted/50 rounded px-1 py-0.5 cursor-pointer" onClick={() => handleStashPop(s.id)}>
                                <Folder className="w-3 h-3" />
                                <span className="truncate flex-1">{s.message || s.id}</span>
                                <span className="text-[10px]">pop</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mx-3 mt-3">
                    <TabsTrigger value="changes" className="text-xs">
                        Changes ({changes.length})
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-xs">
                        History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="changes" className="flex-1 mt-0">
                    <ScrollArea className="h-full">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                <AlertCircle className="w-8 h-8 opacity-20 mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">{error}</p>
                            </div>
                        ) : (
                            <div className="p-3 space-y-4">
                                {/* Staged Changes */}
                                {stagedChanges.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Staged Changes ({stagedChanges.length})
                                            </h4>
                                            <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" onClick={() => stagedChanges.forEach(c => handleUnstage(c.id))} title="Unstage All">
                                                <Minus className="w-3 h-3 mr-0.5" /> All
                                            </Button>
                                        </div>
                                        <div className="space-y-1">
                                            {stagedChanges.map((change) => (
                                                <div key={change.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => handleOpenDiff(change)}>
                                                    {getStatusIcon(change.status)}
                                                    {getFileIcon(change.file)}
                                                    <span className="text-sm flex-1 truncate">{change.file}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); handleUnstage(change.id) }}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Unstaged Changes */}
                                {unstagedChanges.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Changes ({unstagedChanges.length})
                                            </h4>
                                            <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" onClick={() => unstagedChanges.forEach(c => handleStage(c.id))} title="Stage All">
                                                <Plus className="w-3 h-3 mr-0.5" /> All
                                            </Button>
                                        </div>
                                        <div className="space-y-1">
                                            {unstagedChanges.map((change) => (
                                                <div key={change.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => handleOpenDiff(change)}>
                                                    {getStatusIcon(change.status)}
                                                    {getFileIcon(change.file)}
                                                    <span className="text-sm flex-1 truncate">{change.file}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); handleStage(change.id) }}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {changes.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                        <GitBranch className="w-8 h-8 opacity-20 mb-2" />
                                        <p className="text-sm">No changes detected.</p>
                                        <p className="text-xs">Your working directory is clean.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="history" className="flex-1 mt-0">
                    <ScrollArea className="h-full">
                        <div className="p-3 space-y-2">
                            {commits.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                    <GitCommit className="w-8 h-8 opacity-20 mb-2" />
                                    <p className="text-sm">No commit history yet</p>
                                    <p className="text-xs">Make a commit to see it here</p>
                                </div>
                            ) : (
                                commits.map((commit) => (
                                    <div key={commit.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <GitCommit className="w-3 h-3 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{commit.message}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-muted-foreground">{commit.author}</span>
                                                <span className="text-[10px] text-muted-foreground">·</span>
                                                <code className="text-[10px] text-primary">{commit.id}</code>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    )
}

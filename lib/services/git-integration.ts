/**
 * Git Integration Service
 *
 * Provides Git operations backed by the local git CLI so the workspace can
 * interact with real repositories without an external backend.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

export interface GitRepository {
  path: string
  branch: string
  remote?: string
  remoteUrl?: string
  isDirty: boolean
  ahead: number
  behind: number
}

export interface GitFileStatus {
  filepath: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'ignored'
  staged: boolean
  oldPath?: string  // for renames
  additions?: number
  deletions?: number
}

// Aggregated status with metadata for convenience
export interface GitStatus {
  branch: string
  files: GitFileStatus[]
  ahead: number
  behind: number
  isClean: boolean
}

export interface GitCommitInfo {
  oid: string
  message: string
  author: {
    name: string
    email: string
    timestamp: number
  }
  committer: {
    name: string
    email: string
    timestamp: number
  }
  parent: string[]
  tree: string
  gpgSignature?: string
}

export interface GitBranchInfo {
  name: string
  current: boolean
  remote?: string
  oid: string
  upstream?: string
  ahead: number
  behind: number
  lastCommit?: GitCommitInfo
}

export interface GitDiffHunk {
  header: string
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: GitDiffLine[]
}

export interface GitDiffLine {
  type: 'add' | 'delete' | 'context'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface GitDiffResult {
  filepath: string
  oldPath?: string
  status: 'modified' | 'added' | 'deleted' | 'renamed'
  hunks: GitDiffHunk[]
  additions: number
  deletions: number
  binary: boolean
  patch?: string
}

export interface GitStashEntry {
  index: number
  message: string
  branch: string
  timestamp: number
  oid: string
}

export interface GitBlameResult {
  filepath: string
  lines: GitBlameLine[]
}

export interface GitBlameLine {
  lineNumber: number
  content: string
  commit: {
    oid: string
    author: string
    email: string
    timestamp: number
    message: string
  }
}

export interface GitRemote {
  name: string
  url: string
  type: 'fetch' | 'push'
}

export interface GitConflict {
  filepath: string
  ours: string
  theirs: string
  base?: string
  resolved: boolean
}

export interface GitMergeResult {
  success: boolean
  conflicts: GitConflict[]
  message: string
}

function toArray(input: string | string[]): string[] {
  return Array.isArray(input) ? input : [input]
}

async function runGit(repoPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, { cwd: repoPath })
    return { stdout: stdout.toString(), stderr: stderr?.toString?.() || '' }
  } catch (error: any) {
    const stderr = error?.stderr?.toString?.() || ''
    const message = stderr.trim() || error.message || 'Git command failed'
    throw new Error(message)
  }
}

function parseBranchLine(line: string): { branch: string; ahead: number; behind: number } {
  const result = { branch: 'HEAD', ahead: 0, behind: 0 }
  if (!line.startsWith('## ')) return result

  const cleaned = line.replace(/^##\s+/, '')
  const [branchPart, summaryRaw] = cleaned.split(' [')
  const branch = branchPart.split('...')[0]
  result.branch = branch || 'HEAD'

  const summary = summaryRaw?.replace(']', '')
  if (summary) {
    const aheadMatch = summary.match(/ahead (\d+)/)
    const behindMatch = summary.match(/behind (\d+)/)
    if (aheadMatch) result.ahead = parseInt(aheadMatch[1], 10) || 0
    if (behindMatch) result.behind = parseInt(behindMatch[1], 10) || 0
  }
  return result
}

function parseStatusLine(line: string): GitFileStatus | null {
  if (line.startsWith('## ')) return null
  const code = line.slice(0, 2)
  const rawPath = line.slice(3).trim()

  const stagedCode = code[0]
  const worktreeCode = code[1]

  let filepath = rawPath
  let oldPath: string | undefined

  // Handle rename format: R  old -> new
  if (rawPath.includes(' -> ')) {
    const [from, to] = rawPath.split(' -> ')
    oldPath = from
    filepath = to
  }

  let status: GitFileStatus['status'] = 'modified'
  if (stagedCode === '?' || worktreeCode === '?') status = 'untracked'
  else if (stagedCode === 'A' || worktreeCode === 'A') status = 'added'
  else if (stagedCode === 'D' || worktreeCode === 'D') status = 'deleted'
  else if (stagedCode === 'R' || worktreeCode === 'R') status = 'renamed'
  else if (stagedCode === '!') status = 'ignored'

  const staged = stagedCode !== ' ' && stagedCode !== '?' && stagedCode !== '!' && stagedCode !== undefined

  return {
    filepath,
    oldPath,
    status,
    staged,
  }
}

function countDiffStats(patch: string): { additions: number; deletions: number } {
  let additions = 0
  let deletions = 0
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff --git')) continue
    if (line.startsWith('+')) additions += 1
    else if (line.startsWith('-')) deletions += 1
  }
  return { additions, deletions }
}

class GitIntegrationService {
  private repos: Map<string, GitRepository> = new Map()

  // ═══════════════════════════════════════════════════════════
  // REPOSITORY MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  async initRepo(path: string): Promise<GitRepository> {
    const status = await this.getStatus(path)
    const repo: GitRepository = {
      path,
      branch: status.branch,
      isDirty: !status.isClean,
      ahead: status.ahead,
      behind: status.behind,
    }
    this.repos.set(path, repo)
    return repo
  }

  async cloneRepo(
    url: string,
    path: string,
    options?: {
      branch?: string
      depth?: number
      singleBranch?: boolean
      onProgress?: (progress: { phase: string; loaded: number; total: number }) => void
    }
  ): Promise<GitRepository> {
    const args = ['clone', url, path]
    if (options?.branch) args.push('--branch', options.branch)
    if (options?.depth) args.push('--depth', String(options.depth))
    if (options?.singleBranch) args.push('--single-branch')
    await runGit(process.cwd(), args)
    const repo: GitRepository = {
      path,
      branch: options?.branch || 'main',
      remote: 'origin',
      remoteUrl: url,
      isDirty: false,
      ahead: 0,
      behind: 0,
    }
    this.repos.set(path, repo)
    return repo
  }

  async getStatus(repoPath: string): Promise<GitStatus> {
    const { stdout } = await runGit(repoPath, ['status', '--porcelain=1', '-b'])
    const lines = stdout.split('\n').filter(Boolean)

    const branchInfo = lines.find(line => line.startsWith('## ')) || '## HEAD'
    const { branch, ahead, behind } = parseBranchLine(branchInfo)

    const files: GitFileStatus[] = []
    for (const line of lines) {
      const parsed = parseStatusLine(line)
      if (parsed) files.push(parsed)
    }

    return {
      branch,
      files,
      ahead,
      behind,
      isClean: files.length === 0,
    }
  }

  async getRepoInfo(repoPath: string): Promise<GitRepository | null> {
    return this.repos.get(repoPath) || null
  }

  // ═══════════════════════════════════════════════════════════
  // STAGING & COMMITTING
  // ═══════════════════════════════════════════════════════════

  async stage(repoPath: string, filepaths: string | string[]): Promise<void> {
    const targets = toArray(filepaths).filter(Boolean)
    if (targets.length === 0) return
    await runGit(repoPath, ['add', '--', ...targets])
  }

  async unstage(repoPath: string, filepaths: string | string[]): Promise<void> {
    const targets = toArray(filepaths).filter(Boolean)
    if (targets.length === 0) return
    await runGit(repoPath, ['reset', 'HEAD', '--', ...targets])
  }

  async stageAll(repoPath: string): Promise<void> {
    await runGit(repoPath, ['add', '--all'])
  }

  async commit(
    repoPath: string,
    message: string,
    options?: {
      amend?: boolean
      author?: { name: string; email: string }
      signoff?: boolean
    }
  ): Promise<string> {
    const args = ['commit', '-m', message]
    if (options?.amend) args.push('--amend')
    if (options?.author?.name && options?.author?.email) {
      args.push('--author', `${options.author.name} <${options.author.email}>`)
    }
    if (options?.signoff) args.push('--signoff')

    await runGit(repoPath, args)
    const { stdout } = await runGit(repoPath, ['rev-parse', 'HEAD'])
    return stdout.trim()
  }

  // ═══════════════════════════════════════════════════════════
  // BRANCH MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  async getBranches(repoPath: string): Promise<GitBranchInfo[]> {
    const { stdout } = await runGit(repoPath, [
      'for-each-ref',
      '--format', '%(refname:short)|%(objectname:short)|%(HEAD)|%(upstream:short)|%(upstream:track)',
      'refs/heads'
    ])

    return stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [name, oid, head, upstream, track] = line.split('|')
        const aheadMatch = track?.match(/ahead (\d+)/)
        const behindMatch = track?.match(/behind (\d+)/)
        return {
          name,
          oid,
          current: head === '*',
          upstream: upstream || undefined,
          ahead: aheadMatch ? parseInt(aheadMatch[1], 10) || 0 : 0,
          behind: behindMatch ? parseInt(behindMatch[1], 10) || 0 : 0,
        }
      })
  }

  async createBranch(
    repoPath: string,
    name: string,
    options?: { startPoint?: string; checkout?: boolean }
  ): Promise<void> {
    const args = ['branch', name]
    if (options?.startPoint) args.push(options.startPoint)
    await runGit(repoPath, args)
    if (options?.checkout) await this.switchBranch(repoPath, name)
  }

  async switchBranch(repoPath: string, branch: string): Promise<void> {
    await runGit(repoPath, ['checkout', branch])
  }

  async deleteBranch(repoPath: string, name: string, force?: boolean): Promise<void> {
    const args = ['branch', force ? '-D' : '-d', name]
    await runGit(repoPath, args)
  }

  async mergeBranch(
    repoPath: string,
    branch: string,
    options?: { noFastForward?: boolean; squash?: boolean }
  ): Promise<GitMergeResult> {
    const args = ['merge', branch]
    if (options?.noFastForward) args.push('--no-ff')
    if (options?.squash) args.push('--squash')
    try {
      const { stdout } = await runGit(repoPath, args)
      return { success: true, conflicts: [], message: stdout.trim() || `Merged ${branch}` }
    } catch (error: any) {
      const message = error?.message || 'Merge failed'
      return { success: false, conflicts: [], message }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // REMOTE OPERATIONS
  // ═══════════════════════════════════════════════════════════

  async fetch(
    repoPath: string,
    options?: { remote?: string; prune?: boolean }
  ): Promise<void> {
    const args = ['fetch', options?.remote || 'origin']
    if (options?.prune) args.push('--prune')
    await runGit(repoPath, args)
  }

  async pull(
    repoPath: string,
    options?: { remote?: string; branch?: string; rebase?: boolean }
  ): Promise<GitMergeResult> {
    const args = ['pull', options?.remote || 'origin']
    if (options?.branch) args.push(options.branch)
    if (options?.rebase) args.push('--rebase')
    try {
      const { stdout } = await runGit(repoPath, args)
      return { success: true, conflicts: [], message: stdout.trim() || 'Pull successful' }
    } catch (error: any) {
      const message = error?.message || 'Pull failed'
      return { success: false, conflicts: [], message }
    }
  }

  async push(
    repoPath: string,
    options?: {
      remote?: string
      branch?: string
      force?: boolean
      setUpstream?: boolean
      onProgress?: (progress: { phase: string; loaded: number; total: number }) => void
    }
  ): Promise<void> {
    const args = ['push', options?.remote || 'origin']
    if (options?.branch) args.push(options.branch)
    if (options?.force) args.push('--force')
    if (options?.setUpstream) args.push('--set-upstream')
    await runGit(repoPath, args)
  }

  async getRemotes(repoPath: string): Promise<GitRemote[]> {
    const { stdout } = await runGit(repoPath, ['remote', '-v'])
    const remotes: GitRemote[] = []
    stdout
      .split('\n')
      .filter(Boolean)
      .forEach(line => {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 2) {
          const [name, url, typeRaw] = parts
          const type = typeRaw?.includes('(push)') ? 'push' : 'fetch'
          remotes.push({ name, url, type })
        }
      })
    return remotes
  }

  async addRemote(repoPath: string, name: string, url: string): Promise<void> {
    await runGit(repoPath, ['remote', 'add', name, url])
  }

  // ═══════════════════════════════════════════════════════════
  // DIFF & BLAME
  // ═══════════════════════════════════════════════════════════

  async getDiff(
    repoPath: string,
    filepath: string,
    options?: { staged?: boolean; commit1?: string; commit2?: string }
  ): Promise<GitDiffResult> {
    const args = ['diff']
    if (options?.staged) args.push('--cached')
    if (options?.commit1 && options?.commit2) {
      args.push(options.commit1, options.commit2)
    }
    args.push('--', filepath)

    const { stdout } = await runGit(repoPath, args)
    const stats = countDiffStats(stdout)
    return {
      filepath,
      status: 'modified',
      hunks: [],
      additions: stats.additions,
      deletions: stats.deletions,
      binary: false,
      patch: stdout,
    }
  }

  async getDiffAll(
    repoPath: string,
    options?: { staged?: boolean }
  ): Promise<GitDiffResult[]> {
    const status = await this.getStatus(repoPath)
    const diffs: GitDiffResult[] = []

    for (const file of status.files) {
      const diff = await this.getDiff(repoPath, file.filepath, { staged: options?.staged })
      diff.status = file.status === 'untracked' ? 'added' : file.status === 'deleted' ? 'deleted' : 'modified'
      diff.oldPath = file.oldPath
      diffs.push(diff)
    }

    return diffs
  }

  async getBlame(repoPath: string, filepath: string): Promise<GitBlameResult> {
    const { stdout } = await runGit(repoPath, ['blame', '--line-porcelain', filepath])
    const lines: GitBlameLine[] = []
    let current: Partial<GitBlameLine> = {}
    let currentCommit: Partial<GitBlameLine['commit']> = {}

    stdout.split('\n').forEach(raw => {
      if (/^[0-9a-f]{40}\s/.test(raw)) {
        const [commit, lineNumber] = raw.split(' ')
        current = { lineNumber: parseInt(lineNumber, 10), content: '' }
        currentCommit = { oid: commit }
      } else if (raw.startsWith('author ')) {
        currentCommit.author = raw.replace('author ', '')
      } else if (raw.startsWith('author-mail ')) {
        currentCommit.email = raw.replace('author-mail ', '').replace(/[<>]/g, '')
      } else if (raw.startsWith('author-time ')) {
        currentCommit.timestamp = parseInt(raw.replace('author-time ', ''), 10) * 1000
      } else if (raw.startsWith('summary ')) {
        currentCommit.message = raw.replace('summary ', '')
      } else if (raw.startsWith('\t')) {
        current.content = raw.slice(1)
        lines.push({
          lineNumber: current.lineNumber || lines.length + 1,
          content: current.content,
          commit: {
            oid: currentCommit.oid || '',
            author: currentCommit.author || '',
            email: currentCommit.email || '',
            timestamp: currentCommit.timestamp || Date.now(),
            message: currentCommit.message || '',
          }
        })
      }
    })

    return { filepath, lines }
  }

  // ═══════════════════════════════════════════════════════════
  // LOG & HISTORY
  // ═══════════════════════════════════════════════════════════

  async getLog(
    repoPath: string,
    options?: {
      maxCount?: number
      filepath?: string
      branch?: string
      since?: Date
      until?: Date
      author?: string
    }
  ): Promise<GitCommitInfo[]> {
    const args = ['log', '-n', String(options?.maxCount || 50), '--pretty=format:%H|%an|%ae|%at|%s']
    if (options?.branch) args.push(options.branch)
    if (options?.since) args.push(`--since=${options.since.toISOString()}`)
    if (options?.until) args.push(`--until=${options.until.toISOString()}`)
    if (options?.author) args.push(`--author=${options.author}`)
    if (options?.filepath) args.push('--', options.filepath)

    const { stdout } = await runGit(repoPath, args)
    return stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [oid, authorName, authorEmail, tsRaw, ...messageParts] = line.split('|')
        const message = messageParts.join('|')
        const timestamp = parseInt(tsRaw, 10) * 1000
        return {
          oid,
          message,
          author: { name: authorName, email: authorEmail, timestamp },
          committer: { name: authorName, email: authorEmail, timestamp },
          parent: [],
          tree: '',
        }
      })
  }

  async getCommit(repoPath: string, oid: string): Promise<GitCommitInfo | null> {
    const commits = await this.getLog(repoPath, { maxCount: 1, branch: oid })
    return commits[0] || null
  }

  async getFileAtCommit(repoPath: string, filepath: string, oid: string): Promise<string | null> {
    const { stdout } = await runGit(repoPath, ['show', `${oid}:${filepath}`])
    return stdout
  }

  // ═══════════════════════════════════════════════════════════
  // STASH
  // ═══════════════════════════════════════════════════════════

  async stash(
    repoPath: string,
    message?: string,
    options?: { includeUntracked?: boolean }
  ): Promise<void> {
    const args = ['stash', 'push']
    if (message) args.push('-m', message)
    if (options?.includeUntracked) args.push('--include-untracked')
    await runGit(repoPath, args)
  }

  async stashPop(repoPath: string, index?: number): Promise<void> {
    const args = ['stash', 'pop']
    if (index !== undefined) args.push(`stash@{${index}}`)
    await runGit(repoPath, args)
  }

  async stashList(repoPath: string): Promise<GitStashEntry[]> {
    const { stdout } = await runGit(repoPath, ['stash', 'list', '--date=unix'])
    return stdout
      .split('\n')
      .filter(Boolean)
      .map((line, idx) => {
        const match = line.match(/^stash@\{(\d+)\}: (.+)$/)
        const message = match?.[2] || line
        return {
          index: parseInt(match?.[1] || String(idx), 10),
          message,
          branch: '',
          timestamp: Date.now(),
          oid: '',
        }
      })
  }

  async stashDrop(repoPath: string, index: number): Promise<void> {
    await runGit(repoPath, ['stash', 'drop', `stash@{${index}}`])
  }

  // ═══════════════════════════════════════════════════════════
  // CONFLICT RESOLUTION
  // ═══════════════════════════════════════════════════════════

  async getConflicts(repoPath: string): Promise<GitConflict[]> {
    const status = await this.getStatus(repoPath)
    return status.files
      .filter(file => file.status === 'modified' && !file.staged) // heuristic
      .map(file => ({ filepath: file.filepath, ours: '', theirs: '', resolved: false }))
  }

  async resolveConflict(
    repoPath: string,
    filepath: string,
    resolution: 'ours' | 'theirs' | 'manual',
    content?: string
  ): Promise<void> {
    if (resolution === 'ours') await runGit(repoPath, ['checkout', '--ours', filepath])
    else if (resolution === 'theirs') await runGit(repoPath, ['checkout', '--theirs', filepath])
    if (content !== undefined && resolution === 'manual') {
      const fs = await import('fs/promises')
      await fs.writeFile(path.join(repoPath, filepath), content, 'utf8')
    }
    await this.stage(repoPath, filepath)
  }

  // ═══════════════════════════════════════════════════════════
  // TAGS
  // ═══════════════════════════════════════════════════════════

  async getTags(repoPath: string): Promise<{ name: string; oid: string; message?: string }[]> {
    const { stdout } = await runGit(repoPath, ['tag', '--list', '--format=%(refname:short)|%(objectname:short)|%(contents)'])
    return stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [name, oid, message] = line.split('|')
        return { name, oid, message }
      })
  }

  async createTag(
    repoPath: string,
    name: string,
    options?: { oid?: string; message?: string; annotated?: boolean }
  ): Promise<void> {
    const args = ['tag']
    if (options?.annotated || options?.message) {
      args.push('-a', name, '-m', options?.message || name)
    } else {
      args.push(name)
    }
    if (options?.oid) args.push(options.oid)
    await runGit(repoPath, args)
  }

  async deleteTag(repoPath: string, name: string): Promise<void> {
    await runGit(repoPath, ['tag', '-d', name])
  }

  // ═══════════════════════════════════════════════════════════
  // CHERRY-PICK & REVERT
  // ═══════════════════════════════════════════════════════════

  async cherryPick(repoPath: string, oid: string): Promise<GitMergeResult> {
    try {
      await runGit(repoPath, ['cherry-pick', oid])
      return { success: true, conflicts: [], message: `Cherry-picked ${oid}` }
    } catch (error: any) {
      const message = error?.message || 'Cherry-pick failed'
      return { success: false, conflicts: [], message }
    }
  }

  async revert(repoPath: string, oid: string): Promise<GitMergeResult> {
    try {
      await runGit(repoPath, ['revert', oid, '--no-edit'])
      return { success: true, conflicts: [], message: `Reverted ${oid}` }
    } catch (error: any) {
      const message = error?.message || 'Revert failed'
      return { success: false, conflicts: [], message }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // GRAPH
  // ═══════════════════════════════════════════════════════════

  async getGraph(
    repoPath: string,
    options?: { maxCount?: number; allBranches?: boolean }
  ): Promise<{
    commits: (GitCommitInfo & { x: number; y: number; color: string })[]
    edges: { from: string; to: string; color: string }[]
  }> {
    const commits = await this.getLog(repoPath, { maxCount: options?.maxCount || 100 })
    return { commits: commits.map((c, idx) => ({ ...c, x: idx, y: 0, color: '#888' })), edges: [] }
  }
}

export const gitIntegration = new GitIntegrationService()
export const gitIntegrationService = gitIntegration

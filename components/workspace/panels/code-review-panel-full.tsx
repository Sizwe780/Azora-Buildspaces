"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  ChevronDown,
  ChevronRight,
  FileCode,
  AlertTriangle,
  CheckCircle,
  Info,
  Shield,
  Zap,
  Eye,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react"

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type IssueSeverity = "error" | "warning" | "info" | "suggestion"
type IssueCategory = "security" | "performance" | "style" | "bug" | "complexity" | "best-practice"

interface ReviewIssue {
  id: string
  file: string
  line: number
  endLine?: number
  severity: IssueSeverity
  category: IssueCategory
  message: string
  suggestion?: string
  rule?: string
}

interface FileReview {
  file: string
  issues: ReviewIssue[]
  score: number // 0-100
}

interface CodeReview {
  id: string
  timestamp: number
  files: FileReview[]
  totalIssues: number
  overallScore: number
  summary: string
}

interface CodeReviewPanelProps {
  projectId?: string
  activeFile?: string | null
  onNavigateToFile?: (file: string, line: number) => void
}

// ═══════════════════════════════════════════════════════════
// INLINE COMMENT TYPES
// ═══════════════════════════════════════════════════════════

interface InlineComment {
  id: string
  file: string
  line: number
  author: string
  content: string
  timestamp: number
  resolved: boolean
  replies: InlineComment[]
}

type ApprovalStatus = "pending" | "approved" | "changes-requested" | "commented"

// ═══════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════

function generateDemoReview(): CodeReview {
  const files: FileReview[] = [
    {
      file: "app/page.tsx",
      score: 78,
      issues: [
        { id: "r1", file: "app/page.tsx", line: 12, severity: "warning", category: "performance", message: "Unnecessary re-render: useState callback creates new object on every render", suggestion: "Memoize the initial state with useMemo or move it outside the component", rule: "react/no-unstable-default-props" },
        { id: "r2", file: "app/page.tsx", line: 34, severity: "info", category: "style", message: "Consider extracting this inline style to a CSS class", rule: "style/no-inline-styles" },
        { id: "r3", file: "app/page.tsx", line: 67, severity: "error", category: "security", message: "User input passed directly to dangerouslySetInnerHTML without sanitization", suggestion: "Use DOMPurify.sanitize() before rendering user content", rule: "security/no-unsanitized-html" },
      ],
    },
    {
      file: "lib/auth.ts",
      score: 62,
      issues: [
        { id: "r4", file: "lib/auth.ts", line: 15, severity: "error", category: "security", message: "JWT secret hardcoded in source code", suggestion: "Move to environment variable: process.env.JWT_SECRET", rule: "security/no-hardcoded-secrets" },
        { id: "r5", file: "lib/auth.ts", line: 42, severity: "warning", category: "bug", message: "Token expiry check uses <= instead of <, may cause edge case failures", rule: "logic/off-by-one" },
        { id: "r6", file: "lib/auth.ts", line: 58, severity: "warning", category: "best-practice", message: "Missing error handling for async operation", suggestion: "Wrap in try/catch block", rule: "async/no-unhandled-rejection" },
        { id: "r7", file: "lib/auth.ts", line: 80, severity: "suggestion", category: "complexity", message: "Function has cyclomatic complexity of 12 (threshold: 10)", suggestion: "Extract conditional logic into helper functions", rule: "complexity/max-cyclomatic" },
      ],
    },
    {
      file: "components/workspace/editor-panel.tsx",
      score: 91,
      issues: [
        { id: "r8", file: "components/workspace/editor-panel.tsx", line: 95, severity: "info", category: "performance", message: "Large component (287 lines): consider splitting into smaller components", rule: "complexity/max-lines" },
      ],
    },
  ]

  const totalIssues = files.reduce((acc, f) => acc + f.issues.length, 0)
  const overallScore = Math.round(files.reduce((acc, f) => acc + f.score, 0) / files.length)

  return {
    id: `review_${Date.now()}`,
    timestamp: Date.now(),
    files,
    totalIssues,
    overallScore,
    summary: `Found ${totalIssues} issues across ${files.length} files. Focus on 2 critical security issues in lib/auth.ts and app/page.tsx.`,
  }
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function CodeReviewPanelFull({ projectId, activeFile, onNavigateToFile }: CodeReviewPanelProps) {
  const [review, setReview] = useState<CodeReview | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [filterSeverity, setFilterSeverity] = useState<IssueSeverity | "all">("all")
  const [dismissedIssues, setDismissedIssues] = useState<Set<string>>(new Set())
  const [inlineComments, setInlineComments] = useState<InlineComment[]>([])
  const [newCommentText, setNewCommentText] = useState("")
  const [commentingOn, setCommentingOn] = useState<{ file: string; line: number } | null>(null)
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("pending")
  const [showComments, setShowComments] = useState(true)

  const addInlineComment = useCallback((file: string, line: number, content: string) => {
    const comment: InlineComment = {
      id: `comment_${Date.now()}`,
      file,
      line,
      author: "You",
      content,
      timestamp: Date.now(),
      resolved: false,
      replies: [],
    }
    setInlineComments((prev) => [...prev, comment])
    setNewCommentText("")
    setCommentingOn(null)
  }, [])

  const resolveComment = useCallback((id: string) => {
    setInlineComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: true } : c))
    )
  }, [])

  const replyToComment = useCallback((parentId: string, content: string) => {
    const reply: InlineComment = {
      id: `reply_${Date.now()}`,
      file: "",
      line: 0,
      author: "You",
      content,
      timestamp: Date.now(),
      resolved: false,
      replies: [],
    }
    setInlineComments((prev) =>
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c
      )
    )
  }, [])

  const runReview = useCallback(() => {
    setIsAnalyzing(true)
    setDismissedIssues(new Set())
    setTimeout(() => {
      const result = generateDemoReview()
      setReview(result)
      setIsAnalyzing(false)
      // Auto-expand files with errors
      const errorFiles = result.files.filter(f => f.issues.some(i => i.severity === "error")).map(f => f.file)
      setExpandedFiles(new Set(errorFiles))
    }, 2500)
  }, [])

  const toggleFile = (file: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      next.has(file) ? next.delete(file) : next.add(file)
      return next
    })
  }

  const dismissIssue = (id: string) => {
    setDismissedIssues(prev => new Set([...prev, id]))
  }

  const getSeverityIcon = (severity: IssueSeverity) => {
    switch (severity) {
      case "error": return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
      case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
      case "info": return <Info className="w-3.5 h-3.5 text-blue-500" />
      case "suggestion": return <Zap className="w-3.5 h-3.5 text-purple-500" />
    }
  }

  const getCategoryIcon = (category: IssueCategory) => {
    switch (category) {
      case "security": return <Shield className="w-3 h-3" />
      case "performance": return <Zap className="w-3 h-3" />
      default: return null
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500"
    if (score >= 70) return "text-amber-500"
    return "text-red-500"
  }

  const filteredFiles = review?.files.map(f => ({
    ...f,
    issues: f.issues.filter(i => !dismissedIssues.has(i.id) && (filterSeverity === "all" || i.severity === filterSeverity)),
  })).filter(f => f.issues.length > 0) || []

  return (
    <div className="flex flex-col h-full bg-background text-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-1">
          <button onClick={runReview} disabled={isAnalyzing} className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-blue-500/20 text-blue-500 disabled:opacity-40 transition-colors">
            {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            {isAnalyzing ? "Analyzing..." : "Run Review"}
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          {(["all", "error", "warning", "info", "suggestion"] as const).map(s => (
            <button key={s} onClick={() => setFilterSeverity(s)} className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${filterSeverity === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Score Bar */}
      {review && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/10">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</span>
            <span className={`text-lg font-bold ${getScoreColor(review.overallScore)}`}>{review.overallScore}</span>
          </div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${review.overallScore >= 90 ? "bg-green-500" : review.overallScore >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${review.overallScore}%` }} />
          </div>
          <div className="flex gap-2 text-[10px]">
            <span className="text-red-500">{review.files.reduce((a, f) => a + f.issues.filter(i => i.severity === "error").length, 0)} errors</span>
            <span className="text-amber-500">{review.files.reduce((a, f) => a + f.issues.filter(i => i.severity === "warning").length, 0)} warnings</span>
          </div>
        </div>
      )}

      {/* Approval & Comments Bar */}
      {review && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Status:</span>
            <select
              value={approvalStatus}
              onChange={(e) => setApprovalStatus(e.target.value as ApprovalStatus)}
              className="text-[10px] bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none"
            >
              <option value="pending">⏳ Pending</option>
              <option value="approved">✅ Approved</option>
              <option value="changes-requested">🔄 Changes Requested</option>
              <option value="commented">💬 Commented</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded transition-colors ${showComments ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              <MessageSquare className="w-3 h-3" />
              Comments ({inlineComments.filter((c) => !c.resolved).length})
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-xs text-muted-foreground">Analyzing code quality...</p>
          </div>
        )}

        {!review && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <GitPullRequest className="w-8 h-8 opacity-30" />
            <p className="text-xs">No code review results</p>
            <button onClick={runReview} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500/10 text-blue-500 rounded-md hover:bg-blue-500/20 transition-colors">
              <Eye className="w-3 h-3" />
              Run Code Review
            </button>
          </div>
        )}

        {filteredFiles.map(fileReview => (
          <div key={fileReview.file} className="border-b border-border last:border-0">
            <button onClick={() => toggleFile(fileReview.file)} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 transition-colors">
              {expandedFiles.has(fileReview.file) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium flex-1 text-left truncate">{fileReview.file}</span>
              <span className={`text-[10px] font-bold ${getScoreColor(fileReview.score)}`}>{fileReview.score}</span>
              <span className="text-[10px] text-muted-foreground">{fileReview.issues.length} issues</span>
            </button>

            <AnimatePresence>
              {expandedFiles.has(fileReview.file) && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  {fileReview.issues.map(issue => (
                    <div key={issue.id} className="group px-3 py-2 ml-4 mr-2 mb-1 rounded border border-border bg-muted/5 hover:bg-muted/15 transition-colors">
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(issue.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <button onClick={() => onNavigateToFile?.(issue.file, issue.line)} className="text-xs text-blue-400 hover:underline font-mono">
                              L{issue.line}
                            </button>
                            {issue.rule && (
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted/30 px-1 rounded">{issue.rule}</span>
                            )}
                            {getCategoryIcon(issue.category) && (
                              <span className="text-muted-foreground">{getCategoryIcon(issue.category)}</span>
                            )}
                          </div>
                          <p className="text-xs text-foreground/80">{issue.message}</p>
                          {issue.suggestion && (
                            <p className="text-[11px] text-green-400/80 mt-1 flex items-start gap-1">
                              <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {issue.suggestion}
                            </p>
                          )}
                          {/* Inline Comment Thread */}
                          {showComments && (
                            <div className="mt-2 space-y-1">
                              {inlineComments
                                .filter((c) => c.file === issue.file && c.line === issue.line && !c.resolved)
                                .map((comment) => (
                                  <div key={comment.id} className="pl-2 border-l-2 border-primary/30">
                                    <div className="flex items-center gap-1 text-[10px]">
                                      <User className="w-2.5 h-2.5" />
                                      <span className="font-medium">{comment.author}</span>
                                      <span className="text-muted-foreground">{new Date(comment.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    <p className="text-[10px] text-foreground/80">{comment.content}</p>
                                    {comment.replies.map((r) => (
                                      <div key={r.id} className="ml-2 mt-0.5 pl-2 border-l border-border">
                                        <span className="text-[10px] font-medium">{r.author}: </span>
                                        <span className="text-[10px] text-foreground/70">{r.content}</span>
                                      </div>
                                    ))}
                                    <button onClick={() => resolveComment(comment.id)} className="text-[10px] text-green-400 hover:underline mt-0.5">
                                      Resolve
                                    </button>
                                  </div>
                                ))}
                              {commentingOn?.file === issue.file && commentingOn?.line === issue.line ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <input
                                    type="text"
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && newCommentText.trim()) addInlineComment(issue.file, issue.line, newCommentText.trim())
                                      if (e.key === "Escape") setCommentingOn(null)
                                    }}
                                    placeholder="Add comment..."
                                    className="flex-1 text-[10px] bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCommentingOn({ file: issue.file, line: issue.line })}
                                  className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 mt-0.5"
                                >
                                  <MessageSquare className="w-2.5 h-2.5" /> Comment
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <button onClick={() => dismissIssue(issue.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted/50 transition-opacity">
                          <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}

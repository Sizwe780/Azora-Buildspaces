"use client"

import React, { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

interface ErrorBoundaryProps {
  children: ReactNode
  /** Name displayed in the fallback UI, e.g. "Monaco Editor" */
  componentName?: string
  /** Optional compact mode for smaller panels */
  compact?: boolean
  /** Optional custom fallback renderer */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Reusable Error Boundary for heavy components (Monaco, ReactFlow, etc.)
 * Prevents a crash in one component from taking down the entire room.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.componentName || 'Unknown'}]`, error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      const name = this.props.componentName || "Component"

      if (this.props.compact) {
        return (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{name} failed to load</span>
            <button
              onClick={this.handleReset}
              className="ml-auto shrink-0 px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-xs text-red-300 transition-colors"
            >
              Retry
            </button>
          </div>
        )
      }

      return (
        <div className="h-full flex items-center justify-center bg-zinc-950/50 p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-200">{name} failed to load</h3>
              <p className="text-xs text-zinc-500 mt-1 font-mono break-all">
                {this.state.error.message}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

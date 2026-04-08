"use client"

import { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

export class MonacoErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: undefined
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Monaco editor error:', error, errorInfo)
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: undefined })
        window.location.reload()
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex items-center justify-center h-full bg-muted">
                    <div className="text-center p-8">
                        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
                        <h3 className="text-lg font-semibold mb-2">
                            Editor Failed to Load
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            {this.state.error?.message || 'Unknown error'}
                        </p>
                        <Button onClick={this.handleRetry}>
                            Retry
                        </Button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

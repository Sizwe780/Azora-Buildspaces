"use client"

import { type Diagnostic } from "./problems-panel"

/**
 * Apply diagnostic decorations to Monaco editor for minimap markers and gutter icons.
 * Call this whenever diagnostics change for the active file.
 */
export function applyDiagnosticDecorations(
    editor: any,
    monaco: any,
    diagnostics: Diagnostic[],
    activeFileId: string
): string[] {
    if (!editor || !monaco) return []

    const model = editor.getModel()
    if (!model) return []

    const fileDiags = diagnostics.filter(d => d.fileId === activeFileId)

    const decorations = fileDiags.map((diag) => {
        const severity = diag.severity
        const lineNumber = Math.max(1, Math.min(diag.line, model.getLineCount()))

        // Determine colors
        let className = ""
        let glyphMarginClassName = ""
        let minimapColor = ""
        let overviewRulerColor = ""

        switch (severity) {
            case "error":
                className = "squiggly-error"
                glyphMarginClassName = "codicon-error"
                minimapColor = "#f85149"
                overviewRulerColor = "#f85149"
                break
            case "warning":
                className = "squiggly-warning"
                glyphMarginClassName = "codicon-warning"
                minimapColor = "#d29922"
                overviewRulerColor = "#d29922"
                break
            case "info":
                className = "squiggly-info"
                glyphMarginClassName = "codicon-info"
                minimapColor = "#58a6ff"
                overviewRulerColor = "#58a6ff"
                break
            default:
                className = "squiggly-hint"
                glyphMarginClassName = "codicon-lightbulb"
                minimapColor = "#8b949e"
                overviewRulerColor = "#8b949e"
        }

        return {
            range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
            options: {
                isWholeLine: true,
                className,
                glyphMarginClassName,
                glyphMarginHoverMessage: { value: `**${severity.toUpperCase()}**: ${diag.message}${diag.rule ? ` [${diag.rule}]` : ""}` },
                hoverMessage: { value: `**${severity.toUpperCase()}**: ${diag.message}${diag.rule ? ` [${diag.rule}]` : ""}` },
                minimap: {
                    color: minimapColor,
                    position: monaco.editor.MinimapPosition.Inline,
                },
                overviewRuler: {
                    color: overviewRulerColor,
                    position: monaco.editor.OverviewRulerLane.Right,
                },
            },
        }
    })

    // Apply decorations and return IDs for cleanup
    const decorationIds = editor.deltaDecorations([], decorations)
    return decorationIds
}

/**
 * Register custom CSS for squiggly lines (call once on editor mount)
 */
export function registerDiagnosticStyles() {
    if (typeof document === "undefined") return

    const styleId = "code-chamber-diagnostic-styles"
    if (document.getElementById(styleId)) return

    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
        .squiggly-error {
            text-decoration: underline wavy #f85149;
            text-underline-offset: 3px;
        }
        .squiggly-warning {
            text-decoration: underline wavy #d29922;
            text-underline-offset: 3px;
        }
        .squiggly-info {
            text-decoration: underline wavy #58a6ff;
            text-underline-offset: 3px;
        }
        .squiggly-hint {
            text-decoration: underline dotted #8b949e;
            text-underline-offset: 3px;
        }
        .codicon-error::before {
            content: "●";
            color: #f85149;
            font-size: 14px;
        }
        .codicon-warning::before {
            content: "▲";
            color: #d29922;
            font-size: 10px;
        }
        .codicon-info::before {
            content: "ⓘ";
            color: #58a6ff;
            font-size: 12px;
        }
        .codicon-lightbulb::before {
            content: "💡";
            font-size: 10px;
        }
    `
    document.head.appendChild(style)
}

/**
 * Inject editor keybinding descriptions for Zen Mode
 */
export const ZEN_MODE_STYLES = `
    .zen-mode-overlay {
        position: fixed;
        inset: 0;
        z-index: 40;
        background: #0d1117;
        display: flex;
        flex-direction: column;
    }
    .zen-mode-overlay .monaco-editor {
        flex: 1;
    }
`

# SDLC: Code Chamber (Next-Gen Cloud IDE)

## 1. Vision & Purpose
The **Code Chamber** is the "Engine Room" of Azora-Buildspaces. Its goal is to provide a production-grade, web-based Integrated Development Environment (IDE) that rivals the performance and feature set of desktop VS Code while offering deep, context-aware AI integration.

## 2. Comprehensive Feature Roadmap

### A. Professional Editing & Language Intelligence
- **Intellisense (LSP)**: Transition from basic highlighting to full Language Server Protocol support.
    - *Goal*: Enable "Go to Definition", "Find All References", and "Rename Symbol" across the entire workspace.
    - *Tech*: monaco-languageclient + Language Servers (Pyright, TS-Server).
- **Multi-Editor Groups**: Support for split-view layouts (Horizontal/Vertical) and editor grid management.
    - *Goal*: Allow users to view specifications (Spec Chamber) and code (Code Chamber) side-by-side or multiple code files simultaneously.
- **Worker-Based Linting**: Move all code analysis to Web Workers to ensure 60fps UI performance during heavy refactoring.

### B. Advanced Version Control (Git)
- **3-Way Merge UI**: A visual conflict resolution interface within the editor.
    - *Goal*: Allow users to handle complex merges without leaving the browser.
- **Graphical Branching**: Integrate the Git Graph OSS into the sidebar.
    - *Goal*: Provide a clear visual map of commit history and branch divergence.
- **Staging & Stashing**: Support for partial staging (hunks/lines) and temporary stashing of work.

### C. Execution & Debugging (DAP)
- **Debug Adapter Protocol (DAP)**: Implement an interactive debugger with support for:
    - Breakpoints (toggle on line gutters).
    - Variable inspection (hover + sidebar).
    - Call stack visualization.
- **Port Management**: UI for automatic detection and proxying of running servers from the internal terminal.
- **Persistent Terminals**: Terminal state that survives page refreshes via a backend `tmux` or `screen` process.

### D. AI-Native Hardening (Agentic IDE)
- **MCP Integration**: Allow the "Elara AI" agent to use specific tools (e.g., searching documentation, running tests) directly from the text buffer.
- **Inline Ghost Text**: Copilot-style completions directly in the Monaco editor.
- **Contextual Diff Generation**: AI-suggested refactors presented as a side-by-side diff before implementation.

## 3. SDLC Phase Breakdown

### Phase 1: Core IDE Stability (Current Focus)
- Hardening the Virtual File System (VFS).
- Implementation of the `isomorphic-git` core.
- Finalizing the Monaco editor group management.

### Phase 2: Professional Toolchain Integration
- Integrating `monaco-languageclient` for TypeScript/JavaScript.
- Implementing the Git Graph visualizer.
- Adding the "Port Forwarding" sidebar.

### Phase 3: Advanced Debugging & AI Synergy
- Full DAP implementation for Node.js.
- Inline AI "Ghost Text" completions.
- 3-Way Merge conflict UI.

## 4. Quality Assurance (Hardening)
- **Unit Testing**: Jest for VFS operations and Git matrix status.
- **E2E Testing**: Playwright for cross-browser terminal and editor interaction verification.
- **Performance Benchmarks**: Ensure <100ms latency for key presses and <2s project boot time.

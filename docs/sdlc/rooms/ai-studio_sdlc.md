# SDLC: AI Studio (Agent Orchestration & Reasoning Engine)

## 1. Vision & Purpose
The **AI Studio** is the "Command Center" for adaptive software engineering. It provides a high-level orchestration layer powered by LangGraph, enabling users to design, test, and deploy multi-agent systems that autonomously handle coding, testing, and security auditing across the workspace.

## 2. Comprehensive Feature Roadmap

### A. Graph-Based Orchestration (LangGraph UI)
- **Interactive Graph Editor**: Replace linear task lists with a web-based node graph (using `React Flow`).
    - *Goal*: Visualize loops, conditional branching (e.g., "If tests fail, go back to Coder"), and parallel processing.
- **Node-Level Debugging**: Deep-dive into specific agent "nodes" to see hidden prompts, raw model responses, and state snapshots.
- **State Rewriting**: Allow the "Architect" (user) to pause execution, edit the agent's memory or message history, and "Resume" from a specific point.

### B. Observability & Advanced Traces
- **Live Reasoning Stream**: A real-time terminal-style or chat-style feed showing the agent's "chain of thought" (CoT).
- **Cost & Token Tracking**: Per-agent and per-workflow granular reporting of API consumption and latency.
- **Time Travel Debugging**: The ability to scroll back through the execution history and see the workspace state (VFS snapshot) at each step of the reasoning process.

### C. Tooling & Sandbox Security
- **MCP (Model Context Protocol) Integration**: Native support for connecting external MCP servers (e.g., GitHub, Postgres, Slack) as agent tools.
- **WASM-Based Code Interpreter**: Moving from regex-filtered local shell execution to a fully isolated WebAssembly sandbox for running agent-generated code.
- **Multi-Modal Verification**: Integrating Playwright to allow agents to "see" and "test" the UI they just built in the browser.

### D. Human-in-the-Loop (HITL) Governance
- **Approval Gates**: Hard-stop configurations for "Destructive Actions" (e.g., `git push`, `npm install`, `rm file`) requiring explicit user confirmation.
- **Agent Collaboration**: A "Squad" view where specialized agents (Sankofa, Themba, Jabari) can "debate" a code change before presenting it to the user.

## 3. SDLC Phase Breakdown

### Phase 1: Observability & Core Logic (Current Focus)
- Hardening the `LangGraphOrchestrator` and Firestore persistence.
- Implementing the `AgentMetrics` dashboard.
- Establishing the "Reasoning Trace" UI.

### Phase 2: Visual Orchestration & GITL
- Building the `React Flow` based node editor.
- Implementing "Pause & Resume" functionality.
- Adding "Approval Gates" for sensitive tool calls.

### Phase 3: Advanced Tooling & Security
- Integrating the WASM sandbox for code execution.
- Implementing the MCP client for dynamic tool discovery.
- Multi-modal agent support (Visual UI testing).

## 4. Quality Assurance (Hardening)
- **Token Efficiency**: Monitoring and optimizing prompt templates to reduce redundant token usage.
- **Safety Benchmarks**: Red-teaming the tool execution sandbox to ensure no malicious code can escape the environment.
- **Persistence Testing**: Ensuring that long-running agent threads (hours/days) correctly recover state from Firestore after workspace reloads.

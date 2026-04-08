# SDLC: Command Desk (Mission Control & DevOps Engine)

## 1. Vision & Purpose
The **Command Desk** is the "Mission Control" center for Azora-Buildspaces. It provides a centralized agentic interface for supervising the entire workspace, managing multi-room handoffs, orchestrating complex deployments, and monitoring the health of the live application and its infrastructure.

## 2. Comprehensive Feature Roadmap

### A. Agentic Mission Control (Supervisor UI)
- **Multi-Agent Supervision**: A real-time dashboard showing all active agents (Sankofa, Themba, Jabari, etc.), their current goal state, and the "Reasoning Trace" for each.
- **Cross-Room Context Injection**: The ability to "teleport" context between rooms (e.g., "Send this build error from Command Desk to Code Chamber for fixing").
- **Agentic Handoffs**: Formalizing the `@room-name` and `agent.handoff.*` commands to ensure seamless transitions between design, code, and deployment phases.

### B. DevOps & Infrastructure Management
- **Visual K8s/Docker Navigator**: A graphical representation of the workspace's infrastructure (based on `k8s/` and `docker-compose.yml`), allowing users to monitor pod status and logs.
- **SSH-Based Deployment Bridge**: Hardening the `deploy-node.ts` logic to support safe, encrypted deployments to remote workers or cloud providers (Vercel, AWS, Fly.io).
- **Process Manager (Multi-Terminal)**: A dedicated view for managing parallel services (e.g., Frontend, API, Database, Redis), with real-time port forwarding and restart/kill controls.

### C. Observability & Telemetry
- **Log Streaming Overlay**: Integrated real-time log tailing from both local development processes and remote production pods.
- **Project Health Dashboard**: Visual metrics (CPU/RAM/Network) and uptime monitoring for the active project.
- **CI/CD Watcher**: Automated monitoring of GitHub Actions or local test suites, with AI-driven "Suggested Fixes" for any identified failures.

### D. Global Search & Omnibar (Command Palette)
- **Advanced Command Palette**: Deepening the `Ctrl+Shift+P` functionality to support extension-specific commands and workspace-wide symbol navigation.
- **Unified Activity Feed**: A chronologically ordered feed showing all significant events (Git commits, successful builds, agent completions, and deployment status).

## 3. SDLC Phase Breakdown

### Phase 1: Orchestration & Handoffs (Current Focus)
- Hardening the `CommandPalette` and `@room` jumping logic.
- Establishing the "Reasoning Trace" and "Quick Actions" for agents.
- Basic terminal integration for build commands.

### Phase 2: DevOps & Infra Visibility
- Building the visual Docker/K8s pod navigator.
- Implementing the `deploy-node.ts` UI for remote deployments.
- Strengthening the log streaming and process control APIs.

### Phase 3: Observability & Health
- Integrating Prometheus/Grafana or custom telemetry for health metrics.
- Building the AI-driven "CI/CD Watcher" for automated bug detection.
- Advanced "Omnibar" features for deep symbol search.

## 4. Quality Assurance (Hardening)
- **Command Latency**: Ensuring the Omnibar remains responsive (under 50ms) regardless of workspace size.
- **Deployment Security**: Verifying that SSH-based deployments use safe key management and prevent credential leakage.
- **Agent Reliability**: Benchmarking the "Supervisor" agent's ability to coordinate multi-step tasks across rooms without losing context.

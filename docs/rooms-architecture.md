# Azora Buildspaces - Rooms Architecture Document

The Buildspaces application utilizes a sophisticated modular architecture built on the Next.js App Router. The core of this system revolves around **"Rooms"**, which are specialized, dynamically-loaded environments managed by a unified workspace shell. 

Here is the complete architectural breakdown detailing how each room is structured, their core features, connected code files, integration points, and UI/accessibility considerations for an overhaul.

---

## 1. Global Workspace Shell (`/workspace`)
### Integration & App Router Framework
- **Entry Point:** `app/workspace/page.tsx` is the primary entry point and orchestrator for all rooms. 
- **Dynamic Loading:** Every room is dynamically imported using `next/dynamic` with `ssr: false` to reduce the initial bundle size and accommodate heavy client-side libraries (like Monaco, ReactFlow, and Yjs). 
- **Context:** The `WorkspaceProvider` (`lib/contexts/workspace-context.tsx`) manages the `activeRoom` state and orchestrates cross-room navigation.
- **Layout Integration:** The shell provides persistent UI frames like the `WorkspaceHeader`, `WorkspaceSidebar`, command palettes, and `RoomSelector`. However, when navigating to the "**Code Chamber**" (`isFullbleedRoom`), the shell drops the standard chrome and allows the IDE to take over the entire viewport.

---

## 2. Code Chamber (`code-chamber`)
The central Integrated Development Environment (IDE) environment for software engineering with full filesystem, terminal, and extension abstractions.

### Core Features & UI Layout
- **Full-bleed IDE:** Overrides the global workspace shell to display a VS Code-like layout (activity bar, editor tabs, split views, terminal panel, and status bar).
- **Yjs/WebRTC Sync:** Real-time peer-to-peer file synchronization utilizing `y-webrtc`.
- **Persisted Workbench:** Automatically stores active editors, file states, and pane dimensions in `localStorage` (`buildspaces.session.[id]`).
- **Heavy Panels:** Search/Replace, AI Assistants, Problems/Terminal panels, Git Source Control, and Telemetry/CICD view toggles.

### Connected Code Files
- **App Routes:** `app/api/fs/*` (Filesystem), `app/api/code-chamber/*`, `app/api/live-preview/*`, `app/api/telemetry/*`
- **Components Base:** `components/workspace/code-chamber.tsx`
- **Inner Components:** `components/workspace/*` (e.g. `views/explorer-view.tsx`, `panels/testing-panel-full.tsx`, `diff-editor.tsx`)
- **Libraries:** `lib/stores/file-system.ts`, `lib/stores/workbench-store.ts`, `lib/hooks/use-workspace-session.ts`

### State & Overhaul Considerations
- **State Complexity:** Heavily relies on two centralized Zustand stores (`useFileSystem` and `useWorkbench`). 
- **A11y Considerations:** Requires extensive ARIA tagging for nested tree-view file explorers and draggable tab items. Focus trapping across split boundaries needs tight management during keyboard navigation.

---

## 3. Design Studio (`design-studio`)
A real-time UI/UX design canvas that blends infinite canvas methodologies with actual code component previews (Constitutional compliance: "No Mock, real components").

### Core Features & UI Layout
- **ReactFlow Canvas:** A nodal infinite canvas representing components and viewports.
- **Figma Integration:** Imports assets dynamically checked against a local component library.
- **Accessibility & Mobile Validation:** Real-time feedback for missing ARIA properties, responsive constraints, and token compatibility.

### Connected Code Files
- **App Routes:** `app/api/design/*`, `app/api/figma/*`
- **Components Base:** `components/rooms/design-studio.tsx`
- **Inner Components:** `components/rooms/design-studio/*` (e.g., `studio-canvas.tsx`, `ComponentLibrary.tsx`, `FigmaImportDialog.tsx`, `ColorPalette.tsx`)
- **Libraries:** Token generators and system manager configs.

### State & Overhaul Considerations
- **Viewport Layout State:** The design studio frequently changes context arrays (desktop, tablet, mobile bounds).
- **A11y Considerations:** The infinite canvas requires screen-reader accessible alternatives since canvas graphs are opaque to assistive tech. Adding linear "list-views" of canvas components will drastically improve a11y.

---

## 4. AI Studio (`ai-studio`)
A command center for training, benchmarking, and configuring LLM Agents and LangGraph workflows.

### Core Features & UI Layout
- **Model Workbench:** Live comparison charts (Latency, Cost, Context, Strengths) between models (e.g., GPT-4o, Claude 3.5, Mistral).
- **Node-based Agents:** Workflow pipelines mapping inputs, tools, transform logic, and LLM calls.
- **Prompt Library:** A repository of preset and custom engineering prompts (Code Review, API Design, Security Audit).
- **LangGraph Executions:** Reasoning traces showing tool chaining and recursive thinking.

### Connected Code Files
- **App Routes:** `app/api/ai-studio/*`, `app/api/notebook/*`, `app/api/mcp/*`
- **Components Base:** `components/rooms/ai-studio.tsx`
- **Inner Components:** `components/rooms/ai-studio/*` (e.g., `AgentGraph.tsx`, `ModelComparison.tsx`, `NotebookInterface.tsx`)
- **Libraries:** LangGraph orchestrators (`lib/agents/langgraph-orchestrator.ts`).

### State & Overhaul Considerations
- **State Toggles:** Multiple views toggle between graph views, prompt building, and diagnostic JSON traces. 
- **A11y Considerations:** Workflow diagrams will need accessible data-table fallback equivalents. Complex metric charts should provide descriptive `aria-label`s explaining trends.

---

## 5. Spec Chamber (`spec-chamber`)
Requirements gathering and specification detailing using rich text, YAML frontmatter, and agentic breakdown.

### Core Features & UI Layout
- **Markdown & YAML Editor:** Real-time document editing backed by Monaco and Yjs.
- **Mermaid Diagrams:** Live visualizations of workflows, database schemas, and architectures rendered from text.
- **Live Preview Toggles:** Split-pane requirement checklist generators.

### Connected Code Files
- **App Routes:** `app/api/specs/*`
- **Components Base:** `components/rooms/spec-chamber.tsx`
- **Libraries:** `lib/spec-kit.ts`, `lib/stores/spec-store.ts`, `js-yaml` validation.

### State & Overhaul Considerations
- **Data Integration:** Specs feed straight into tasks and code chambers.
- **A11y Considerations:** Ensure proper contrast inside the Mermaid SVG charts and keep live-preview sync accessible without disorienting reader focus.

---

## 6. Maker Lab (`maker-lab`)
Hardware simulation and IoT architectural space featuring 3D component interactions and real-time MQTT feeds.

### Core Features & UI Layout
- **3D Viewer:** A dynamic, CSR-only Three.js component viewer.
- **Live Telemetry & Logs:** Real-time charting of sensor readings via MQTT test brokers and simulated Serial Rx/Tx logs.
- **Hardware Integration Setup:** API generators, circuit simulators, firmware endpoints, and OTA updating visualizations.

### Connected Code Files
- **App Routes:** `app/api/maker-lab/*`, `app/api/deploy/*`
- **Components Base:** `components/rooms/maker-lab.tsx`
- **Inner Components:** `components/rooms/maker-lab/*` (e.g., `ComponentViewer.tsx`, `DatabaseDesigner.tsx`, `CircuitSimulator.tsx`, `FirmwareEditor.tsx`)
- **External Dependencies:** `mqtt`, `Three.js` (loaded dynamically)

### State & Overhaul Considerations
- **Performance:** Ensure unmounting cleanly disables WebGL contexts and WebSocket/MQTT listeners to avoid memory leaks.
- **A11y Considerations:** 3D representations require keyboard manipulation instructions and text-based status readouts for sensors.

---

## 7. Command Desk (`command-desk`)
An AI-powered terminal palette functioning as the quick-action core of the app.

### Core Features & UI Layout
- **Slash Commands:** Integrated `/deploy`, `/refactor`, `/generate-component` chat macros.
- **Context Injection:** Awareness of active languages, frameworks, and workspace configurations to provide contextual reasoning traces.

### Connected Code Files
- **App Routes:** `app/api/command-desk/*`
- **Components Base:** `components/rooms/command-desk.tsx`
- **Libraries:** `lib/store/use-citadel-store.ts`

### State & Overhaul Considerations
- **UI Flow:** An extensive scroll area with floating absolute input elements. Overhauling this requires precise sticky-bottom form layouts to handle mobile device virtual keyboards.

---

## 8. Collaboration Pod (`collaboration-pod`)
A team synchronization hub incorporating whiteboard, Video conferencing, code sync, and status presence.

### Core Features & UI Layout
- **Awareness Protocol:** Live participant tracking via Yjs (online/away/typing/driver-mode statuses).
- **Communication Streams:** Screensharing overlays, chat integrations, flying emojis, video pods, and whiteboard canvases.

### Connected Code Files
- **App Routes:** `app/api/collaboration/*`
- **Components Base:** `components/rooms/collaboration-pod.tsx` (sometimes via `collaboration-pod/CollaborationPod.tsx`)
- **Inner Components:** `components/rooms/collab-pod/*` (`Whiteboard.tsx`, `VideoConference.tsx`, `Chat.tsx`)

### State & Overhaul Considerations
- **Shared Drivers:** Driver/follower state mechanics rely heavily on WebRTC. Handle fallback reconnects smoothly.
- **A11y Considerations:** Live-chat and emoji broadcasts need `aria-live` regions for screen readers, but decoupled enough that they don't spam users. Video toggles must be keyboard navigable.

---

## 9. Innovation Theater (`innovation-theater`)
Presentation software with AI integrations, primarily used for pitching or reviewing architectures.

### Core Features & UI Layout
- **AI Slide Generator:** Asynchronous slide creation based on prompt topics.
- **Real-Time QA & Sentiment:** Web-hook style chat mapping audience sentiment using backend classification.

### Connected Code Files
- **App Routes:** `app/api/theater/*`
- **Components Base:** `components/rooms/innovation-theater.tsx`

### State & Overhaul Considerations
- **Audio/Video Focus:** Polling and mic/camera APIs. Ensure that focus trapping occurs cleanly when entering the full-screen Presenter Mode.

---

## 10. Knowledge Ocean (`knowledge-ocean`)
The indexed search and discovery engine across the workspace file tree, documentation, and external packages.

### Core Features & UI Layout
- **Universal Filter & Tagging:** Semantic highlighting over search queries mapping files, tests, schemas, and schemas.
- **Node Network Map:** Graphs the dependency relations between concepts and files.

### Connected Code Files
- **App Routes:** `app/api/knowledge/*`
- **Components Base:** `components/rooms/knowledge-ocean.tsx`

### Overhaul Considerations
- A redesign should carefully rethink the layout of list cards (`KnowledgeCard`) vs grid cards, accommodating extensive tags without overflowing horizontally.

---

## 11. Task Board (`task-board`)
Sprint, ticketing, and scheduling hub.

### Core Features & UI Layout
- **Kanban & Timelines:** Board, List, Sprint, and Timeline toggles.
- **Prioritization Layers:** Color-coded status updates mapped alongside issue tracking descriptors.

### Connected Code Files
- **App Routes:** `app/api/tasks/*`
- **Components Base:** `components/rooms/task-board.tsx`

### Overhaul Considerations
- **Drag-And-Drop:** Overhauls usually break `framer-motion` layout animations. Ensure `Reorder.Group` / `layoutId` properties are strictly preserved so task shuffling continues working locally.

---

## 12. Marketplace & Collectible Showcase (`marketplace`, `collectible-showcase`)
Gamification and Extension hub rooms.

### Core Features & UI Layout
- **Marketplace:** Provides templates, AI agents, and component packs installable into the workspace (`app/api/marketplace/*`, `components/rooms/marketplace.tsx`).
- **Collectibles:** Gamifies coding streaks, Azora balances, and workspace accomplishments showing rarity tiers (Common -> Mythical) and Leaderboards (`app/api/collectibles/*`, `components/rooms/collectible-showcase.tsx`).

### State & Overhaul Considerations
- **A11y Considerations:** Heavy use of gradients, glowing elements, and custom CSS effects require checks against WCAG contrast guidelines.

---

## 13. Deep Focus (`deep-focus`)
A minimalist Pomodoro/Focus room tailored for distraction-free execution.

### Connected Code Files
- **App Routes:** Utilizes activity APIs `app/api/activity/*`
- **Components Base:** `components/rooms/deep-focus/DeepFocus.tsx` (wrapped by `app/rooms/deep-focus.tsx`).

### Overhaul Considerations
- Keep layout extremely sparse. UI redesigns should prioritize typography and visual breathing room. Minimal layout shifts during timer updates.
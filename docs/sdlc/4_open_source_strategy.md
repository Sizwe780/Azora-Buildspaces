# SDLC Open Source Strategy & Selection: Azora-Buildspaces

## 1. Strategy Overview
To accelerate the transformation of **Azora-Buildspaces** into the premier collaborative development environment, we will adopt a "Hybrid Engineering" approach. We will maintain proprietary "Glue" (Room Architecture, File System Abstraction, Workspace Orchestration) while integrating world-class Open Source Software (OSS) for specialized functionalities.

## 2. Strategic Evaluation Criteria
- **Maturity**: Prefer projects with >1k stars and active maintenance.
- **License**: Must be MIT, Apache 2.0, or BSD (avoiding GPL where possible for standalone flexibility).
- **Extensibility**: Must provide hooks or APIs for deep integration into the Azora "Room" system.
- **Performance**: Must not compromise the "instant-on" feel of the workbench.

## 3. Selected OSS Integrations by Room

### A. Code Chamber (IDE & Git)
- **Problem**: Basic file listing and terminal; lack of deep Git visualization.
- **OSS Selection**: 
    - **isomorphic-git**: For full browser-side Git implementation (clone, push, pull).
    - **Monaco Language Client**: To support Language Server Protocol (LSP) for advanced Intellisense.
    - **Git Graph**: Components for visual branch/merge history.

### B. Spec Chamber (Architecture & Requirements)
- **Problem**: Static YAML fields; lack of visual architectural feedback.
- **OSS Selection**:
    - **Mermaid.js**: Automated generation of UML, Flowcharts, and Sequence diagrams from AI-generated specs.
    - **Spectral (Stoplight)**: To lint and validate specifications against industry-standard "Clean Architecture" rules.

### C. Design Studio (Canvas & UI)
- **Problem**: Custom canvas logic is difficult to maintain and lacks advanced UX (zoom/pan/selection).
- **OSS Selection**:
    - **tldraw**: To replace the custom canvas with a professional-grade whiteboard/design tool.
    - **Storybook**: Integrated as a "Component Room" to test AI-generated React components in isolation.

### D. AI Studio & Command Desk (Intelligence)
- **Problem**: Custom agent logic is linear and lacks "Memory" or complex reasoning loops.
- **OSS Selection**:
    - **LangGraph**: To enable cycle-based agent reasoning (loops, retries, self-correction).
    - **LlamaIndex / ChromaDB**: To implement the "Knowledge Ocean" (RAG) over the workspace files.
    - **JupyterLite**: To provide interactive, browser-side Python execution for data scientists and AI builders.

### E. Collaboration Pod (Sync)
- **Problem**: Managing socket infrastructure for multi-player presence is complex.
- **OSS Selection**:
    - **Hocuspocus (Tiptap)**: A robust backend for Yjs (current sync engine) to handle persistence and presence at scale.

## 4. Implementation Priority (Sprint 1-2)
1.  **tldraw** integration (Design Studio) - High impact, low complexity.
2.  **Mermaid.js** (Spec Chamber) - Instant "AI-to-Diagram" value.
3.  **LangGraph** (AI Studio) - Vital for the next generation of autonomous agents.
4.  **isomorphic-git** (Code Chamber) - Essential for professional Git integration.

## 5. Build vs. Buy (OSS) Table
| Feature | Build (Proprietary) | Buy/Integrate (OSS) |
| :--- | :--- | :--- |
| **Workspace Runtime** | Node/Docker/K8s Logic | - |
| **Room Shell** | Next.js Components | - |
| **Visual Whiteboard** | - | tldraw |
| **Agent Reasoning** | Agent Bridge / Prompting | LangGraph |
| **Vector Search** | - | LlamaIndex |
| **Diagramming** | - | Mermaid.js |
| **IDE Editor** | - | Monaco |

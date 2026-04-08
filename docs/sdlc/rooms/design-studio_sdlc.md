# SDLC: Design Studio (Visual UI & Prototype Engine)

## 1. Vision & Purpose
The **Design Studio** is the "Aesthetic Architect" of Azora-Buildspaces. It enables a visual-first development workflow by bridging the gap between high-fidelity Figma designs, infinite canvas whiteboarding, and production-ready React/Tailwind code.

## 2. Comprehensive Feature Roadmap

### A. Unified Multi-Engine Canvas
- **Hybrid Viewport (React Flow + tldraw)**: A seamless integration where "Frame Nodes" (high-fidelity UI screens) live within an infinite tldraw whiteboarding space for annotations and user flow mapping.
- **Live Component Rendering**: Moving beyond static previews to rendering *actual compiled React components* from the workspace's `components/` directory directly on the canvas.
- **Design Token Synchronization**: Bi-directional sync between the visual theme editor (Colors, Typography, Spacing) and the `tailwind.config.ts` or `globals.css` in the codebase.

### B. Pro-Grade Figma Integration
- **Continuous Sync (Webhooks)**: Transitioning from manual Figma imports to a "Watch Mode" where updates in Figma trigger automated PRs or "Change Suggestions" in the AI Studio.
- **Layer-to-Component Mapping**: Intelligent AI assistance that recognizes Figma layers (e.g., "Nav Bar", "Footer") and maps them to existing workspace components or creates new ones.
- **Asset Pipeline**: Automated optimization and injection of Figma-exported icons and images into the `/public/` directory.

### C. Advanced Design-to-Code (D2C)
- **Fluid Responsive Design**: Visual breakpoint management that allows users to define "Mobile", "Tablet", and "Desktop" views, generating responsive Tailwind classes automatically.
- **A11y-First Generation**: Integrating the "AI Shield" to enforce WCAG accessibility standards (aria-labels, contrast, semantic HTML) during the code generation phase.
- **Interactive Prototyping**: Generating real Next.js routing logic based on the "Connections" drawn between frames on the canvas.

### D. Collaboration & State
- **Real-Time Presence**: Full cursor-tracking and multi-user editing powered by `yjs` and `y-websocket`.
- **Comment-to-Code Traceability**: Linking designer comments on the canvas directly to TODOs or GH Issues in the source code.

## 3. SDLC Phase Breakdown

### Phase 1: Canvas & Theming (Current Focus)
- Hardening the `InfiniteCanvas` and `reactflow` integration.
- Implementing the `ComponentLibrary` with drag-and-drop.
- Basic design-to-code generation via AI.

### Phase 2: Figma & Git Synchronization
- Implementing the real-time Figma API bridge.
- Strengthening the `tailwind.config.ts` dynamic update engine.
- Establishing the "Git PR" workflow for design changes.

### Phase 3: Advanced Logic & A11y
- Building the "Logic Builder" (Visual state machines).
- Implementing full a11y-first code generation.
- Responsive breakpoint visualizer.

## 4. Quality Assurance (Hardening)
- **Visual Parity**: Regularly benchmarking the D2C output against original Figma files for pixel-perfect accuracy.
- **Performance**: Optimizing the infinite canvas to handle 50+ high-fidelity frames without UI lag.
- **Safety**: Ensuring that AI-generated code doesn't overwrite manual developer overrides in the same file.

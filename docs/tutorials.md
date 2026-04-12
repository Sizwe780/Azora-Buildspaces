# Azora Buildspaces User Tutorials

Welcome to Azora Buildspaces! This guide provides comprehensive, step-by-step tutorials for mastering every specialized room in the workspace. Whether you're coding, designing architectures, or collaborating, these tutorials will equip you with everything you need.

---

## 1. Code Chamber: Full IDE Walkthrough

The **Code Chamber** is a fully featured, in-browser Monaco IDE environment equipped with advanced AI pairing capabilities.

### Objectives:
- Open and edit files.
- Use the integrated terminal.
- Pair program with AI.

### Steps:
1. **Navigate to the Code Chamber:** From the workspace Sidebar, click on the **Code Chamber** icon (typically the curly braces icon).
2. **File Explorer:** On the left, expand your workspace directory structure. Click on any `.ts` or `.tsx` file.
3. **Editing:** Start typing. The Monaco editor provides IntelliSense, syntax highlighting, and autocomplete features out-of-the-box.
4. **Terminal:** Press `` Ctrl + ` `` to toggle the integrated terminal. Run standard `npm run build` or `pnpm dev` commands here.
5. **AI Pairing (Elara):** Highlight a block of code, right-click, and select "Ask AI Agent" to invoke Elara. Ask her to refactor or explain the code.

---

## 2. Spec-Driven Development with Spec Chamber

The **Spec Chamber** is built to help you formalize software requirements using AI before writing a single line of code.

### Objectives:
- Generate an architectural document.
- Translate specs into tests.

### Steps:
1. **Enter the Spec Chamber:** Click the **Spec Chamber** icon on the sidebar.
2. **Define Scope:** In the central prompt box, type the requirements for your new feature (e.g., “Create a robust user authentication flow using OAuth2”).
3. **Generate Spec:** Click **Generate Architectural Spec**. The AI will generate a living document outlining data models, API endpoints, and UI views.
4. **Review & Refine:** Read through the generated Markdown. You can easily edit sections or ask the AI to expand on specific data models.
5. **Export:** Click the "Export to Code" or "Generate Tests" button on the toolbar. The AI will spin up boilerplates based exactly on your approved specification.

---

## 3. Real-Time Collaboration in Collaboration Pod

The **Collaboration Pod** acts as the multiplayer hub of the workspace, designed for real-time team interactions.

### Objectives:
- Connect with your team.
- Use the shared whiteboard and multiplayer editing.

### Steps:
1. **Join the Pod:** Open the **Collaboration Pod** from the workspace sidebar.
2. **Video & Audio:** Enable your camera and microphone using the control bar at the bottom of the screen.
3. **Multiplayer Editor:** Open a file while in the Pod. Your cursor, and your teammates' cursors, are synchronized via WebSockets (backed by Redis PubSub), making pair programming seamless.
4. **Shared Whiteboard:** Switch the view from "Editor" to "Whiteboard" to diagram system architectures simultaneously with your distributed team.

---

## 4. Knowledge Ocean: Semantic Code Search

The **Knowledge Ocean** unlocks AI-powered navigation through complex codebases and architectural documents using vector embeddings.

### Objectives:
- Perform semantic search.
- Ask high-level architectural queries.

### Steps:
1. **Open Knowledge Ocean:** Access it from the sidebar navigation.
2. **Search:** In the **Semantic Search** bar, instead of searching for variable names, search for concepts: “Where do we handle the rate-limiting for the user authentication API?”
3. **Review Context:** The engine (using Sankofa and MiniSearch) will return snippet cards. Clicking on a card will immediately open the relevant file in the Code Chamber at the exact line number.
4. **Knowledge Graph:** Toggle the view to "Graph Mode" to visually explore how your backend services connect to your frontend components based on import tracing and AST analysis.

---

## 5. Design Studio: UI Sandbox

The **Design Studio** provides a dedicated sandbox for UI prototyping and accessibility audits.

### Objectives:
- Generate color palettes.
- Audit accessibility (a11y).

### Steps:
1. **Open Design Studio:** Click the palette icon from the workspace sidebar.
2. **AI Component Generation:** Describe a React component (e.g., “A responsive pricing tier card”). The AI will generate the component and render it live.
3. **Theme & Variables:** Use the **Color Palette Generator** on the right side to adjust primary/secondary brand colors in real-time.
4. **Figma Bridge:** Click “Import from Figma” to sync styles or draft components directly from your design team’s Figma board.

---

## 6. Command Desk: Observability & Administration

The **Command Desk** gives you an eagle-eye view of your application’s health, AI token usage, and system metrics.

### Objectives:
- Monitor system vitals.
- Audit AI operations.

### Steps:
1. **Access Command Desk:** Open the terminal/dashboard icon in the sidebar.
2. **System Vitals:** View real-time graphs for CPU usage, Memory, and Node.js Event Loop lags.
3. **Audit Logger:** Review the **Constitutional AI Audit Logs** to ensure agents are operating safely and securely within predefined system boundaries.
4. **Token Limits:** Monitor and allocate AI token quotas across your different teams.
# Requirements Document
## Room Deep Audit — BuildSpaces

### Introduction

This document captures every stub, placeholder, fake implementation, hardcoded data point, and non-functional feature found during a deep audit of all 12 BuildSpaces rooms. The previous audit (full-application-audit-implementation) addressed the API layer. This audit goes deeper into frontend components and remaining backend gaps to produce a complete picture of what must be made real and functional.

---

## Glossary

- **Stub**: A function or component that exists but returns fake/hardcoded data instead of real results
- **In-memory store**: A JavaScript Map or array used as a data store that is lost on server restart
- **Fake simulation**: A UI that animates or shows numbers without performing real computation
- **Non-functional button**: A UI control that renders but has no real action wired to it
- **SPICE**: Simulation Program with Integrated Circuit Emphasis — the standard for circuit simulation
- **WebRTC**: Web Real-Time Communication — browser-native peer-to-peer video/audio protocol
- **Y.js**: A CRDT library for real-time collaborative editing
- **RAG**: Retrieval-Augmented Generation — AI answering questions from a knowledge index
- **AZR**: Azora token — the platform economy currency
- **LSP**: Language Server Protocol — provides IDE features like autocomplete and diagnostics
- **DAP**: Debug Adapter Protocol — provides debugger integration
- **SSE**: Server-Sent Events — one-way real-time push from server to browser

---

## Requirements

### Requirement 1: Code Chamber — Testing Panel Component Fake Fallback

**User Story:** As a developer, I want the testing panel in the Code Chamber to always show real test results, so that I can trust the pass/fail status I see.

#### Acceptance Criteria

1. WHEN the `/api/code-chamber/tests/run` API call succeeds, THE Testing_Panel SHALL display the real results returned by the API without falling back to random simulation
2. WHEN the `/api/code-chamber/tests/run` API call fails, THE Testing_Panel SHALL display an error state with the failure reason rather than simulating random pass/fail outcomes
3. THE Testing_Panel SHALL NOT use `Math.random()` to determine test pass/fail status under any circumstances
4. WHEN a single test is run via `runSingleTest()`, THE Testing_Panel SHALL call the API with the specific test name rather than using `Math.random()` for the result
5. WHEN no active file is selected, THE Testing_Panel SHALL display a placeholder state prompting the user to open a file rather than generating fake test names

**Correctness Properties:**
- FOR ALL test runs, the displayed pass/fail status MUST match the actual test runner output
- Running the same test file twice with no code changes MUST produce the same results

### Requirement 2: Code Chamber — Performance Profiler Real Integration

**User Story:** As a developer, I want the performance profiler to show real runtime metrics, so that I can identify actual bottlenecks.

#### Acceptance Criteria

1. THE Performance_Profiler SHALL analyze the actual content of the active file using static analysis (hook counts, complexity metrics) rather than simulating a delay
2. WHEN profiling is triggered, THE Performance_Profiler SHALL call `/api/code-chamber/profile` with the file content and return real static analysis results
3. THE Performance_Profiler SHALL NOT use artificial `setTimeout` delays to simulate profiling work
4. WHERE runtime profiling is not available, THE Performance_Profiler SHALL clearly label results as "Static Analysis" rather than implying live runtime data

### Requirement 3: AI Studio — Training Dashboard Fake Simulation

**User Story:** As an AI developer, I want the training dashboard to show real training metrics from an actual training job, so that I can monitor real model training progress.

#### Acceptance Criteria

1. WHEN `isTraining` is true, THE Training_Dashboard SHALL poll `/api/ai-studio/training/status` for real epoch, loss, and accuracy data rather than generating values with `Math.random()`
2. THE Training_Dashboard SHALL NOT generate fake GPU utilization values using `Math.random()`
3. WHEN no training job is active, THE Training_Dashboard SHALL display a "No Active Training" state with a button to start a real training job
4. THE Training_Dashboard SHALL display the real model name, dataset, and hyperparameters from the active training job

**Correctness Properties:**
- FOR ALL training sessions, the displayed loss curve MUST be monotonically decreasing on average (real training behavior)
- The epoch counter MUST match the actual epoch reported by the training backend

### Requirement 4: AI Studio — Agent Metrics Fallback to Mock Data

**User Story:** As a platform operator, I want agent metrics to always come from real usage records, so that cost and token reporting is accurate.

#### Acceptance Criteria

1. WHEN `/api/ai-studio/metrics` returns an error, THE Agent_Metrics component SHALL display an error state with a retry button rather than falling back to hardcoded mock agent names and random token counts
2. THE Agent_Metrics component SHALL NOT use `Math.random()` to generate token history data under any circumstances
3. THE Agent_Metrics component SHALL NOT hardcode agent names ("Sankofa", "Themba", "Jabari", "Nia", "Imani", "Elara") as fallback data
4. WHEN the metrics API returns empty data, THE Agent_Metrics component SHALL display a "No usage data yet" empty state

### Requirement 5: AI Studio — Metrics API File-Based Storage

**User Story:** As a platform operator, I want AI Studio metrics to be stored in the database, so that metrics survive server restarts and are queryable.

#### Acceptance Criteria

1. THE AI_Studio_Metrics_API SHALL persist token usage records to the `AIUsageRecord` Prisma model rather than a flat JSON file at `data/metrics/ai-studio.json`
2. WHEN the metrics file does not exist, THE AI_Studio_Metrics_API SHALL return empty metrics from the database rather than a 503 error
3. THE AI_Studio_Metrics_API SHALL support querying metrics by date range, agent name, and model
4. THE AI_Studio_Metrics_API SHALL aggregate token history from real `AIUsageRecord` rows grouped by hour

### Requirement 6: Maker Lab — Firmware Flash Simulation

**User Story:** As a hardware developer, I want the firmware flash operation to actually transfer firmware to the device, so that I can program real hardware from the browser.

#### Acceptance Criteria

1. WHEN a user initiates firmware flash, THE Firmware_Editor SHALL use the Web Serial API to perform a real binary transfer rather than simulating progress with a loop
2. THE Firmware_Editor SHALL integrate `esptool-js` or equivalent to perform real ESP32/ESP8266 firmware flashing
3. IF the Web Serial API is unavailable, THEN THE Firmware_Editor SHALL display a clear message explaining the browser requirement rather than simulating a fake flash
4. THE Firmware_Editor SHALL display the real flash progress percentage from the actual transfer operation

### Requirement 7: Maker Lab — Circuit Simulator SPICE Analysis

**User Story:** As a hardware developer, I want the circuit simulator to perform real SPICE analysis, so that I get accurate electrical simulation results.

#### Acceptance Criteria

1. THE Circuit_Simulator SHALL perform real nodal analysis using Kirchhoff's Current Law rather than using hardcoded component resistance values as a proxy for circuit analysis
2. WHEN components are connected in series, THE Circuit_Simulator SHALL calculate the correct total resistance as the sum of individual resistances
3. WHEN components are connected in parallel, THE Circuit_Simulator SHALL calculate the correct equivalent resistance using the parallel resistance formula
4. THE Circuit_Simulator SHALL calculate real power dissipation (P = V²/R) for each component based on the actual circuit topology
5. THE `/api/maker-lab/simulate` endpoint SHALL return deterministic results based on actual circuit topology, not seeded hash values

**Correctness Properties:**
- FOR ALL series circuits, the total resistance MUST equal the sum of component resistances
- FOR ALL parallel circuits, the equivalent resistance MUST be less than the smallest individual resistance
- Round-trip property: encoding a circuit to JSON and decoding it MUST produce the same simulation results

### Requirement 8: Maker Lab — API Endpoint Generator Mock Database Pattern

**User Story:** As a developer, I want the API endpoint generator to produce real, production-ready code, so that I can use the generated code directly.

#### Acceptance Criteria

1. THE API_Endpoint_Generator SHALL generate Next.js API routes that use real Prisma database queries rather than a "mock database pattern"
2. THE API_Endpoint_Generator SHALL NOT include "Use a mock database pattern for now" in its AI prompt
3. WHEN generation fails, THE API_Endpoint_Generator SHALL display the actual error rather than falling back to a stub template with `// TODO: Implement endpoints`
4. THE API_Endpoint_Generator SHALL generate routes with real Zod validation, real error handling, and real authentication checks

### Requirement 9: Maker Lab — Auth Template Generator TODO Comments

**User Story:** As a developer, I want the auth template generator to produce complete, working authentication code, so that I can use it without manual completion.

#### Acceptance Criteria

1. THE Auth_Template_Generator SHALL generate complete `authorize` callbacks with real bcrypt password comparison rather than `// TODO: Replace with actual user lookup + bcrypt compare`
2. THE Auth_Template_Generator SHALL generate complete MFA verification logic rather than `// TODO: Check if user has MFA enabled`
3. WHEN MFA is enabled in the config, THE Auth_Template_Generator SHALL produce a complete TOTP verification flow

### Requirement 10: Collaboration Pod — Snapshot API Missing

**User Story:** As a collaborator, I want session snapshots to be persisted to the server, so that I can restore a previous collaboration state.

#### Acceptance Criteria

1. THE Collaboration_Pod SHALL call `POST /api/collaboration/snapshot` to persist session snapshots
2. THE `/api/collaboration/snapshot` endpoint MUST exist and persist snapshot data to the database
3. WHEN a snapshot is created, THE Collaboration_Pod SHALL display the snapshot in the session history list with a real timestamp
4. THE snapshot history MUST survive page refresh (loaded from the API, not only local state)

### Requirement 11: Collaboration Pod — Conflict Resolution In-Memory Store

**User Story:** As a collaborator, I want merge conflicts to be persisted, so that unresolved conflicts are not lost on server restart.

#### Acceptance Criteria

1. THE Conflict_Resolution_API SHALL persist conflict records to a `Conflict` Prisma model rather than the in-memory `conflicts = new Map()` store
2. THE Conflict_Resolution_API SHALL add the `Conflict` model to `prisma/schema.prisma` with fields: `id`, `roomId`, `userId`, `content`, `resolution`, `createdAt`, `resolvedAt`
3. WHEN a conflict is resolved, THE Conflict_Resolution_API SHALL update the `resolvedAt` field in the database

### Requirement 12: Collaboration Pod — Invite Link Token Validation

**User Story:** As a collaborator, I want invite links to be validated on the server, so that only authorized users can join a session.

#### Acceptance Criteria

1. WHEN a user generates an invite link, THE Collaboration_Pod SHALL call an API to create a real join token stored in the database
2. THE join token MUST have an expiry time (default: 24 hours)
3. WHEN a user joins via an invite link, THE server SHALL validate the token before granting access
4. THE invite link SHALL NOT use `Math.random().toString(36)` as the token — it MUST use a cryptographically secure random value

### Requirement 13: Innovation Theater — "Go Live" Button Non-Functional

**User Story:** As a presenter, I want the "Go Live" button to actually start a live stream, so that my audience can watch in real time.

#### Acceptance Criteria

1. WHEN a presenter clicks "Go Live", THE Innovation_Theater SHALL call `POST /api/theater/stream` to register the live session
2. THE viewer count MUST be fetched from the real theater viewers API rather than only listening to a custom DOM event
3. WHEN a presenter stops streaming, THE Innovation_Theater SHALL call the API to end the session and notify viewers
4. THE "Go Live" state MUST be persisted so that viewers joining mid-session see the correct live status

### Requirement 14: Innovation Theater — Audience Chat Not Persisted

**User Story:** As a presenter, I want audience chat messages to be saved, so that I can review them after the session ends.

#### Acceptance Criteria

1. WHEN an audience member sends a chat message, THE Innovation_Theater SHALL call `POST /api/theater/chat` to persist the message
2. WHEN a presenter loads a past session, THE Innovation_Theater SHALL fetch chat history from `GET /api/theater/chat`
3. THE audience chat MUST NOT rely solely on custom DOM events (`theater:audience-comment`) for message delivery between components
4. WHEN the page is refreshed during a live session, THE audience chat history MUST be restored from the API

### Requirement 15: Innovation Theater — Q&A Not Connected to API

**User Story:** As a presenter, I want Q&A questions to be submitted through the API, so that questions persist and can be moderated.

#### Acceptance Criteria

1. WHEN an audience member submits a question, THE Innovation_Theater SHALL call `POST /api/theater/qa` to persist the question
2. THE Q&A list MUST be loaded from `GET /api/theater/qa` on component mount rather than starting empty
3. WHEN a presenter votes or marks a question answered, THE Innovation_Theater SHALL call the API to persist the change
4. THE Q&A list MUST survive page refresh

### Requirement 16: Innovation Theater — Fullscreen Button Non-Functional

**User Story:** As a presenter, I want the fullscreen button to actually enter fullscreen mode, so that I can present without browser chrome.

#### Acceptance Criteria

1. WHEN a presenter clicks the Fullscreen button, THE Innovation_Theater SHALL call `document.documentElement.requestFullscreen()` to enter real fullscreen mode
2. WHEN fullscreen is active, THE Fullscreen button SHALL display an "Exit Fullscreen" label
3. WHEN the user presses Escape, THE Innovation_Theater SHALL detect the fullscreen exit and update the button state

### Requirement 17: Deep Focus — Timer State Not Synced to API

**User Story:** As a focused developer, I want my timer state to be synced to the server, so that my session is not lost if I close the tab.

#### Acceptance Criteria

1. WHEN a timer is started, THE Deep_Focus component SHALL call `POST /api/deep-focus/timer` to register the active timer in Redis
2. WHEN the page is loaded, THE Deep_Focus component SHALL call `GET /api/deep-focus/timer` to restore any active timer state
3. THE timer MUST resume from the correct remaining time after page refresh
4. WHEN a session completes, THE Deep_Focus component SHALL call `POST /api/deep-focus/sessions` to persist the completed session to the database

**Correctness Properties:**
- FOR ALL timer sessions, the total focus time accumulated MUST equal the sum of all completed session durations
- Round-trip property: starting a timer, refreshing the page, and loading the timer state MUST restore the same remaining time (within 1 second tolerance)

### Requirement 18: Deep Focus — Analytics Computed from localStorage Only

**User Story:** As a focused developer, I want my focus analytics to be computed from server-side data, so that my stats are accurate across devices.

#### Acceptance Criteria

1. THE Deep_Focus component SHALL load session history from `GET /api/deep-focus/sessions` rather than only from `localStorage`
2. THE streak calculation MUST be computed from server-side session records, not only from localStorage
3. THE daily goal progress MUST be computed from server-side session records
4. WHEN a user logs in on a new device, THE Deep_Focus component SHALL show the correct historical stats from the database

### Requirement 19: Collectibles — Profile API In-Memory Store

**User Story:** As a user, I want my collectible profile to be persisted to the database, so that my achievements are not lost on server restart.

#### Acceptance Criteria

1. THE Collectibles_Profile_API SHALL persist user profiles to the `User` and `Collectible` Prisma models rather than the in-memory `userProfiles = new Map()` store
2. THE Collectibles_Profile_API SHALL require authentication and scope profiles to the authenticated user
3. WHEN a user unlocks an achievement, THE Collectibles_Profile_API SHALL create a real `Collectible` record in the database
4. THE profile endpoint SHALL return the real `totalMinted` count from the database

### Requirement 20: Collectibles — Stats API Returns 503

**User Story:** As a platform operator, I want the collectibles stats API to return real platform statistics, so that the stats tab shows meaningful data.

#### Acceptance Criteria

1. THE Collectibles_Stats_API SHALL return real aggregate statistics computed from the `Collectible` Prisma model rather than returning a 503 error
2. THE stats MUST include: total cards minted, total power distributed, tier breakdown, and top achievements
3. THE stats MUST be cached with a 5-minute TTL to avoid expensive queries on every request
4. THE Collectible_Showcase stats tab MUST display real data from the API rather than hardcoded progress bar values (75%, 40%, 90%)

### Requirement 21: Collectibles — Next Milestones Hardcoded Progress

**User Story:** As a user, I want the "Next Milestones" section to show my real progress, so that I know what I need to do to advance.

#### Acceptance Criteria

1. THE Collectible_Showcase stats tab SHALL compute milestone progress from real user stats fetched from the API rather than hardcoded values (75%, 40%, 90%)
2. THE milestone descriptions SHALL reflect the user's actual current counts (e.g., "Complete 3 more projects" based on real project count)
3. WHEN a user completes a milestone, THE milestone MUST be marked as complete and a new one shown

### Requirement 22: Knowledge Ocean — Graph Conversations In-Memory

**User Story:** As a knowledge worker, I want my knowledge graph conversations to be persisted, so that I can continue a conversation after page refresh.

#### Acceptance Criteria

1. THE Knowledge_Graph_API SHALL persist conversation history to the database rather than the in-memory `conversations = new Map()` store
2. WHEN a user loads the Knowledge Ocean, THE Knowledge_Graph_API SHALL restore the conversation history for the authenticated user
3. THE conversation history MUST survive server restarts

### Requirement 23: Spec Chamber — Color Assignment Uses Math.random

**User Story:** As a collaborator, I want my color in the spec editor to be consistent across sessions, so that other collaborators always see me in the same color.

#### Acceptance Criteria

1. THE Spec_Chamber SHALL assign user colors deterministically based on the authenticated user's ID rather than using `Math.random()`
2. THE same user MUST always receive the same color in the same spec session
3. WHEN two users have the same deterministic color, THE Spec_Chamber SHALL use the next available color in the palette

### Requirement 24: Spec Chamber — Specs Stored in Flat File

**User Story:** As a developer, I want specs to be stored in the database, so that they are queryable, searchable, and properly associated with users.

#### Acceptance Criteria

1. THE Specs_API SHALL persist specs to a `Spec` Prisma model rather than a flat JSON file at `.data/specs.json`
2. THE `Spec` model MUST include: `id`, `title`, `content`, `status`, `authorId`, `createdAt`, `lastModified`
3. THE Specs_API SHALL scope spec reads to the authenticated user's organization or workspace
4. THE Specs_API SHALL support full-text search on spec title and content

### Requirement 25: Design Studio — InfiniteCanvas Image Placeholder

**User Story:** As a designer, I want to add real images to the canvas, so that I can design with actual visual assets.

#### Acceptance Criteria

1. WHEN a user adds an image element to the canvas, THE Infinite_Canvas SHALL open a file picker or URL input rather than rendering a static "Image Placeholder" div
2. THE image element MUST display the actual image content after selection
3. THE image element MUST support drag-to-resize with the correct aspect ratio preserved

### Requirement 26: Design Studio — CollaborationPanel Comments Not Persisted

**User Story:** As a designer, I want design comments to be saved, so that feedback is not lost when the page is refreshed.

#### Acceptance Criteria

1. WHEN a user adds a comment in the Collaboration_Panel, THE Design_Studio SHALL call `POST /api/design/comments` to persist the comment
2. WHEN the Design_Studio loads, THE Collaboration_Panel SHALL fetch existing comments from `GET /api/design/comments`
3. THE comment thread MUST survive page refresh
4. THE comment MUST be associated with the authenticated user's name and avatar

### Requirement 27: Design Studio — VersionHistory Not Connected to API

**User Story:** As a designer, I want version history to be saved to the server, so that I can restore previous design states.

#### Acceptance Criteria

1. WHEN a user saves a version, THE Version_History component SHALL call `POST /api/design/versions` to persist the version
2. WHEN the Design_Studio loads, THE Version_History component SHALL fetch version history from `GET /api/design/versions`
3. WHEN a user restores a version, THE Design_Studio SHALL apply the saved canvas state from the API
4. THE version history MUST survive page refresh

### Requirement 28: Collaboration Pod — Notifications Badge Hardcoded

**User Story:** As a collaborator, I want the notification badge to show real unread notification counts, so that I know when I have new messages.

#### Acceptance Criteria

1. THE Collaboration_Pod SHALL initialize the notification count from `GET /api/notifications?unread=true` rather than hardcoding `useState(5)`
2. WHEN new notifications arrive via SSE, THE notification count MUST be incremented in real time
3. WHEN a user clicks the notification bell, THE notifications MUST be marked as read via the API

### Requirement 29: Command Desk — Deploy Button Non-Functional

**User Story:** As a developer, I want the deploy button in the Command Desk to trigger a real deployment, so that I can deploy from the chat interface.

#### Acceptance Criteria

1. WHEN a user clicks the Deploy button, THE Command_Desk SHALL call `POST /api/deploy` with the current project context
2. THE deployment status MUST stream back via SSE and be displayed in the chat
3. WHEN deployment succeeds, THE Command_Desk SHALL display the deployment URL
4. WHEN deployment fails, THE Command_Desk SHALL display the error log

### Requirement 30: Command Desk — Slash Command /room Navigation

**User Story:** As a developer, I want the `/room` slash command to actually navigate to the specified room, so that I can switch rooms from the chat.

#### Acceptance Criteria

1. WHEN a user types `/room code-chamber`, THE Command_Desk SHALL navigate to the Code Chamber room
2. THE `/room` command handler SHALL call `setActiveRoom()` from the workspace context rather than returning a raw string `@room-jump code-chamber`
3. THE `/handoff` command SHALL serialize the current conversation context and pass it to the target room

### Requirement 31: Marketplace — Cart Checkout Non-Functional

**User Story:** As a developer, I want to check out my cart and purchase templates, so that I can acquire paid templates.

#### Acceptance Criteria

1. WHEN a user clicks "Checkout" with items in the cart, THE Marketplace SHALL call `POST /api/marketplace/checkout` to process the purchase
2. THE checkout MUST deduct the correct AZR token amount from the user's wallet
3. WHEN checkout succeeds, THE Marketplace SHALL install all cart items and clear the cart
4. WHEN the user has insufficient AZR balance, THE Marketplace SHALL display an error and prevent checkout

### Requirement 32: Marketplace — Template Screenshots Placeholder

**User Story:** As a developer, I want to see real screenshots of templates before installing them, so that I can make informed decisions.

#### Acceptance Criteria

1. THE Template_Detail_Drawer SHALL display real screenshot images from the template's `screenshots` field
2. WHEN no screenshots are available, THE Template_Detail_Drawer SHALL display a placeholder with the template icon
3. THE screenshots MUST be stored as URLs in the `MarketplaceTemplate` database model

### Requirement 33: Maker Lab — Serial Monitor WebSocket Missing

**User Story:** As a hardware developer, I want the serial monitor to connect to a real serial WebSocket server, so that I can see live output from my device.

#### Acceptance Criteria

1. THE Firmware_Editor serial monitor SHALL connect to `NEXT_PUBLIC_SERIAL_WS_URL` for real serial port data
2. WHEN `NEXT_PUBLIC_SERIAL_WS_URL` is not configured, THE Firmware_Editor SHALL display a setup guide rather than silently failing
3. THE serial monitor MUST display real bytes received from the device, not simulated output
4. THE serial monitor MUST support sending commands to the device via the WebSocket connection

### Requirement 34: AI Studio — Model Comparison "Execution Mock"

**User Story:** As an AI developer, I want the model comparison to show real side-by-side outputs, so that I can make informed model selection decisions.

#### Acceptance Criteria

1. THE Model_Comparison component SHALL remove the "Execution Mock or Extra Meta" comment and replace it with real model execution results
2. WHEN two models are compared, THE Model_Comparison SHALL call the AI API with both models simultaneously and display real responses
3. THE comparison MUST show real latency, token count, and cost for each model

### Requirement 35: Knowledge Ocean — RAG Answer Not Streaming

**User Story:** As a knowledge worker, I want RAG answers to stream in real time, so that I see the answer as it is generated.

#### Acceptance Criteria

1. WHEN a user asks a question in the Knowledge Ocean, THE RAG_Answer SHALL stream the response via SSE rather than waiting for the full response
2. THE streaming MUST show tokens appearing progressively as the AI generates them
3. THE related questions MUST be generated from the actual answer content, not hardcoded

### Requirement 36: Collaboration Pod — Snapshot API Does Not Exist

**User Story:** As a collaborator, I want session snapshots to be saved to the server, so that I can restore collaboration state.

#### Acceptance Criteria

1. THE `POST /api/collaboration/snapshot` endpoint MUST be created
2. THE endpoint MUST persist the Y.js document state (base64-encoded update) to the database
3. THE endpoint MUST associate the snapshot with the authenticated user and room ID
4. THE `GET /api/collaboration/snapshots` endpoint MUST return the list of snapshots for a room

---

## Summary of Priorities

### Critical (Fake data that misleads users)
1. Testing panel `Math.random()` fallback — shows fake pass/fail results (Req 1)
2. Training dashboard `Math.random()` simulation — shows fake training metrics (Req 3)
3. Agent metrics hardcoded fallback data — shows fake agent names and token counts (Req 4)
4. Collectibles profile in-memory store — achievements lost on restart (Req 19)
5. Collectibles stats API returns 503 — stats tab completely broken (Req 20)
6. Collectibles next milestones hardcoded at 75%/40%/90% (Req 21)

### High (Non-functional features that appear functional)
7. Firmware flash simulation loop — does not actually flash firmware (Req 6)
8. Circuit simulator fake SPICE — uses hardcoded values not real nodal analysis (Req 7)
9. Innovation Theater "Go Live" button — does not register a real stream (Req 13)
10. Innovation Theater Q&A not connected to API — questions lost on refresh (Req 15)
11. Innovation Theater Fullscreen button does nothing (Req 16)
12. Collaboration snapshot API missing — snapshot button calls non-existent endpoint (Req 10, 36)
13. Collaboration invite link uses Math.random token — not cryptographically secure (Req 12)
14. Deep Focus timer not synced to API — timer lost on page refresh (Req 17)
15. Marketplace cart checkout non-functional (Req 31)
16. Command Desk /room slash command returns raw string instead of navigating (Req 30)

### Medium (Missing persistence or real data)
17. AI Studio metrics stored in flat file instead of DB (Req 5)
18. Deep Focus analytics from localStorage only (Req 18)
19. Knowledge Ocean graph conversations in-memory (Req 22)
20. Spec Chamber specs stored in flat file (Req 24)
21. Design Studio comments not persisted (Req 26)
22. Design Studio version history not connected to API (Req 27)
23. Collaboration conflict resolution in-memory store (Req 11)
24. Innovation Theater audience chat not persisted (Req 14)
25. Maker Lab API generator uses mock database pattern (Req 8)
26. Maker Lab auth template has TODO comments (Req 9)

### Low (Polish and UX improvements)
27. Spec Chamber color assignment uses Math.random (Req 23)
28. Design Studio image placeholder (Req 25)
29. Collaboration notifications badge hardcoded to 5 (Req 28)
30. Command Desk deploy button non-functional (Req 29)
31. Marketplace template screenshots placeholder (Req 32)
32. Maker Lab serial monitor WebSocket missing (Req 33)
33. AI Studio model comparison execution mock (Req 34)
34. Knowledge Ocean RAG answer not streaming (Req 35)

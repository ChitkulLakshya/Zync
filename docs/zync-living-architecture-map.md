# Zync Living Architecture Map (Z-LAM)
**Design & Implementation Document**

## 1. Executive Summary & Vision
Currently, architecture diagrams in collaboration platforms are static images or isolated whiteboards (like Excalidraw). They serve as reference material but quickly become outdated and disconnected from actual work.

The **Zync Living Architecture Map (Z-LAM)** completely reimagines this paradigm. By leveraging **React Flow** combined with Zync's **Liquid Glass UI**, we elevate the architecture diagram from a "pretty picture" to an **Interactive Command Center**. 

Nodes in Z-LAM are not just rectangles; they are semantic React components representing actual project entities (Microservices, Databases, Frontends). They hold real-time state, display assigned team members, link directly to GitHub repositories, and surface active tasks—bridging the gap between high-level planning and daily execution.

---

## 2. Core Technology Stack
- **Diagramming Engine:** `React Flow` (`@xyflow/react`)
  - Chosen for its robust node-based architecture, extensive interactivity (pan/zoom/drag), and native React integration, allowing nodes to contain complex interactive UI.
- **Auto-Layout Engine:** `Dagre` or `ELKjs`
  - Used to automatically structure and render AI-generated JSON architecture outputs into clean, readable layouts without manual positioning.
- **Styling:** Zync Liquid Glass Design System (Tailwind + CSS Variables)
  - Nodes will utilize `--glass-regular`, `--glass-bevel`, and `backdrop-blur` utilities to maintain a premium, floating aesthetic.

---

## 3. Core Components

### 3.1 The Canvas (The Workspace)
*   **Aesthetic:** A subtle, interactive grid or dot pattern matching Zync's dark/light modes.
*   **Functionality:** Infinite panning, zooming, and a mini-map for navigating massive enterprise architectures. 
*   **Controls:** Sidebar for dragging in new architecture components, layout auto-arrange buttons, and export functionality.

### 3.2 Semantic Nodes (The Building Blocks)
Unlike simple shapes, Z-LAM nodes possess semantic meaning and internal state.
*   **Service Nodes:** (e.g., "Next.js Frontend", "Node API")
    *   *UI:* Displays the tech stack icon, service name, and an indicator of live status (e.g., green dot for healthy CI/CD).
    *   *Interactivity:* Clicking opens an integrated drawer showing linked tasks, recent commits, and quick actions ("Open Code", "Create Issue").
*   **Database Nodes:** (e.g., "PostgreSQL", "Redis")
    *   *UI:* Styled uniquely (e.g., cylinder iconography) with connection health metrics.
*   **Collaboration Nodes:** (e.g., "Sticky Notes", "Comments")
    *   *UI:* Floating glass notes pinned to specific services or edges for contextual architectural discussions.

### 3.3 Animated Edges (The Data Flow)
*   **Aesthetic:** SVGs utilizing modern web animations. 
*   **Functionality:** Instead of static lines, edges will have glowing, moving particles (via SVG `stroke-dashoffset` animation) to visually represent data flow directions between services.

---

## 4. Key Workflows & User Journeys

### 4.1 AI-Assisted Project Initialization
1.  **User Prompt:** "Build an architecture for a scalable real-time chat application."
2.  **AI Processing:** Zync AI generates a structured JSON map defining the entities (Frontend, WebSocket Server, DB, Cache) and their relationships.
3.  **Instant Rendering:** Z-LAM consumes the JSON, passes it through the Dagre auto-layout engine, and instantly renders a beautifully structured, interactive React Flow diagram.

### 4.2 Interactive Team Collaboration
*   **Contextual Planning:** A backend engineer highlights an edge connecting the API to the DB and adds a comment node: *"We need to add a Redis cache layer here."*
*   **Task Generation:** A project manager right-clicks the "Frontend" node and selects *"Create Task"*. The new task is automatically tagged and linked to that specific architectural component.

### 4.3 Real-Time Execution Monitoring
*   **Live Avatars:** If an engineer is currently working on a branch linked to the "Auth Service", their avatar floats on that node in the diagram.
*   **Task Progress:** Nodes feature subtle circular progress rings indicating the completion percentage of tasks assigned to that service.

---

## 5. Phased Implementation Plan

### Phase 1: Foundation (Read-Only AI Viewer)
*   Integrate `@xyflow/react` into the project.
*   Build the base `LiquidGlassNode` component.
*   Implement the Dagre auto-layout algorithm.
*   Update the "View Architecture" CTA to parse a mock JSON structure and render the read-only diagram.

### Phase 2: Interactive Builder & Editor
*   Enable drag-and-drop node creation from a component sidebar.
*   Implement edge connection logic (linking nodes together manually).
*   Add local state persistence (saving canvas state to localStorage/DB).

### Phase 3: Zync Data Integration (The "Living" Aspect)
*   Connect nodes to actual Zync Tasks and GitHub API data.
*   Add live status indicators, progress bars, and team avatars to nodes.
*   Implement the side-drawer UI for viewing node-specific details when clicked.

---

## 6. Styling Reference (Liquid Glass Implementation)
All custom nodes in React Flow will wrap their content in Zync's standard glass container:
```tsx
// Example Node Wrapper
<div className="bg-surface-glass-regular backdrop-blur-regular rounded-3xl border-0 p-4 min-w-[200px]"
     style={{ boxShadow: 'var(--shadow-md), var(--glass-bevel)' }}>
  {/* Node Content, Icons, Avatars */}
</div>
```

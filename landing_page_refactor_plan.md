# Zync Landing Page Refactor Plan: Interactive Liquid Glass Edition

Based on the `agentic-liquid-glass-ui.md` specification and the latest trends in high-end modern SaaS landing pages (e.g., Linear, Vercel), this updated plan focuses on **show, don't tell**. We will replace static feature descriptions with highly detailed, interactive UI replicas orchestrated by simulated "dummy cursors." 

## 1. Global System Setup (Liquid Glass & Motion)

Before building the interactive components, we must establish the rigid "Liquid Glass" design tokens and motion orchestration systems.

### Core Primitives to Introduce:
- **Liquid Glass Tokens:** `color.surface.glass.thin/regular/thick`, `blur.regular (16px)`, `blur.thick (28px)`, mapping to soft, translucent background colors with backdrop filters.
- **Elevation System:** Soft, diffused drop shadows (Levels 0-5) that interact with the glass blur. No hard borders.
- **Motion Orchestrator:** We will use `framer-motion` to build a centralized timeline hook (`useWalkthroughTimeline`) that controls the simulated cursor and the UI state transitions in sync.

## 2. Advanced Component Strategy: The "Dummy Cursor" Walkthroughs

Instead of static screenshots or text, the Features Section will be a "Bento Box" style grid of `GlassCard` containers. Inside each container is a miniaturized, pixel-perfect replica of the Zync UI. 

We will introduce a new component: `<SimulatedCursor />`. This component uses Framer Motion to move along predefined coordinates with human-like easing (`cubic-bezier(0.25, 1, 0.5, 1)`), simulating clicks (scale down, ripple effect) to trigger state changes in the dummy UI.

### Feature 1: AI Project Setup Walkthrough
- **The UI Replica:** A miniaturized chat input and an empty workspace state.
- **The Choreography:**
  1. The dummy cursor glides in and clicks the chat input.
  2. A typewriter effect simulates the user typing: *"Create a full-stack Next.js project with Auth."*
  3. The cursor clicks "Generate".
  4. **Liquid Glass Morph:** The chat interface smoothly morphs (`layout` transition in Framer Motion) into a fully populated project tree and Kanban board, utilizing the `skeleton-shimmer` preset before revealing the data.

### Feature 2: GitHub Sync & Automation
- **The UI Replica:** A split view: a mock terminal/code editor on the left, and a Zync task board on the right.
- **The Choreography:**
  1. Cursor clicks a "git push" command in the mock terminal.
  2. A `toast-glide` notification slides in over the UI: *"Commit detected: fixed auth bug."*
  3. A task card on the board automatically glows (`focus.ring`) and moves from "In Progress" to "Done" without cursor intervention, demonstrating the sync.

### Feature 3: Smart Calendar Drag & Drop
- **The UI Replica:** A micro-calendar view.
- **The Choreography:**
  1. The dummy cursor moves to a task block.
  2. The cursor simulates a click-and-hold (cursor icon changes to grabbing).
  3. The task block is dragged across the screen from Wednesday to Friday.
  4. The cursor releases, the block snaps into place with a `spring.snappy` bounce, and the background subtly highlights.

### Feature 4: Multiplayer Team Workspaces
- **The UI Replica:** A Kanban board or document view.
- **The Choreography:**
  1. Instead of one cursor, we introduce three differently colored `<SimulatedCursor />` components, complete with tiny name tags ("Alex", "Sarah", "Mike").
  2. The cursors move independently, simulating real-time collaboration. One cursor highlights text, another moves a task card, and another types a comment.

## 3. The Hero Section Refactor

- **Current:** Static UI preview.
- **Interactive Vision:** The `DesktopPreview` component will be elevated inside a massive `GlassCard` (`radius.xl`, `blur.thick`, `elevation.4`). 
- On scroll, this preview will utilize **scroll-driven animations**. As the user scrolls down, the Desktop Preview scales down slightly, rotates on the X-axis (creating 3D depth), and the glass layers separate to show the "Liquid Glass" composition before blending into the features grid.

## 4. Execution Order (Progressive Assembly)

1. **Phase 1: Motion & Primitive Setup** 
   - Define the CSS variables in `index.css`. 
   - Create the `<GlassCard />` container and the `<SimulatedCursor />` component with its animation timeline logic.
2. **Phase 2: Build UI Replicas** 
   - Build the "dummy" versions of the Zync components (Mini-Calendar, Mini-Kanban, Mini-Chat) as pure, stateless presentational components.
3. **Phase 3: Choreography** 
   - Wrap the UI replicas in orchestrator components that dictate the cursor movement and state changes on a looping timer.
4. **Phase 4: Assembly & Liquid Glass Polish** 
   - Integrate these into the `FeaturesSection.tsx`. 
   - Apply the scroll-driven animations to the Hero Section.
5. **Phase 5: Validation** 
   - Run the 7 Validation Gates from the `agentic-liquid-glass-ui.md` spec. Ensure that the motion pauses if the user prefers reduced motion, and that the glass contrast meets WCAG AA standards.

# PROJECT_AUDIT.md

## The One-Liner
Zync is a real-time collaborative workspace that unifies task management, document editing, and persistent chat, featuring a specialized engine that drives project state directly from GitHub commit messages.

## The 'Technical Hook'
The **GitHub Webhook & Automation Engine** is the core technical differentiator. It implements a secure, bi-directional sync between the codebase and the project dashboard.

**Logic Flow:**
1.  **Security**: Intercepts GitHub `push` events and authenticates them via HMAC SHA-256 signature verification (`x-hub-signature-256`).
2.  **Parsing strategy**: Scans commit messages using a strict Regex pattern (`/\[ZYNC-COMPLETE #([a-zA-Z0-9_-]+)\]/i`) to extract command directives.
3.  **State Execution**: Orchestrates updates across the database to mark specific nested tasks as complete based on the parsed ID.
4.  **Feedback Loop**: Generates an installation token to post a formatted "Bot" comment back to the GitHub commit, closing the loop.
5.  **Real-time Propagation**: Broadcasts a `taskUpdated` event via Socket.io to instantly update all connected client dashboards without a refresh.

**File:** `backend/routes/githubAppWebhook.js`

## The True Stack (Evidence-Based)
*   **Frontend**: React 18, Vite, TypeScript
*   **State Management**: TanStack Query (v5), React Context
*   **Real-Time**: Socket.io-Client, Yjs (CRDT for text sync), Firestore (Chat)
*   **UI/UX**: Tailwind CSS, Radix UI, Framer Motion (implied by animations), BlockNote (Editor)
*   **Backend**: Node.js, Express
*   **Database**: MongoDB (Primary), accessed via both Mongoose and Prisma
*   **AI/ML**: Google Generative AI (Gemini), Groq SDK (Llama 3)
*   **Infrastructure**: Docker, Vercel (Frontend config), Render (Backend scripts)

## Architecture & Scale Indicators
*   **Database Strategy**: The system uses a dual-ORM approach on a single MongoDB store. `Mongoose` handles the heavy lifting for recursive attributes (Users, Projects), while `Prisma` manages the GitHub-linked entities (`Task`, `Repository`) for type-safe query matching.
*   **Authentication**: Firebase Auth provides secure identity management, coupled with a custom `useUserSync` hook that ensures backend records remain strictly consistent with the auth provider.
*   **Real-Time Sync**: A dedicated Socket.io namespace (`/notes`) handles high-frequency broadcast events for the collaborative editor, separate from the primary application signaling.

## Product Features
1.  **Commit-Driven Task Completion**: Developers can close tickets and update the project board automatically by referencing the Task ID in their git commit messages.
2.  **Multi-User Collaborative Editor**: A Google Docs-style rich text editor that supports simultaneous typing, presence awareness, and cursor tracking.
3.  **Unified Activity Dashboard**: Aggregates chat messages, task updates, and team activity into a single real-time stream.

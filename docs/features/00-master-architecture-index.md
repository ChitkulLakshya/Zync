# 00 — Zync Master Architecture Index

**Version:** 2026.3
**Status:** Production Verified
**Last Updated:** August 2026

---

## Overview

Zync is an enterprise-grade, local-first collaborative workspace platform that unifies project management, real-time collaboration, AI-driven architecture generation, and developer tooling into a single high-performance web application.

This document serves as the **master index** for all 62 feature architecture documents. Each linked file contains an exhaustive trace of the feature's frontend, backend, database, socket, and external service layers with exact file paths and line numbers.

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser / PWA)                           │
│  React 19 + Vite + TypeScript + Tailwind CSS v4 + Radix UI + Mantine    │
│  TanStack Query (REST cache) + Jotai (UI state) + Dexie (IndexedDB)     │
│  Yjs (CRDT) + BlockNote (rich text) + Framer Motion (animations)        │
└──────────────┬──────────────────────────┬───────────────────────────────┘
               │ REST / HTTP(S)           │ WebSocket (Socket.IO)
               ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────────────────────┐
│   EXPRESS 5 API GATEWAY   │  │        SOCKET.IO GATEWAY                  │
│  helmet + CORS + rate     │  │  /notes  /chat  /tasks  /presence        │
│  limit + load shedding    │  │  Yjs binary relay + presence tracking     │
│  Firebase JWT verify      │  │  Real-time event broadcasting             │
└──────────┬───────────────┘  └──────────────────┬───────────────────────┘
           │                                      │
           ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LOGIC (Node.js)                           │
│  23 Route files  │  14 Services  │  21 Utils  │  4 Socket Handlers      │
│  4 Middleware    │  13 Models    │  10 Email Templates                    │
└──────────┬───────────────┬───────────────┬──────────────┬────────────────┘
           │               │               │              │
           ▼               ▼               ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│  MongoDB     │ │  Redis       │ │  Firebase    │ │  External APIs       │
│  Atlas       │ │  Cache +     │ │  Auth +      │ │  GitHub, Google,     │
│  Prisma +    │ │  Pub/Sub     │ │  Firestore + │ │  Cloudinary, Groq,   │
│  Mongoose    │ │              │ │  FCM + Store │ │  Kilo Gateway, HIBP  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────┘
```

---

## Document Index

### Group 1: Core Infrastructure (Files 00–07)

| # | Document | Scope |
|---|---|---|
| 00 | **[00-master-architecture-index.md](./00-master-architecture-index.md)** | This file — master sitemap |
| 01 | [01-tech-stack-overview.md](./01-tech-stack-overview.md) | Frontend, backend, database, and third-party SDK breakdown |
| 02 | [02-security-auth-architecture.md](./02-security-auth-architecture.md) | Firebase JWT, helmet, CORS, rate limiting, encryption, HIBP |
| 03 | [03-performance-caching-strategy.md](./03-performance-caching-strategy.md) | Redis tiers, TanStack persister, connection pooling, load shedding |
| 04 | [04-service-inventory.md](./04-service-inventory.md) | Every cloud service, hosting provider, and external API |
| 05 | [05-database-schema-and-models.md](./05-database-schema-and-models.md) | Complete Prisma schema + Mongoose ODM models |
| 06 | [06-middleware-stack.md](./06-middleware-stack.md) | helmet CSP, CORS, rate limit, load shedding, auth, Zod validation |
| 07 | [07-environment-variables.md](./07-environment-variables.md) | Complete env var reference with types, defaults, and descriptions |

### Group 2: Authentication & User (Files 08–13)

| # | Document | Scope |
|---|---|---|
| 08 | [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) | Login, signup, OTP, phone verification, token refresh |
| 09 | [09-user-profile-management.md](./09-user-profile-management.md) | Profile CRUD, avatar upload, settings, departments |
| 10 | [10-account-deletion-flow.md](./10-account-deletion-flow.md) | Deletion with email confirmation code, cascade cleanup |
| 11 | [11-presence-system.md](./11-presence-system.md) | Online/offline/away states, lastSeen, Socket.IO presence |
| 12 | [12-haveibeenpwned-integration.md](./12-haveibeenpwned-integration.md) | K-anonymity SHA-256 prefix matching for breach checks |
| 13 | [13-linkedin-oauth-integration.md](./13-linkedin-oauth-integration.md) | LinkedIn OAuth flow, token storage, profile sync |

### Group 3: Project Management (Files 14–19)

| # | Document | Scope |
|---|---|---|
| 14 | [14-project-crud-lifecycle.md](./14-project-crud-lifecycle.md) | Create, read, update, delete projects; team assignment |
| 15 | [15-ai-project-generation.md](./15-ai-project-generation.md) | Groq SDK project scaffolding, JSON schema, Mongoose bulk insert |
| 16 | [16-project-steps-and-tasks.md](./16-project-steps-and-tasks.md) | Step/Task hierarchy, display IDs, assignment, status workflow |
| 17 | [17-ai-task-generator.md](./17-ai-task-generator.md) | Groq-powered task generation from architecture JSON |
| 18 | [18-project-architecture-agent.md](./18-project-architecture-agent.md) | Kilo Code Gateway chat → structured JSON architecture maps |
| 19 | [19-project-details-page.md](./19-project-details-page.md) | Frontend ProjectDetails page, tabs, step navigation |

### Group 4: Task Board & GitHub Sync (Files 20–25)

| # | Document | Scope |
|---|---|---|
| 20 | [20-kanban-task-board.md](./20-kanban-task-board.md) | Drag-and-drop Kanban, status columns, TaskBoardView |
| 21 | [21-task-socket-realtime.md](./21-task-socket-realtime.md) | Socket.IO /tasks namespace, live updates, task broadcasting |
| 22 | [22-github-oauth-integration.md](./22-github-oauth-integration.md) | GitHub App OAuth, installation flow, token encryption |
| 23 | [23-github-app-webhooks.md](./23-github-app-webhooks.md) | Webhook queue, HMAC validation, event processing worker |
| 24 | [24-github-collaborator-invites.md](./24-github-collaborator-invites.md) | Octokit invitations, OTP verification, ContributorTicket |
| 25 | [25-commit-analysis-service.md](./25-commit-analysis-service.md) | Groq commit analysis, task linkage, commit metadata |

### Group 5: Real-Time Chat (Files 26–30)

| # | Document | Scope |
|---|---|---|
| 26 | [26-instant-chat-system.md](./26-instant-chat-system.md) | Chat architecture, Socket.IO /chat, message model |
| 27 | [27-chat-socket-handler.md](./27-chat-socket-handler.md) | Connection management, event handlers, offline catchup |
| 28 | [28-chat-message-persistence.md](./28-chat-message-persistence.md) | MongoDB Message model, chatId derivation, seen/delivered |
| 29 | [29-chat-notifications.md](./29-chat-notifications.md) | FCM push, in-app toast, chat request notifications |
| 30 | [30-chat-request-flow.md](./30-chat-request-flow.md) | Send/accept/reject requests, connections, close friends |

### Group 6: Collaborative Notes (Files 31–35)

| # | Document | Scope |
|---|---|---|
| 31 | [31-realtime-notes-editor.md](./31-realtime-notes-editor.md) | Yjs CRDT, BlockNote, IndexedDB persistence, binary state |
| 32 | [32-note-socket-handler.md](./32-note-socket-handler.md) | Socket.IO /notes namespace, Yjs update relay, awareness |
| 33 | [33-notes-crud-and-folders.md](./33-notes-crud-and-folders.md) | Note CRUD, Folder hierarchy, project linking |
| 34 | [34-note-sharing-and-permissions.md](./34-note-sharing-and-permissions.md) | sharedWith array, permission checks, collaborative editing |
| 35 | [35-notes-frontend-service.md](./35-notes-frontend-service.md) | notesService.ts, useNotes hook, useNotePresence hook |

### Group 7: Google Workspace (Files 36–40)

| # | Document | Scope |
|---|---|---|
| 36 | [36-google-oauth-integration.md](./36-google-oauth-integration.md) | Google Integration JSON, refresh token, calendar scope |
| 37 | [37-google-calendar-integration.md](./37-google-calendar-integration.md) | Calendar list, events CRUD, timezone handling |
| 38 | [38-google-meet-integration.md](./38-google-meet-integration.md) | Meet link generation, Meeting model, participant management |
| 39 | [39-google-sheets-logger.md](./39-google-sheets-logger.md) | SheetLogger service, audit logging, Google Sheets API |
| 40 | [40-google-integration-frontend.md](./40-google-integration-frontend.md) | SettingsView Google section, connect/disconnect UI |

### Group 8: Team Management (Files 41–44)

| # | Document | Scope |
|---|---|---|
| 41 | [41-team-crud-and-invites.md](./41-team-crud-and-invites.md) | Team CRUD, invite codes, member management |
| 42 | [42-team-firebase-sync.md](./42-team-firebase-sync.md) | Firestore sync, real-time team updates, member presence |
| 43 | [43-team-onboarding-flow.md](./43-team-onboarding-flow.md) | CreateTeamDialog, JoinTeamDialog, TeamOnboarding |
| 44 | [44-team-settings-enhancements.md](./44-team-settings-enhancements.md) | Team settings, quick chat, type categorization |

### Group 9: Design & Inspiration (Files 45–47)

| # | Document | Scope |
|---|---|---|
| 45 | [45-design-inspiration-service.md](./45-design-inspiration-service.md) | Inspiration routes, Redis cache, DesignView frontend |
| 46 | [46-scraper-service.md](./46-scraper-service.md) | Puppeteer Extra, stealth plugin, request interception |
| 47 | [47-design-view-frontend.md](./47-design-view-frontend.md) | DesignView component, inspiration grid, filtering |

### Group 10: File Upload & Media (Files 48–50)

| # | Document | Scope |
|---|---|---|
| 48 | [48-cloudinary-upload-service.md](./48-cloudinary-upload-service.md) | Cloudinary uploads, stream-based, avatar transformations |
| 49 | [49-profile-photo-cropper.md](./49-profile-photo-cropper.md) | react-easy-crop, WebP conversion, upload pipeline |
| 50 | [50-image-optimizer.md](./50-image-optimizer.md) | Sharp-free optimization, dimension constraints, format |

### Group 11: Notifications (Files 51–54)

| # | Document | Scope |
|---|---|---|
| 51 | [51-fcm-backend-setup.md](./51-fcm-backend-setup.md) | Firebase Admin FCM, push notification service |
| 52 | [52-fcm-frontend-setup.md](./52-fcm-frontend-setup.md) | VAPID keys, service worker, token registration |
| 53 | [53-notification-permission-flow.md](./53-notification-permission-flow.md) | Permission prompt, PWA install wall, WakeUpService |
| 54 | [54-push-notification-service.md](./54-push-notification-service.md) | pushNotificationService.js, payload structure, delivery |

### Group 12: UI/UX System (Files 55–59)

| # | Document | Scope |
|---|---|---|
| 55 | [55-agentic-liquid-glass-ui.md](./55-agentic-liquid-glass-ui.md) | Design tokens, backdrop-filter, 9-state components |
| 56 | [56-loading-animation-strategy.md](./56-loading-animation-strategy.md) | Skeleton shimmers, typographic glass lifts, transitions |
| 57 | [57-pwa-install-wall.md](./57-pwa-install-wall.md) | Install prompt, beforeinstallprompt, PWA detection |
| 58 | [58-dashboard-layout-system.md](./58-dashboard-layout-system.md) | DashboardView, sidebar, responsive layout, mobile view |
| 59 | [59-activity-tracking-system.md](./59-activity-tracking-system.md) | Session model, activity tracker hook, duration calc |

### Group 13: Support & Misc (Files 60–62)

| # | Document | Scope |
|---|---|---|
| 60 | [60-support-ticket-system.md](./60-support-ticket-system.md) | Support routes, email templates, ticket lifecycle |
| 61 | [61-link-preview-service.md](./61-link-preview-service.md) | Link routes, metadata scraping, OG image extraction |
| 62 | [62-internal-metrics.md](./62-internal-metrics.md) | Internal API, admin secret, usage stats, health monitoring |

---

## Key Source Directories

| Directory | Purpose | Key Files |
|---|---|---|
| `backend/routes/` | Express route handlers (23 files) | `projectRoutes.js`, `chatRoutes.js`, `noteRoutes.js`, `github.js`, `meetRoutes.js` |
| `backend/services/` | Business logic services (14 files) | `firebaseAdmin.js`, `cloudinaryService.js`, `googleMeet.js`, `scraperService.js` |
| `backend/sockets/` | Socket.IO handlers (4 files) | `chatSocketHandler.js`, `noteSocketHandler.js`, `taskSocketHandler.js`, `presenceSocketHandler.js` |
| `backend/models/` | Mongoose ODM models (13 files) | `User.js`, `Project.js`, `Message.js`, `Note.js`, `Team.js` |
| `backend/middleware/` | Express middleware (4 files) | `authMiddleware.js`, `loadShedding.js`, `validation.js`, `verifyGithub.js` |
| `backend/utils/` | Utility functions (21 files) | `encryption.js`, `redisClient.js`, `githubAppAuth.js`, `cache.js` |
| `backend/prisma/` | Prisma schema + generated client | `schema.prisma` |
| `src/components/views/` | Main UI views (27+ files) | `DashboardView.tsx`, `ChatView.tsx`, `TaskBoardView.tsx`, `SettingsView.tsx` |
| `src/hooks/` | React hooks (21 files) | `useNotes.ts`, `usePresence.ts`, `useProjects.ts`, `use-task-updates.ts` |
| `src/lib/` | Frontend utilities (14 files) | `firebase.ts`, `SocketIOProvider.tsx`, `db.ts`, `query-client.ts` |
| `src/services/` | Frontend services (4 files) | `chatSocketService.ts`, `notesService.ts`, `taskSocketService.ts` |

---

## Collaborators

| Name | GitHub | Role |
|---|---|---|
| Chitkul Lakshya | `ChitkulLakshya` | Primary maintainer, architecture |
| Prem | `prem22k` | Admin, infrastructure |
| Thanmayee Reddy Kotha | `thanmayeereddykotha` | Admin, backend features |
| Eeshitha Gone | `eesha264` | Admin, frontend + integrations |

---

## Related Documentation

- [Original Architecture Docs](../architecture/) — Pre-refactor architecture documents
- [Bug Fix Logs](../bug-fixes/) — Resolved issues and their fixes
- [Guides](../guides/) — Setup and onboarding guides
- [Security](../security/) — Privacy policy and security overview
- [Plans](../plans/) — Execution plans and roadmap

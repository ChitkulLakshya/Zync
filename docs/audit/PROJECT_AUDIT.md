# 📋 Project Architecture & Technical Overview

## The One-Liner
Zync is an enterprise-grade real-time collaborative developer workspace that unifies Kanban task management, multiplayer rich-text editing, and AI architectural generation, featuring a background worker engine that syncs project state directly from GitHub push webhooks.

---

## ⚡ The Core Technical Differentiators

### 1. GitHub Automation & Architectural Worker
Zync does not just passively track Git commits. It implements an active asynchronous ingestion pipeline:
1. **Queueing**: `POST /api/github-app/webhook` accepts payloads and enqueues them into an in-memory job queue (`services/webhookQueue.js`).
2. **Worker Aggregation**: The `githubWebhookWorker.js` aggregates modified files and commit SHAs.
3. **AI Architecture Analysis**: If commit messages reference task identifiers (`/\b(?:TASK-\d+|ID-\d+|#\d+)\b/i`), the worker invokes the **Groq LLM SDK** to analyze the architectural impact of the commit batch.
4. **Real-Time Propagation**: Updates are instantly broadcast to connected clients via `io.emit('projectUpdate')`.

### 2. Dual-Layer Offline-First Editor
- **Rich Text Canvas**: Powered by BlockNote (`@blocknote/core`).
- **Multiplayer Engine**: Utilizes **Yjs** CRDTs over WebSockets (`socket.io-client`).
- **Offline Persistence**: Leverages `y-indexeddb` (Dexie) to store document states locally, ensuring instant sub-millisecond document loading even without network connectivity.

---

## 🏗️ The Verified Technology Stack

- **Frontend Framework**: React 18, Vite 8, TypeScript
- **State Management**: TanStack Query v5 (Persisted to `localStorage`), React Context
- **UI Design System**: Tailwind CSS v4, Radix UI Primitives, Framer Motion
- **Backend API**: Node.js, Express 5
- **Database Architecture**: Pure MongoDB cluster accessed via dual ORMs:
  - **Prisma**: Configured specifically for MongoDB (`@db.ObjectId`) for type-safe relational models.
  - **Mongoose**: Manages flexible, recursive document structures.
- **AI Engine**: Groq SDK (`groq-sdk`), Google Gemini API (`@google/genai`)
- **Infrastructure**: Helmet, Express Rate Limit, Load Shedding Event Loop monitor, Puppeteer/Playwright E2E testing framework.

---

## 🔒 Security Posture
- **Authentication**: Firebase Authentication ID Tokens verified on every request via Firebase Admin SDK.
- **DDoS Mitigation**: Global IP throttling (100 reqs/15m) combined with dynamic server Event Loop load shedding (`loadSheddingMiddleware`).
- **Webhook Authenticity**: Cryptographic HMAC SHA-256 validation preserving raw Express body buffers.

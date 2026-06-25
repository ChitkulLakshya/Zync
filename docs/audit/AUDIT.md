# 🛡️ System Architecture & Security Audit

**Date:** June 24, 2026
**Scope:** Full Stack Codebase Analysis
**Status:** Verified 100% Accurate against Production Codebase

---

## 1. Database Architecture: **Polyglot MongoDB (Risk: Low)**

Zync intentionally utilizes two Node.js ORMs connected to the exact same underlying MongoDB database instance. This is a performant Polyglot data modeling strategy:
- **Primary ODM (Mongoose)**: Manages unstructured document operations, flexible schema updates, and real-time state mutations (Chat logs, Yjs documents, User states).
- **Relational ORM (Prisma)**: Mapped specifically using `@db.ObjectId` to provide strict TypeScript safety and query matching across relational constructs (Projects, Steps, Tasks, Teams).
- **Synchronization**: The schemas are aligned 1-to-1, avoiding desync risks while leveraging the specific strengths of both tools.

---

## 2. API & Controller Organization

### Architectural Patterns
- **Modular Routes & Workers**: Rather than "fat routes", complex business logic is decoupled. For example, GitHub Webhooks pass through an asynchronous job queue (`services/webhookQueue.js`) into background workers (`services/githubWebhookWorker.js`).
- **External API Enhancements**: The codebase actively integrates zero-auth public APIs to enrich developer workflows:
  - **GeoJS** (`services/geoService.js`): Automatically resolves client IPs to determine timezone and country metadata.
  - **Nager.Date** (`routes/calendarRoutes.js`): Fetches distributed team public holidays dynamically to prevent scheduling conflicts.

---

## 3. Enterprise Security Posture 🔒

| Check | Status | Technical Implementation |
| :--- | :--- | :--- |
| **HTTP Headers** | ✅ Pass | `helmet` enforces strict Content Security Policies (CSP) and Referrer restrictions. |
| **Auth** | ✅ Pass | Delegated to **Firebase Authentication**; API routes validated via Firebase Admin SDK (`authMiddleware.js`). |
| **DDoS Defense** | ✅ Pass | Global `express-rate-limit` (100 req / 15 mins) combined with dynamic **Event Loop Load Shedding** (`loadShedding.js`). |
| **Webhooks** | ✅ Pass | Strict HMAC SHA-256 cryptographic signature verification preserving raw buffers specifically on webhook paths. |
| **CORS** | ✅ Pass | Explicit origin matching array with `credentials: true` enabled. |

---

## 4. Frontend Performance

- **Build System**: Vite 8.x + React 18 + TypeScript compiled via SWC (`@vitejs/plugin-react-swc`).
- **Offline First**: PWA service workers cache core application shells, while `y-indexeddb` persists collaborative text canvas binary blobs locally.
- **State Optimization**: Redux Toolkit has been purged in favor of TanStack Query (with `localStorage` persistence) and lightweight React Contexts.

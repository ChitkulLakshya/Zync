# ⚡ Performance and Caching Strategy

Zync is built for real-time collaboration, meaning low latency and high availability are critical. This document details the exact caching and performance strategies implemented across the frontend and backend.

---

## 1. Backend Caching (Redis)

The Node.js backend utilizes **Redis** as a centralized, high-performance in-memory cache to prevent database hammering and avoid rate limits from third-party APIs.

### The `cache.setJson` Strategy
The backend implements a custom wrapper around the Redis client that automatically stringifies/parses JSON and enforces strictly calculated Time-To-Live (TTL) expiries.

#### Cached Endpoints & TTLs:
1. **GitHub API Integrations**: GitHub has strict rate limits. Zync heavily caches these responses to avoid 429s.
   - `gh:events:*`: Cached for **60 seconds** (Fast-moving commit streams).
   - `gh:repos:*`: Cached for **5 minutes** (Repository lists).
   - `gh:stats:*`: Cached for **10 minutes** (Contributor statistics).
   - `gh:readme:*`: Cached for **30 minutes** (Static README data).
2. **Database Queries**:
   - Complex `Project` aggregations are cached for **60 seconds**.
   - Resolved `User` profiles are cached for **5 minutes**.
3. **Template Rendering**: Compiled HTML email templates (`nodemailer`) are cached indefinitely in memory until server restart.

---

## 2. Frontend Caching & Persistence

The React application employs an aggressive "Local-First" caching strategy so that UI elements render instantly upon load before hitting the network.

### TanStack Query Persister
Zync uses the `@tanstack/react-query-persist-client` and `@tanstack/query-sync-storage-persister` libraries.
- All REST API responses (like user profiles, dashboards, and static lists) are intercepted by React Query and persisted immediately into **localStorage**.
- On browser reload, the UI hydrates *instantly* from `localStorage` while a background fetch seamlessly revalidates the cache against the server.

### IndexedDB & CRDT Persistence
For the collaborative canvas and rich-text documents:
- **Yjs** relies on the `y-indexeddb` provider (leveraging `dexie`).
- Entire document binary states are saved locally into IndexedDB. This allows a user to open Zync offline, edit a document with zero latency, and the CRDT engine will sync the changes via WebSockets the moment an internet connection is restored.

---

## 3. Server Protection & Load Shedding

Caching protects the database, but Zync also implements logic to protect the Node.js Event Loop from becoming blocked by heavy synchronous tasks (like AI parsing or large JSON serialization).

### Dynamic Load Shedding
The `backend/middleware/loadShedding.js` monitors the CPU utilization and Event Loop lag in real-time. If the Node.js process detects that it is becoming overwhelmed (e.g., lag exceeds 100ms), the middleware will instantly shed load by rejecting incoming requests (returning `503 Service Unavailable`) on non-critical endpoints until the server stabilizes. 

### Connection Throttling
A strict `express-rate-limit` is applied to limit requests to **100 per 15 minutes** in production, ensuring that malicious scrapers cannot bypass the Redis cache and attack the underlying databases.

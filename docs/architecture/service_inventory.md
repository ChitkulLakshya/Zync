# ☁️ Zync Infrastructure & Service Inventory

Comprehensive reference of every cloud service, hosting provider, third-party API, and managed dependency in Zync.

---

## 🏛 Core Infrastructure & Hosting

| Service | Category | Tier / Plan | Usage in Zync | Target Route / Environment |
|---|---|---|---|---|
| **Vercel** | Web Hosting (CDN / Edge) | Free / Hobby | Serves the Vite React single-page app (SPA). Handles client routing, asset caching, security headers (`vercel.json`), and custom domain `zync-meet.vercel.app`. | Frontend SPA (`/`) |
| **Render** | Application Hosting | Free Tier (512 MB RAM limit) | Hosts the Node.js / Express API server and WebSocket instance (`zync-backend`). Uses active load-shedding to stay under RAM limits. | Backend API (`/api/*`, Socket.IO) |
| **MongoDB Atlas** | Managed Database | Shared / Free Cluster | Primary application storage. Mongoose & Prisma access this same Mongo instance for relational and document queries. | `MONGO_URI` |
| **Firebase (Google Cloud)** | Auth / Realtime Sync / Storage | Spark (Free) | User authentication (JWT tokens), Firestore document backup/sync, Firebase Storage (assets), Push Notifications (FCM / VAPID). | Client SDK & Firebase Admin SDK |
| **Cloudinary** | Media CDN | Free Tier | Stores and transforms user avatars and image attachments. Uses `cloudinaryService.js` for uploads/deletions via upload streams. | `CLOUDINARY_*` |
| **Redis** | In-Memory Cache & Pub/Sub | Self-hosted / Managed | Stores rate-limiting counters, architecture quota tokens, socket pub/sub state, and session cache. Fails open gracefully if offline. | `REDIS_URL` |

---

## 🤖 AI Models & Gateways

| Provider / Model | Gateway / SDK | Role / Subsystem | Configuration |
|---|---|---|---|
| **Kilo Code Gateway** (`kilo-auto/free`) | Direct HTTP REST API | Primary Architecture Agent engine — processes natural language chat and outputs structured JSON architecture maps. | `KILO_CODE_GATEWAY_URL`, `KILO_CODE_GATEWAY_API_KEY` |
| **Groq** (`groq-sdk`) | Groq API Client | High-speed, low-latency AI completions for fallback project scaffolding and task breakdown generation. | `GROQ_API_KEY` |
| **Google Gemini** | `@google/generative-ai` | Secondary AI provider for general assistant queries and project roadmap generation. | `GEMINI_API_KEY_SECONDARY` |

---

## 🔌 Third-Party API Integrations

| Provider | Purpose | Implementation Details |
|---|---|---|
| **GitHub API** | Kanban Board Sync & GitHub App OAuth | `octokit` SDK syncs Zync tasks with GitHub Issues/PRs bi-directionally. Private key / tokens encrypted via AES-256 (`MASTER_ENCRYPTION_KEY`). |
| **Google APIs** | Workspace & Calendar Integration | `googleapis` handles Google OAuth tokens, calendar scheduling, and Google Sheets audit logging (`sheetLogger.js`). |
| **HaveIBeenPwned (HIBP)** | Password Security | K-Anonymity SHA-256 prefix matching to check user passwords against breach databases without transmitting cleartext passwords. |
| **Nodemailer / SMTP** | Transactional Email | Sends account verification, workspace invites, and weekly health reports via standard SMTP credentials. |

---

## 🛡 Network & Security Summary

- **Frontend Security Headers**: `vercel.json` enforces CSP (`Content-Security-Policy`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy`.
- **Encryption at Rest**: Stored tokens and private keys use `crypto-js` AES-256 with production-enforced master keys.
- **Fail-Open Architecture**: Heavy dependencies (Redis, Kilo Gateway) fail open cleanly to ensure the core app stays usable during outage or free-tier resource exhaustion.

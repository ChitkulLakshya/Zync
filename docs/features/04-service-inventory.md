# 04 — Service Inventory

**Refactored from:** `docs/architecture/service_inventory.md`

---

## Feature Summary

Complete inventory of every cloud service, hosting provider, third-party API, and managed dependency in Zync. This is the definitive reference for infrastructure costs, free-tier limits, and external dependencies.

---

## Core Infrastructure & Hosting

| Service | Category | Tier | Usage | Env Var / Config |
|---|---|---|---|---|
| **Vercel** | Web Hosting (CDN/Edge) | Free/Hobby | Serves Vite React SPA, handles routing, security headers, custom domain `zync-meet.vercel.app` | `vercel.json` |
| **Render** | App Hosting | Free (512MB RAM) | Node.js/Express API server + Socket.IO instance | `render.yaml` |
| **MongoDB Atlas** | Managed Database | Shared/Free | Primary DB — Mongoose + Prisma access same instance | `MONGO_URI` |
| **Firebase** | Auth/Realtime/Storage | Spark (Free) | JWT auth, Firestore backup, FCM push notifications, Firebase Storage | `VITE_FIREBASE_*` / `FIREBASE_*` |
| **Cloudinary** | Media CDN | Free Tier | Avatar uploads, image transformations via upload streams | `CLOUDINARY_*` |
| **Redis** | Cache & Pub/Sub | Self-hosted | Rate-limit counters, architecture quota, socket pub/sub, session cache | `REDIS_URL` |

---

## AI Models & Gateways

| Provider | Gateway/SDK | Role | Config |
|---|---|---|---|
| **Kilo Code Gateway** | Direct HTTP REST | Architecture Agent — natural language chat → structured JSON architecture maps | `KILO_CODE_GATEWAY_URL`, `KILO_CODE_GATEWAY_API_KEY` |
| **Groq** | `groq-sdk` | Low-latency AI for project scaffolding (`taskGenerator.js`) and commit analysis (`commitAnalysisService.js`) | `GROQ_API_KEY` |

---

## Third-Party API Integrations

| Provider | Purpose | Implementation | Env Vars |
|---|---|---|---|
| **GitHub API** | Kanban sync, OAuth, collaborator invites, webhooks | `octokit` SDK, bidirectional task↔issue sync, AES-256 encrypted tokens | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` |
| **Google APIs** | OAuth, Calendar, Meet, Sheets logging | `googleapis` SDK, refresh token flow, calendar event CRUD, Sheets audit log | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| **LinkedIn** | OAuth profile import | `linkedinRoutes.js`, access token exchange, profile fetch | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` |
| **HaveIBeenPwned** | Password breach check | K-anonymity SHA-256 prefix matching, no cleartext transmission | None (public API) |
| **Nodemailer/SMTP** | Transactional email | Account verification, workspace invites, weekly reports | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |

---

## Network & Security Summary

- **Frontend Security:** `vercel.json` enforces CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`
- **Backend Security:** `helmet` CSP, rate limiting, load shedding, Firebase JWT verification, HMAC webhook validation
- **Encryption at Rest:** `crypto-js` AES-256 with `MASTER_ENCRYPTION_KEY` for stored tokens
- **Fail-Open Architecture:** Redis, Kilo Gateway, and other heavy deps fail open cleanly

---

## Free Tier Limits & Risks

| Service | Limit | Risk | Mitigation |
|---|---|---|---|
| Render | 512MB RAM, 750h/month | OOM crash | Load shedding, lazy imports, health check |
| MongoDB Atlas | 512MB storage | Data cap | Mongoose lean queries, index optimization |
| Vercel | 100GB bandwidth, 100h build | Build timeout | Vite build optimization |
| Firebase Spark | 10k auth/day, 1GB Firestore | Auth rate limit | JWT caching on client |
| Cloudinary | 25 credits/month | Upload cap | Image compression before upload |
| Redis (self-hosted) | RAM dependent | Connection failure | Fail-open pattern |

---

## Cross-References

- [01-tech-stack-overview.md](./01-tech-stack-overview.md) — Full package breakdown
- [07-environment-variables.md](./07-environment-variables.md) — Complete env var reference
- [03-performance-caching-strategy.md](./03-performance-caching-strategy.md) — Redis caching detail

# 06 — Middleware Stack

**NEW document** — Complete Express middleware chain with line-by-line trace

---

## Feature Summary

The Express 5 middleware stack processes every incoming request through 7 layers before it reaches route handlers. This document traces the exact order, configuration, and behavior of each middleware.

---

## Architecture Diagram

```
Incoming HTTP Request
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  1. favicon.ico bypass     (index.js:104)                  │
│     GET /favicon.ico → 204 No Content                      │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│  2. helmet()               (index.js:176-234)              │
│     CSP, X-Frame-Options, HSTS, referrer-policy            │
│     12+ security headers                                   │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│  3. cors(corsOptions)      (index.js:236)                  │
│     Origin allowlist check                                 │
│     Credentials: true                                      │
│     Methods: GET, POST, PUT, DELETE, OPTIONS               │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│  4. rateLimit on /api/     (index.js:239-252)              │
│     Prod: 100 req / 15 min                                 │
│     Dev:  600 req / 1 min                                  │
│     Returns 429 on exceed                                  │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│  5. loadShedding on /api/  (index.js:253)                  │
│     Checks heapUsed > 400MB                                │
│     Only sheds heavy paths                                 │
│     Returns 503 with Retry-After                           │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│  6. Body parsers           (index.js:256-265)              │
│     /api/webhooks + /api/github-app: rawBody preserved     │
│     All other routes: express.json()                       │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│  7. Route-level middleware (per route file)                │
│     verifyToken — Firebase JWT check                       │
│     validate(schema) — Zod request validation              │
│     verifyGithub — HMAC SHA-256 webhook check              │
│     internalAuth — x-internal-secret check                 │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
                   Route Handler
```

---

## Layer 1: Favicon Bypass
**File:** `backend/index.js:104`
```js
app.get('/favicon.ico', (req, res) => res.status(204).end());
```
- Short-circuits before any middleware
- Returns 204 No Content
- Prevents favicon requests from hitting rate limiter

---

## Layer 2: Helmet Security Headers
**File:** `backend/index.js:176-234`

### CSP Directives
| Directive | Value | Purpose |
|---|---|---|
| `default-src` | `['self']` | Default allowlist |
| `script-src` | `['self', 'unsafe-inline', 'unsafe-eval', 'blob:', 'https://apis.google.com', 'https://www.googleapis.com', 'https://www.gstatic.com', 'https://www.google.com']` | Script sources |
| `connect-src` | `['self', 'https://github.com', 'https://api.github.com', 'http://localhost:*', 'ws://localhost:*', 'wss://*.glitch.me', 'https://*.googleapis.com', 'https://www.google.com', 'https://www.gstatic.com', 'https://*.firebaseio.com', 'https://*.firebase.google.com']` | XHR/fetch/WebSocket targets |
| `img-src` | `['self', 'data:', 'https://avatars.githubusercontent.com', 'https://*.githubusercontent.com', 'https://*.googleusercontent.com', 'https://*.google.com', 'blob:', 'https://ui-avatars.com', 'https://res.cloudinary.com']` | Image sources |
| `style-src` | `['self', 'unsafe-inline', 'https://fonts.googleapis.com']` | CSS sources |
| `worker-src` | `['self', 'blob:']` | Service workers |
| `frame-src` | `['self', 'https://github.com', 'https://*.firebaseapp.com', 'https://*.google.com']` | Iframe sources |
| `font-src` | `['self', 'data:', 'https://fonts.gstatic.com']` | Font sources |

### Other Helmet Options
- `crossOriginEmbedderPolicy: false` — allows cross-origin resources
- `referrerPolicy: { policy: 'strict-origin-when-cross-origin' }` — limits referrer leakage

---

## Layer 3: CORS
**File:** `backend/index.js:106-135`

### Allowed Origins
```
http://localhost:5173
http://localhost:8080
http://localhost:8081
http://localhost:8082
http://localhost:8083
http://127.0.0.1:8081
http://localhost:3000
+ ALLOWED_ORIGINS env var (comma-separated)
+ FRONTEND_URL env var
```

### Behavior
- No origin header (curl, server-to-server): **allowed**
- Origin in allowlist: **allowed**
- Origin not in allowlist: **rejected** with Error

### Options
```js
{
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200,
}
```

---

## Layer 4: Rate Limiting
**File:** `backend/index.js:238-252`

### Configuration
| Setting | Production | Development |
|---|---|---|
| `windowMs` | 15 minutes (900,000ms) | 1 minute (60,000ms) |
| `max` | 100 requests | 600 requests |
| `standardHeaders` | true | true |
| `legacyHeaders` | false | false |

### Applied to: `/api/*` only
### Response on exceed: `429 { message: "Too many requests...", status: 429 }`

---

## Layer 5: Load Shedding
**File:** `backend/middleware/loadShedding.js:75-135`

### Configuration
| Env Var | Default | Range | Purpose |
|---|---|---|---|
| `LOAD_SHED_HEAP_LIMIT_MB` | 400 | 128–4096 | Heap threshold |
| `LOAD_SHED_RETRY_AFTER_SECONDS` | 15 | 1–300 | Retry-After header |

### Path Classification
| Category | Paths | Behavior |
|---|---|---|
| **Allowlist** (never shed) | `/api/auth`, `/api/sessions`, `/api/chat` | Always pass through |
| **Heavy** (shed if over limit) | `/api/github-app/webhook`, `/api/webhooks/github`, `/api/generate-project`, `/api/design`, `/api/inspiration` | 503 if heap > threshold |
| **Normal** (never shed) | Everything else | Always pass through |
| **Custom** | `LOAD_SHED_HEAVY_PATHS` env var | Override heavy paths |

### 503 Response
```json
{
  "message": "Service under memory pressure, please retry shortly.",
  "reason": "load_shedding",
  "heapUsedMb": 412.35,
  "heapLimitMb": 400
}
```
With header: `Retry-After: 15`

---

## Layer 6: Body Parsers
**File:** `backend/index.js:256-265`

### Webhook Routes (rawBody preserved)
```js
const webhookJsonParser = express.json({
  verify: (req, res, buf) => { req.rawBody = buf; },
});
app.use('/api/webhooks', webhookJsonParser);
app.use('/api/github-app', webhookJsonParser);
```
- `req.rawBody` needed for HMAC SHA-256 signature verification
- Applied BEFORE `express.json()` to intercept webhook routes

### All Other Routes
```js
app.use(express.json());
```
- Standard JSON body parser for all other routes

---

## Layer 7: Route-Level Middleware

### verifyToken (Firebase JWT)
**File:** `backend/middleware/authMiddleware.js:96-119`
- Applied per-route: `router.get('/profile', verifyToken, handler)`
- Extracts `Bearer <token>` from Authorization header
- Calls `getAuth().verifyIdToken(token)` via Firebase Admin
- Sets `req.user = { uid, email }`
- 401 if no token, 403 if invalid

### validate (Zod Schema)
**File:** `backend/middleware/validation.js:83-103`
- Applied per-route: `router.post('/create', validate(schema), handler)`
- Validates `req.body`, `req.query`, `req.params`
- 400 with error array if validation fails

### verifyGithub (HMAC Webhook)
**File:** `backend/middleware/verifyGithub.js`
- Applied on webhook routes
- Validates `x-hub-signature-256` header
- HMAC SHA-256 with `GITHUB_WEBHOOK_SECRET`
- 403 if signature mismatch

### internalAuth (Admin Secret)
**File:** `backend/index.js:294-304`
- Applied on `/internal/*` routes
- Checks `x-internal-secret` header against `INTERNAL_API_SECRET`
- 503 if secret not configured, 403 if mismatch

---

## Route Registration Order
**File:** `backend/index.js:271-304`

| Order | Mount Path | Route File | Auth |
|---|---|---|---|
| 1 | `/api/projects` | `projectRoutes.js` | verifyToken (per-route) |
| 2 | `/api/generate-project` | `generateProjectRoutes.js` | verifyToken (per-route) |
| 3 | `/api/github` | `github.js` | verifyToken (per-route) |
| 4 | `/api/link` | `linkRoutes.js` | verifyToken (per-route) |
| 5 | `/api/users` | `userRoutes.js` | verifyToken (per-route) |
| 6 | `/api/sessions` | `sessionRoutes.js` | verifyToken (per-route) |
| 7 | `/api/design` | `designRoutes.js` | verifyToken (per-route) |
| 8 | `/api/inspiration` | `inspirationRoutes.js` | verifyToken (per-route) |
| 9 | `/api/notes` | `noteRoutes.js` | verifyToken (per-route) |
| 10 | `/api/chat` | `chatRoutes.js` | verifyToken (per-route) |
| 11 | `/api/architecture-agent` | `architectureAgentRoutes.js` | verifyToken (per-route) |
| 12 | `/api/tasks` | `taskRoutes.js` | verifyToken (per-route) |
| 13 | `/api/upload` | `uploadRoutes.js` | verifyToken (per-route) |
| 14 | `/api/webhooks` | `webhookRoutes.js` | verifyGithub |
| 15 | `/api/github-app` | `githubAppWebhook.js` | verifyGithub |
| 16 | `/api/meet` | `meetRoutes.js` | verifyToken (per-route) |
| 17 | `/api/linkedin` | `linkedinRoutes.js` | verifyToken (per-route) |
| 18 | `/api/teams` | `teamRoutes.js` | verifyToken (per-route) |
| 19 | `/api/google` | `googleRoutes.js` | verifyToken (per-route) |
| 20 | `/api/calendar` | `calendarRoutes.js` | verifyToken (per-route) |
| 21 | `/api/support` | `supportRoutes.js` | verifyToken (per-route) |
| 22 | `/api/collaborator` | `collaboratorRoutes.js` | verifyToken (per-route) |
| 23 | `/internal` | `internalMetrics.js` | internalAuth |

---

## Static File Serving
**File:** `backend/index.js:307-310`
- Serves `dist/` directory if it exists (production build)
- Only active when frontend is built and placed in `dist/`

---

## Health Check Endpoint
**File:** `backend/index.js:313-340`
- `GET /health` — no auth required
- Returns: status, timestamp, uptime, memory (heapUsed, heapTotal, rss)
- Status: `healthy` (<80% of 512MB), `degraded` (>80%), `critical` (>95%)

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ALLOWED_ORIGINS` | No | — | Comma-separated CORS origins |
| `FRONTEND_URL` | Yes | — | Frontend URL for CORS |
| `GITHUB_WEBHOOK_SECRET` | Yes | — | HMAC webhook secret |
| `INTERNAL_API_SECRET` | Yes | — | Internal API admin secret |
| `LOAD_SHED_HEAP_LIMIT_MB` | No | 400 | Heap threshold for shedding |
| `LOAD_SHED_RETRY_AFTER_SECONDS` | No | 15 | Retry-After header value |
| `LOAD_SHED_HEAVY_PATHS` | No | (built-in) | Custom heavy path list |
| `NODE_ENV` | No | — | "production" for prod rate limits |

---

## Cross-References

- [02-security-auth-architecture.md](./02-security-auth-architecture.md) — Security overview
- [23-github-app-webhooks.md](./23-github-app-webhooks.md) — Webhook HMAC verification
- [62-internal-metrics.md](./62-internal-metrics.md) — Internal API routes

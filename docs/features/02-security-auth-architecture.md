# 02 — Security & Auth Architecture

**Refactored from:** `docs/architecture/security_and_auth_architecture.md`

---

## Feature Summary

Zync's security architecture spans four layers: Firebase JWT authentication, HTTP security headers (helmet + CSP), API rate limiting + load shedding, and AES-256 encryption for stored tokens. This document traces every security component end-to-end.

---

## Architecture Diagram

```
┌─────────────────── CLIENT ───────────────────────────┐
│  Firebase Client SDK (firebase 12)                    │
│  ├─ signInWithEmailAndPassword()                      │
│  ├─ signInWithPopup(GoogleAuthProvider)                │
│  ├─ createUserWithEmailAndPassword()                   │
│  └─ getIdToken() → Bearer token in Authorization      │
└──────────────────────┬───────────────────────────────┘
                       │ Authorization: Bearer <JWT>
                       ▼
┌─────────────────── EXPRESS MIDDLEWARE ───────────────┐
│  1. helmet() — CSP, X-Frame-Options, HSTS             │
│  2. cors(corsOptions) — origin allowlist              │
│  3. rateLimit — 100 req/15min (prod) / 600/min (dev)  │
│  4. loadSheddingMiddleware — 503 if heap > 400MB      │
│  5. verifyToken — Firebase Admin verifyIdToken()      │
│  6. validate(schema) — Zod request validation         │
│  7. verifyGithub — HMAC SHA-256 webhook validation    │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌─────────────────── ENCRYPTION LAYER ─────────────────┐
│  crypto-js AES-256 (MASTER_ENCRYPTION_KEY)            │
│  ├─ GitHub tokens (githubIntegration JSON on User)    │
│  ├─ Google refresh tokens (googleIntegration JSON)    │
│  └─ GitHub App private key (githubAppAuth.js)         │
│                                                       │
│  bcryptjs — password hashing (if local auth used)     │
│  haveIBeenPwned — K-anonymity breach check            │
└──────────────────────────────────────────────────────┘
```

---

## Backend Trace

### 1. Helmet — HTTP Security Headers
**File:** `backend/index.js:176-234`
- Content-Security-Policy with strict directives
- `default-src: 'self'`
- `script-src: 'self' 'unsafe-inline' 'unsafe-eval' blob: https://apis.google.com`
- `connect-src: 'self' https://github.com https://api.github.com https://*.googleapis.com https://*.firebaseio.com`
- `img-src: 'self' data: https://avatars.githubusercontent.com https://res.cloudinary.com`
- `frame-src: 'self' https://github.com https://*.firebaseapp.com`
- `crossOriginEmbedderPolicy: false` (for cross-origin resources)
- `referrerPolicy: strict-origin-when-cross-origin`

### 2. CORS — Origin Allowlist
**File:** `backend/index.js:106-135`
- Allowed origins: `localhost:5173`, `localhost:8080-8083`, `localhost:3000`, `ALLOWED_ORIGINS` env var, `FRONTEND_URL` env var
- Methods: GET, POST, PUT, DELETE, OPTIONS
- `credentials: true` for cookies
- Non-origin requests (curl, server-to-server) are allowed

### 3. Rate Limiting
**File:** `backend/index.js:238-252`
- Applied to all `/api/` routes
- Production: 100 requests per 15 minutes per IP
- Development: 600 requests per minute
- Returns 429 with `{ message, status }` body
- `standardHeaders: true` (RateLimit-* headers)
- `legacyHeaders: false` (no X-RateLimit-* headers)

### 4. Load Shedding
**File:** `backend/middleware/loadShedding.js:75-135`
- Monitors `process.memoryUsage().heapUsed`
- Threshold: `LOAD_SHED_HEAP_LIMIT_MB` (default 400MB)
- Only sheds "heavy" paths: `/api/github-app/webhook`, `/api/webhooks/github`, `/api/generate-project`, `/api/design`, `/api/inspiration`
- Allowlist (never shed): `/api/auth`, `/api/sessions`, `/api/chat`
- Returns 503 with `Retry-After` header

### 5. Firebase JWT Verification
**File:** `backend/middleware/authMiddleware.js:76-119`
- Extracts `Bearer <token>` from `Authorization` header
- Calls `getAuth().verifyIdToken(token)` via Firebase Admin SDK
- Sets `req.user = { uid, email }` on success
- Returns 401 if no token, 403 if invalid token
- Firebase Admin initialized at module load via `firebaseAdmin.js`

### 6. Zod Validation
**File:** `backend/middleware/validation.js:76-105`
- Higher-order function: `validate(schema)` returns middleware
- Validates `req.body`, `req.query`, `req.params` against Zod schema
- Returns 400 with array of `{ path, message }` errors

### 7. GitHub Webhook HMAC Verification
**File:** `backend/middleware/verifyGithub.js`
- Validates `x-hub-signature-256` header
- HMAC SHA-256 with `GITHUB_WEBHOOK_SECRET`
- Used on `/api/webhooks/github` and `/api/github-app` routes

### 8. Internal API Auth
**File:** `backend/index.js:294-304`
- `x-internal-secret` header must match `INTERNAL_API_SECRET` env var
- Protects `/internal/*` routes (metrics, health stats)

---

## Encryption Layer

### AES-256 Token Encryption
**File:** `backend/utils/encryption.js`
- Uses `crypto-js` AES-256 with `MASTER_ENCRYPTION_KEY` env var
- `encrypt(text)` → returns `{ encrypted, iv, tag }`
- `decrypt(data)` → returns plaintext
- Used for:
  - GitHub OAuth tokens stored on `User.githubIntegration`
  - Google refresh tokens stored on `User.googleIntegration`
  - GitHub App private key in `githubAppAuth.js`

### Password Breach Check
**File:** `backend/services/haveIBeenPwnedService.js`
- K-anonymity model: sends only first 5 chars of SHA-1 hash
- Never transmits cleartext passwords
- Returns count of breach matches

---

## Frontend Trace

### Firebase Client SDK
**File:** `src/lib/firebase.ts`
- Initializes Firebase app with `VITE_FIREBASE_*` env vars
- Exports `auth` instance for `signInWithEmailAndPassword`, `signInWithPopup`, etc.
- Google OAuth provider configured with calendar + email scopes

### Auth Header Injection
**File:** `src/lib/auth-headers.ts`
- `getAuthHeaders()` — returns `{ Authorization: 'Bearer <token>', 'Content-Type': 'application/json' }`
- Gets token from `auth.currentUser.getIdToken()`
- Used by all API calls via TanStack Query

### Auth Sign-Out
**File:** `src/lib/auth-signout.ts`
- Calls `auth.signOut()`
- Clears TanStack Query cache
- Redirects to login page

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MASTER_ENCRYPTION_KEY` | Yes | AES-256 encryption key for token storage |
| `GITHUB_WEBHOOK_SECRET` | Yes | HMAC SHA-256 secret for webhook validation |
| `INTERNAL_API_SECRET` | Yes | Secret for `/internal/*` API routes |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `LOAD_SHED_HEAP_LIMIT_MB` | No | Heap threshold for load shedding (default 400) |
| `LOAD_SHED_RETRY_AFTER_SECONDS` | No | Retry-After header value (default 15) |
| `LOAD_SHED_HEAVY_PATHS` | No | Custom comma-separated heavy paths |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase client API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No Authorization header | 401 | `{ message: "Unauthorized: No token provided" }` |
| Invalid/expired JWT | 403 | `{ message: "Unauthorized: <error>" }` |
| Rate limit exceeded | 429 | `{ message: "Too many requests...", status: 429 }` |
| Load shedding active | 503 | `{ message: "Service under memory pressure", reason: "load_shedding" }` |
| Zod validation failed | 400 | `{ message: "Validation Error", errors: [...] }` |
| Webhook HMAC mismatch | 403 | `{ message: "Forbidden" }` |
| Internal API no secret | 503 | `{ message: "Internal API not configured" }` |
| Internal API wrong secret | 403 | `{ message: "Forbidden" }` |

---

## Cross-References

- [06-middleware-stack.md](./06-middleware-stack.md) — Full middleware chain detail
- [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) — Login/signup/OTP flow
- [12-haveibeenpwned-integration.md](./12-haveibeenpwned-integration.md) — Breach check deep dive
- [22-github-oauth-integration.md](./22-github-oauth-integration.md) — GitHub token encryption

# 51 — Middleware Stack Overview

**NEW document** — Express middleware chain, auth middleware, CORS, rate limiting, raw body parsing for webhooks

---

## Feature Summary

Zync's Express middleware stack handles authentication (Firebase JWT verification), CORS, request parsing, rate limiting, and webhook signature verification. Middleware is applied globally and per-route, with special raw body parsing for GitHub webhooks.

---

## Architecture Diagram

```
┌─────────────────── EXPRESS APP ─────────────────────────┐
│                                                         │
│  Global Middleware (applied to all routes):             │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 1. cors({ origin: FRONTEND_URL, credentials })   │    │
│  │ 2. express.json({ limit: '10mb })                 │    │
│  │ 3. express.urlencoded({ extended: true })         │    │
│  │ 4. cookieParser()                                 │    │
│  │ 5. helmet() (security headers)                    │    │
│  │ 6. rateLimit({ windowMs, max })                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Per-Route Middleware:                                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │ verifyToken (authMiddleware)                     │    │
│  │   → Verifies Firebase JWT from Authorization     │    │
│  │   → Sets req.user = { uid, email, ... }          │    │
│  │   → 401 if invalid/missing                        │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ verifyGithub                                      │    │
│  │   → HMAC SHA-256 webhook verification             │    │
│  │   → Uses WEBHOOK_SECRET                            │    │
│  │   → 401 if signature mismatch                      │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ requireDb (chatRoutes only)                       │    │
│  │   → Checks mongoose.connection.readyState === 1   │    │
│  │   → 503 if DB disconnected                         │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ multer (upload routes)                            │    │
│  │   → Parses multipart/form-data                     │    │
│  │   → Memory storage, 10MB limit                     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Webhook Raw Body Parsing:                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │ express.json({ verify: (req) => {                 │    │
│  │   return req.path.includes('/webhook');            │    │
│  │ }})                                               │    │
│  │ → Stores raw body on req.rawBody for HMAC          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Middleware Details

### authMiddleware (verifyToken)
**File:** `backend/middleware/authMiddleware.js`

```js
const admin = require('firebase-admin');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

- **Firebase Admin SDK:** Verifies JWT against Firebase
- **req.user:** Sets `uid` and `email` for downstream handlers
- **Bearer token:** Extracted from `Authorization` header

### verifyGithub
**File:** `backend/middleware/verifyGithub.js`
- HMAC SHA-256 verification using `WEBHOOK_SECRET`
- Timing-safe comparison to prevent timing attacks
- Detailed in [22-github-webhook-handler.md](./22-github-webhook-handler.md)

### CORS Configuration
```js
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```
- Single origin (not wildcard) for security
- Credentials enabled for cookies/auth

### Rate Limiting
```js
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: { error: 'Too many requests' },
});
app.use('/api/', limiter);
```
- Applied to all `/api/` routes
- 100 requests per 15 minutes per IP
- Webhook routes exempt (GitHub needs fast response)

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No Authorization header | 401 | `{ error: "Unauthorized" }` |
| Invalid JWT | 401 | `{ error: "Invalid token" }` |
| Expired JWT | 401 | `{ error: "Invalid token" }` |
| Rate limited | 429 | `{ error: "Too many requests" }` |
| DB disconnected (requireDb) | 503 | `{ error: "Database not available" }` |
| Webhook signature invalid | 401 | Unauthorized |

---

## Cross-References

- [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) — Firebase JWT verification
- [22-github-webhook-handler.md](./22-github-webhook-handler.md) — HMAC verification
- [02-security-auth-architecture.md](./02-security-auth-architecture.md) — Security overview
- [50-socket-io-initialization.md](./50-socket-io-initialization.md) — Socket.IO setup

# 60 — Security Architecture

**NEW document** — Authentication, authorization, encryption, HMAC, rate limiting, input validation, security headers

---

## Feature Summary

Zync's security architecture encompasses Firebase JWT authentication, AES-256 token encryption, HMAC webhook verification, rate limiting, regex injection prevention, Helmet security headers, and CORS configuration. This document provides a comprehensive security overview.

---

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Layer 1: Network Security                              │
│  ├─ HTTPS only (Render enforces)                        │
│  ├─ CORS: single origin (FRONTEND_URL)                  │
│  ├─ Helmet: security headers (XSS, clickjacking, etc.)  │
│  └─ Rate limiting: 100 req / 15 min per IP              │
│                                                         │
│  Layer 2: Authentication                                │
│  ├─ Firebase Auth (JWT verification)                    │
│  ├─ verifyToken middleware on protected routes           │
│  ├─ Token injected by frontend Axios interceptor         │
│  └─ 401 on missing/invalid/expired token                │
│                                                         │
│  Layer 3: Authorization                                 │
│  ├─ Resource ownership checks (project.ownerUid === uid)│
│  ├─ Team role checks (owner/admin/member)               │
│  ├─ Chat participation checks (chatId includes uid)     │
│  └─ 403 on unauthorized access                          │
│                                                         │
│  Layer 4: Data Protection                               │
│  ├─ AES-256 encryption for OAuth tokens at rest         │
│  ├─ Encrypted tokens excluded from API responses         │
│  ├─ Passwords checked against HIBP (breach database)    │
│  └─ Security PIN required for destructive operations    │
│                                                         │
│  Layer 5: Input Validation                              │
│  ├─ escapeRegExp() for regex injection prevention       │
│  ├─ Multer file type + size limits                      │
│  ├─ Mongoose schema validation                          │
│  └─ Request body validation in route handlers            │
│                                                         │
│  Layer 6: Webhook Security                              │
│  ├─ HMAC SHA-256 signature verification                 │
│  ├─ Timing-safe comparison (prevents timing attacks)    │
│  ├─ Delivery ID deduplication                           │
│  └─ 401 on signature mismatch                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
1. User signs in (Firebase popup/redirect)
   → Firebase issues JWT (1 hour TTL)

2. Frontend stores JWT (Firebase manages auto-refresh)

3. API call: Axios interceptor adds Authorization: Bearer <JWT>

4. Backend: verifyToken middleware
   → admin.auth().verifyIdToken(token)
   → Sets req.user = { uid, email }

5. Route handler: uses req.user.uid for queries
```

---

## Authorization Patterns

### Resource Ownership
```js
const project = await Project.findById(projectId);
if (project.ownerUid !== req.user.uid && !project.team.includes(req.user.uid)) {
  return res.status(403).json({ error: 'Unauthorized' });
}
```

### Team Role Check
```js
if (team.ownerUid !== req.user.uid && !team.admins.includes(req.user.uid)) {
  return res.status(403).json({ error: 'Admin access required' });
}
```

### Chat Participation
```js
const parts = chatId.split('_');
if (!parts.includes(req.user.uid)) {
  return res.status(403).json({ error: 'Unauthorized' });
}
```

### Message Ownership (mark-seen)
```js
await Message.updateMany(
  { _id: { $in: messageIds }, receiverId: userId },  // Security: can only mark own messages
  { $set: { seen: true } }
);
```

---

## Encryption Details

### AES-256 Token Encryption
- **Algorithm:** AES (CryptoJS)
- **Key:** `ENCRYPTION_KEY` environment variable
- **Encrypted data:** GitHub tokens, Google tokens
- **Never returned:** `.select('-githubIntegration.accessToken')`

### HMAC Webhook Verification
- **Algorithm:** HMAC SHA-256
- **Key:** `WEBHOOK_SECRET` environment variable
- **Comparison:** `crypto.timingSafeEqual()` (timing-attack safe)
- **Header:** `X-Hub-Signature-256`

### Security PIN
- **Hashed:** Not stored in plaintext
- **Required for:** Team deletion, ownership transfer
- **Set by:** Team owner during creation

---

## Security Headers (Helmet)

```js
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'", 'https://api.github.com', 'wss:'],
    },
  },
}));
```

| Header | Purpose |
|---|---|
| `X-Content-Type-Options: nosniff` | Prevent MIME sniffing |
| `X-Frame-Options: DENY` | Prevent clickjacking |
| `X-XSS-Protection: 1` | XSS protection |
| `Strict-Transport-Security` | Force HTTPS |
| `Content-Security-Policy` | Restrict resource loading |

---

## Rate Limiting

```js
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' },
}));
```
- 100 requests per 15 minutes per IP
- Webhook routes exempt (GitHub needs fast response)
- AI generation has separate quota (usageService)

---

## Input Validation

### Regex Injection Prevention
```js
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```
- Used in: user search, task search, note search
- Prevents: unintended regex patterns, ReDoS attacks

### File Upload Validation
```js
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp',
                     'application/pdf', 'text/plain', 'application/json'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});
```

### Mongoose Schema Validation
- Required fields enforced at schema level
- Type validation (String, Number, Date, etc.)
- Enum values for status fields
- Min/max length constraints

---

## Cross-References

- [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) — JWT authentication
- [48-encryption-security-utilities.md](./48-encryption-security-utilities.md) — AES-256 encryption
- [22-github-webhook-handler.md](./22-github-webhook-handler.md) — HMAC verification
- [12-haveibeenpwned-integration.md](./12-haveibeenpwned-integration.md) — Password breach check
- [51-middleware-stack-overview.md](./51-middleware-stack-overview.md) — Middleware chain
- [57-error-handling-strategy.md](./57-error-handling-strategy.md) — Error handling without info leaks
- [56-environment-variables-reference.md](./56-environment-variables-reference.md) — Security env vars

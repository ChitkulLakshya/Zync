# 57 — Error Handling Strategy

**NEW document** — Global error patterns, fail-open design, graceful degradation, error response schemas, logging

---

## Feature Summary

Zync follows a consistent error handling strategy across all backend routes and services. Key principles: fail-open for non-critical services (Redis, email), graceful degradation (return safe defaults), consistent error response schemas, and comprehensive logging without exposing sensitive data.

---

## Error Handling Principles

### 1. Fail-Open for Non-Critical Services
Services that are "nice to have" but not critical to app function:
- **Redis:** Cache miss → fetch from DB (no crash)
- **Email:** SMTP failure → return null (no crash, operation continues)
- **Geo-IP API:** Failure → return "Unknown" location (no crash)

### 2. Graceful Degradation
When a subsystem fails, the app falls back to a safe state:
- **DB disconnected:** Chat routes return 503, other routes may use cache
- **GitHub API down:** Architecture analysis fails → quota refunded
- **Cloudinary upload fails:** Return error to user, no partial state

### 3. Consistent Error Response Schema
All errors follow the same JSON structure:
```json
{
  "error": "Human-readable message",
  "message": "Alternative message field (some routes)"
}
```

### 4. No Sensitive Data in Errors
- Stack traces never sent to client
- Internal paths never exposed
- Decrypted tokens never logged
- Only user-friendly messages returned

---

## Error Response Patterns

### Route-Level Error Handling
```js
router.get('/resource', verifyToken, async (req, res) => {
  try {
    // ... business logic
    res.json(data);
  } catch (error) {
    console.error('[RouteName] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
```

### Service-Level Error Handling
```js
// Services throw errors, callers catch
const sendZyncEmail = async (to, subject, html) => {
  try {
    return await send_ZYNC_email(to, subject, html);
  } catch (error) {
    if (error.code === 'EAUTH') {
      console.error('Email auth failed');
      return null;  // Fail-open
    }
    throw error;  // Re-throw non-auth errors
  }
};
```

---

## HTTP Status Code Usage

| Status | Usage | Example |
|---|---|---|
| 200 | Success | GET /projects returns list |
| 201 | Created | POST /projects creates project |
| 202 | Accepted (async) | Webhook received and queued |
| 400 | Bad request | Missing required fields |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Not owner of resource |
| 404 | Not found | Resource doesn't exist |
| 409 | Conflict | Duplicate application |
| 413 | Payload too large | File upload exceeds limit |
| 429 | Too many requests | Rate limited or quota exceeded |
| 500 | Server error | Unhandled exception |
| 503 | Service unavailable | DB disconnected |

---

## Fail-Open Matrix

| Service | Failure Mode | Behavior | User Impact |
|---|---|---|---|
| Redis | Down | Cache miss → DB query | Slower but functional |
| Email (SMTP) | Auth failure | Return null | No email sent, operation succeeds |
| Email (SMTP) | Network error | Re-throw | Caller catches, may fail operation |
| Geo-IP API | Down | Return "Unknown" | Location shows "Unknown" |
| Kilo Gateway | Timeout | Quota refunded | AI analysis fails, user can retry |
| Cloudinary | Upload fails | Error thrown | Upload fails, user sees error |
| GitHub API | Rate limited | Error from GitHub | GitHub features unavailable |
| MongoDB | Disconnected | 503 (requireDb) or error | Affected routes return 503 |

---

## Logging Strategy

### Log Levels
| Level | Usage |
|---|---|
| `console.error` | Errors, exceptions, auth failures |
| `console.warn` | Cache misses, degraded mode, warnings |
| `console.log` | Info, connections, disconnections |
| `debugWebhookLog` | Debug-only (gated by env var) |

### What Gets Logged
- Socket connections/disconnections
- Email auth failures
- Cache failures
- Webhook processing
- Delivery catch-up batches
- Error stack traces (server-side only)

### What Does NOT Get Logged
- Decrypted tokens
- User passwords
- Full request bodies (only error messages)
- PII in plaintext

---

## Cross-References

- [51-middleware-stack-overview.md](./51-middleware-stack-overview.md) — Auth middleware error handling
- [33-redis-cache-layer.md](./33-redis-cache-layer.md) — Redis fail-open design
- [28-email-service-notifications.md](./28-email-service-notifications.md) — Email fail-open
- [27-usage-service-quota.md](./27-usage-service-quota.md) — Quota fail-open
- [48-encryption-security-utilities.md](./48-encryption-security-utilities.md) — Decrypt error handling

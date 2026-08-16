# 46 — Webhook Routes

**NEW document** — Generic webhook handling, third-party integrations, event routing

---

## Feature Summary

The webhook routes handle incoming webhooks from third-party services. Currently includes the GitHub App webhook handler (detailed in file 22) and may support additional integrations. Webhooks are verified, deduplicated, and processed asynchronously.

---

## Architecture Diagram

```
┌─────────────────── EXTERNAL SERVICES ───────────────────┐
│                                                         │
│  GitHub App ──── POST /api/github-app/webhook           │
│  (Future) Stripe ──── POST /api/webhooks/stripe         │
│  (Future) Slack ──── POST /api/webhooks/slack           │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/webhookRoutes.js                        │
│  ├─ Mounts githubAppWebhook at /github-app              │
│  └─ (Future) additional webhook handlers                │
│                                                         │
│  backend/routes/githubAppWebhook.js                     │
│  ├─ POST /webhook → verifyGithub + enqueue              │
│  └─ GET /webhook/jobs/:deliveryId → job status          │
│                                                         │
│  Verification:                                          │
│  ├─ GitHub: HMAC SHA-256 (verifyGithub middleware)      │
│  ├─ Stripe: (future) signature verification             │
│  └─ Slack: (future) token verification                  │
│                                                         │
│  Processing:                                            │
│  ├─ Queue: webhookQueue.js (in-memory Map)              │
│  ├─ Worker: githubWebhookWorker.js                      │
│  └─ Dedup: by delivery ID                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/webhookRoutes.js`

### Route Mounting
```js
const githubAppWebhook = require('./githubAppWebhook');
router.use('/github-app', githubAppWebhook);
```
- Mounts GitHub App webhook handler at `/api/webhooks/github-app`
- Future webhooks can be mounted similarly

### GitHub App Webhook (detailed in file 22)
- **POST /github-app/webhook** — receives + enqueues
- **GET /github-app/webhook/jobs/:deliveryId** — job status
- **Verification:** `verifyGithub` middleware (HMAC SHA-256)
- **Processing:** Queue + worker pattern

---

## Webhook Processing Pattern

All webhooks follow the same pattern:

1. **Receive:** Express route receives POST request
2. **Verify:** Middleware verifies signature/token
3. **Deduplicate:** Check for duplicate delivery ID
4. **Enqueue:** Add to processing queue
5. **Acknowledge:** Return 202 Accepted immediately
6. **Process:** Worker processes job asynchronously
7. **Emit:** Socket.IO updates to frontend

### Why Async Processing?
- Webhook senders expect fast response (<5s)
- Processing may involve DB writes, API calls, email sending
- Failures in processing don't affect webhook acknowledgment
- GitHub retries if response is not 200-level within 10s

---

## Cross-References

- [22-github-webhook-handler.md](./22-github-webhook-handler.md) — GitHub App webhook deep dive
- [06-middleware-stack.md](./06-middleware-stack.md) — Webhook raw body parsing

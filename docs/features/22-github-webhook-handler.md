# 22 — GitHub Webhook Handler

**NEW document** — GitHub App webhook ingestion, HMAC verification, queue-based processing, deduplication, job status

---

## Feature Summary

GitHub webhooks are received at `POST /api/github-app/webhook`, verified via HMAC signature, deduplicated by delivery ID, and enqueued into an in-memory job queue. A registered worker processes each webhook event (push, pull_request, etc.) and emits Socket.IO updates to the frontend. Job status can be queried via a GET endpoint.

---

## Architecture Diagram

```
┌─────────────────── GITHUB ─────────────────────────────┐
│                                                         │
│  GitHub sends webhook on:                               │
│  ├─ push (commits to task branch)                       │
│  ├─ pull_request (opened, closed, merged)               │
│  ├─ installation (app installed/uninstalled)            │
│  └─ repository (created, deleted, renamed)              │
│                                                         │
│  Headers:                                               │
│  ├─ X-GitHub-Event: <event type>                        │
│  ├─ X-GitHub-Delivery: <unique delivery ID>             │
│  └─ X-Hub-Signature-256: <HMAC SHA-256 signature>       │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │ POST /api/github-app/webhook
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  verifyGithub middleware (HMAC verification)             │
│  ├─ Recompute HMAC SHA-256 with WEBHOOK_SECRET          │
│  ├─ Compare with X-Hub-Signature-256 header             │
│  └─ If mismatch: 401 Unauthorized                       │
│                                                         │
│  Route handler (githubAppWebhook.js)                    │
│  ├─ Extract event + deliveryId from headers             │
│  ├─ Validate deliveryId present (400 if missing)        │
│  ├─ enqueueWebhookJob({ deliveryId, event, payload })   │
│  │   ├─ Check for duplicate deliveryId                  │
│  │   ├─ If duplicate: return { duplicate: true }        │
│  │   └─ If new: add to in-memory queue                  │
│  └─ Return 202 Accepted                                 │
│                                                         │
│  Webhook Queue (webhookQueue.js)                        │
│  ├─ In-memory job queue (Map<deliveryId, job>)          │
│  ├─ registerWebhookProcessor(processGithubWebhookJob)   │
│  ├─ Worker processes jobs sequentially                  │
│  └─ Job states: queued → processing → done/failed       │
│                                                         │
│  githubWebhookWorker.js                                 │
│  ├─ processGithubWebhookJob(job)                        │
│  ├─ Switch on event type:                               │
│  │   ├─ push → emit task-updated via taskIO             │
│  │   ├─ pull_request → update task status               │
│  │   ├─ installation → update user integration          │
│  │   └─ repository → sync project repo info             │
│  └─ Emit Socket.IO events to relevant rooms             │
│                                                         │
│  Job Status Endpoint:                                   │
│  GET /api/github-app/webhook/jobs/:deliveryId           │
│  └─ Returns job state + result                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/githubAppWebhook.js` (144 lines)

### Imports (lines 76-85)
```js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const verifyGithub = require('../middleware/verifyGithub');
const { processGithubWebhookJob } = require('../services/githubWebhookWorker');
const { registerWebhookProcessor, enqueueWebhookJob, getWebhookJobStatus } = require('../services/webhookQueue');
```

### Debug Logging (lines 87-93)
- Enabled when `DEBUG_WEBHOOKS=true` or `LOG_LEVEL=debug`
- `debugWebhookLog(...args)` — conditional console.log

### Worker Registration (line 95)
```js
registerWebhookProcessor(processGithubWebhookJob);
```
- Registers the webhook worker function that processes queued jobs
- Called once at module load time

### POST /webhook (lines 98-132)
- **Middleware:** `verifyGithub` — HMAC signature verification
- **Headers extracted:**
  - `x-github-event` — event type (push, pull_request, etc.)
  - `x-github-delivery` — unique delivery ID for deduplication
- **Validation:** deliveryId must be present (400 if missing)
- **Enqueue:**
  ```js
  const enqueueResult = enqueueWebhookJob({
    deliveryId: normalizedDeliveryId,
    event,
    payload: req.body,
    getIo: () => req.app.get('io'),
    getTaskIO: () => req.app.get('taskIO'),
  });
  ```
  - `getIo` / `getTaskIO` — lazy accessors for Socket.IO instances
  - Returns `{ duplicate: boolean, job }`
- **Response:** 202 Accepted
  ```js
  { message: "Webhook accepted", duplicate: false, deliveryId, job }
  ```

### GET /webhook/jobs/:deliveryId (lines 135-142)
- **Auth:** required (authMiddleware)
- **Logic:** `getWebhookJobStatus(deliveryId)` — look up job in queue
- **Response:** `{ job: { state, result, error } }` or 404

---

### HMAC Verification Middleware
**File:** `backend/middleware/verifyGithub.js`

```
1. Get X-Hub-Signature-256 header from request
2. Read raw request body (verified by express.json webhook config)
3. Compute HMAC SHA-256: crypto.createHmac('sha256', WEBHOOK_SECRET).update(body)
4. Compare computed signature with header signature
5. If match: next()
6. If mismatch: 401 Unauthorized
```

- **WEBHOOK_SECRET:** Environment variable, same as configured in GitHub App settings
- **Timing-safe comparison:** Uses `crypto.timingSafeEqual()` to prevent timing attacks

---

### Webhook Queue
**File:** `backend/services/webhookQueue.js`

### Data Structure
```
jobQueue: Map<deliveryId, {
  deliveryId: string,
  event: string,
  payload: object,
  state: 'queued' | 'processing' | 'done' | 'failed',
  result: any,
  error: string | null,
  enqueuedAt: number,
  processedAt: number | null
}>
```

### enqueueWebhookJob(data)
1. Check if `deliveryId` already exists in queue → return `{ duplicate: true }`
2. Create new job entry with state `'queued'`
3. Trigger processor (async, non-blocking)
4. Return `{ duplicate: false, job }`

### registerWebhookProcessor(fn)
- Stores the processor function
- Called when jobs are dequeued

### getWebhookJobStatus(deliveryId)
- Returns job from Map (or null if not found)

---

### Webhook Worker
**File:** `backend/services/githubWebhookWorker.js`

### processGithubWebhookJob(job)
```
1. Set job.state = 'processing'
2. Switch on job.event:
   ├─ 'push':
   │   ├─ Extract branch name from payload.ref
   │   ├─ Find task by githubBranchName
   │   ├─ Emit 'task-updated' via taskIO to project room
   │   └─ Update task commit count
   ├─ 'pull_request':
   │   ├─ Extract action (opened, closed, merged)
   │   ├─ Find task by branch name
   │   ├─ If merged: update task status to 'completed'
   │   └─ Emit 'task-updated' via taskIO
   ├─ 'installation':
   │   ├─ action: 'created' → store installationId on user
   │   └─ action: 'deleted' → remove installationId
   └─ 'repository':
      ├─ action: 'deleted' → mark project as orphaned
      └─ action: 'renamed' → update project.githubRepoName
3. Set job.state = 'done', job.result = result
4. If error: job.state = 'failed', job.error = message
```

---

## Frontend Trace

### Real-Time Updates
- Socket.IO `/tasks` namespace receives `task-updated` events
- Kanban board automatically updates when:
  - New commits are pushed to task branch
  - PR is opened/closed/merged
  - Task status changes

### Job Status Polling (optional)
- Frontend can poll `GET /api/github-app/webhook/jobs/:deliveryId`
- Used for debugging webhook delivery issues
- Not used in normal user flow (Socket.IO is primary update channel)

---

## Deduplication Strategy

GitHub may retry webhook delivery if it doesn't receive a 200-level response quickly. The queue prevents duplicate processing:

1. **First delivery:** Enqueued with `deliveryId` → 202 Accepted
2. **Retry delivery:** Same `deliveryId` found in queue → 202 Accepted with `duplicate: true`
3. **After processing:** Job remains in queue with `state: 'done'` — retries still see it as duplicate

### Memory Management
- Completed jobs are not automatically removed from the Map
- In production, a TTL or max-size cleanup should be implemented
- Current behavior: jobs persist until server restart

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| Invalid HMAC signature | 401 | Unauthorized |
| Missing delivery ID | 400 | `{ message: "Missing x-github-delivery header" }` |
| Duplicate delivery | 202 | `{ message: "Duplicate delivery already queued/processed", duplicate: true }` |
| Enqueue error | 500 | `{ message: "Webhook enqueue failed", error }` |
| Job not found (status query) | 404 | `{ message: "Job not found" }` |
| Worker processing error | — | Job state set to 'failed', error stored |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `WEBHOOK_SECRET` | Yes | HMAC secret for GitHub webhook verification |
| `DEBUG_WEBHOOKS` | No | Enable debug logging (`true`/`false`) |
| `LOG_LEVEL` | No | Set to `debug` to enable webhook debug logs |

---

## Cross-References

- [21-github-oauth-integration.md](./21-github-oauth-integration.md) — GitHub App installation
- [16-task-management.md](./16-task-management.md) — Task branch updates from webhooks
- [02-security-auth-architecture.md](./02-security-auth-architecture.md) — HMAC verification
- [06-middleware-stack.md](./06-middleware-stack.md) — Webhook raw body parsing config

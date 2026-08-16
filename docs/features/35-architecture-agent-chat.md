# 35 — Architecture Agent Chat

**NEW document** — AI chat endpoint for architecture questions, quota integration, streaming responses, context-aware prompts

---

## Feature Summary

The architecture agent is an AI chatbot that answers questions about a project's architecture. It uses the Kilo Code Gateway to process user questions with project context (architecture analysis, repo info) and returns AI-generated responses. Includes quota enforcement via the usage service.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  ProjectWorkspace.tsx → AI Chat tab                     │
│  ├─ ChatInterface.tsx                                   │
│  │   ├─ Message list (user + AI messages)               │
│  │   ├─ Input box with send button                      │
│  │   └─ Quota indicator ("2/4 used this week")          │
│  ├─ Context: current project architecture analysis      │
│  └─ Suggestions: pre-built question chips                │
│                                                         │
│  Hooks:                                                 │
│  ├─ useArchitectureChat.ts — chat mutation              │
│  └─ useQuota.ts — GET /api/architecture-agent/quota     │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/architectureAgentRoutes.js              │
│                                                         │
│  POST /chat  → AI chat with architecture context        │
│  GET  /quota → user's remaining generations             │
│                                                         │
│  Chat flow:                                             │
│  1. Verify Kilo Gateway configured (503 if not)         │
│  2. chatThrottle(uid) → enforce min gap (2s)            │
│  3. Build prompt: user question + project context       │
│  4. Call Kilo Code Gateway /v1/chat/completions         │
│  5. Return AI response                                  │
│                                                         │
│  Quota:                                                 │
│  ├─ chatThrottle: soft pace limit (2s between calls)    │
│  └─ getUserQuota: weekly generation count               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/architectureAgentRoutes.js`

### POST /chat (lines 18-100)
- **Auth:** required
- **Input:** `{ message, projectId?, architectureContext? }`
- **Logic:**
  1. **Check gateway configured:**
     ```js
     if (!KILO_CODE_GATEWAY_URL || !KILO_CODE_GATEWAY_API_KEY) {
       return res.status(503).json({ error: 'Architecture agent is not configured.' });
     }
     ```
  2. **Chat throttle:**
     ```js
     const waitMs = await chatThrottle(req.user.uid);
     if (waitMs > 0) {
       return res.status(429).json({ error: 'Please wait', waitMs });
     }
     ```
  3. **Build prompt:** User question + architecture context (if provided)
  4. **Call Kilo Gateway:**
     ```js
     const response = await axios.post(
       `${KILO_CODE_GATEWAY_URL}/v1/chat/completions`,
       {
         model: KILO_CODE_GATEWAY_MODEL,
         messages: [
           { role: 'system', content: 'You are an expert software architect...' },
           { role: 'user', content: prompt }
         ],
         temperature: 0.3,
       },
       { headers: { Authorization: `Bearer ${KILO_CODE_GATEWAY_API_KEY}` }, timeout: 60000 }
     );
     ```
  5. **Return response:** `res.json({ reply: response.data?.choices?.[0]?.message?.content })`

### GET /quota (lines 102-105)
- **Auth:** required
- **Logic:** `const quota = await getUserQuota(req.user.uid)`
- **Response:** `{ gensUsed, gensLimit, resetOn }`

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| Gateway not configured | 503 | `{ error: 'Architecture agent is not configured.' }` |
| Throttled (too fast) | 429 | `{ error: 'Please wait', waitMs }` |
| Gateway timeout | 500 | `{ error: 'AI service timeout' }` |
| Gateway error | 500 | `{ error: 'AI service error' }` |
| No token | 401 | Unauthorized |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `KILO_CODE_GATEWAY_URL` | Yes | Gateway API URL |
| `KILO_CODE_GATEWAY_API_KEY` | Yes | Gateway API key |
| `KILO_CODE_GATEWAY_MODEL` | No | Model (default: `kilo-auto/free`) |

---

## Cross-References

- [25-ai-architecture-analysis.md](./25-ai-architecture-analysis.md) — Architecture analysis endpoint
- [26-kilo-code-gateway.md](./26-kilo-code-gateway.md) — Gateway service
- [27-usage-service-quota.md](./27-usage-service-quota.md) — Quota and throttle

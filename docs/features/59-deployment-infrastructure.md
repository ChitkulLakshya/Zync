# 59 — Deployment & Infrastructure

**NEW document** — Render hosting, environment configuration, build process, health checks, scaling considerations

---

## Feature Summary

Zync is deployed on Render with a monolithic backend (Express + Socket.IO) and a static frontend (Vite build). MongoDB Atlas provides the database, Redis Cloud provides caching, and Cloudinary handles media storage. This document covers the deployment configuration, build process, and infrastructure setup.

---

## Architecture Diagram

```
┌─────────────────── INFRASTRUCTURE ──────────────────────┐
│                                                         │
│  ┌─────────────┐     ┌──────────────┐                   │
│  │  Frontend   │     │   Backend    │                   │
│  │  (Vite)     │     │  (Express)   │                   │
│  │  Render     │     │  Render       │                   │
│  │  Static     │     │  Web Service  │                   │
│  └──────┬──────┘     └──────┬───────┘                   │
│         │                    │                           │
│         │  HTTPS API         │                           │
│         └───────────────────►│                           │
│                              │                           │
│         ┌────────────────────┼─────────────────┐        │
│         │                    │                  │        │
│         ▼                    ▼                  ▼        │
│  ┌──────────┐     ┌──────────────┐    ┌──────────────┐  │
│  │ MongoDB  │     │    Redis     │    │  Cloudinary  │  │
│  │  Atlas   │     │   Cloud      │    │   Cloud      │  │
│  └──────────┘     └──────────────┘    └──────────────┘  │
│                                                         │
│  External APIs:                                         │
│  ├─ Firebase Auth (Google)                              │
│  ├─ GitHub API + GitHub App                             │
│  ├─ Google Calendar API                                 │
│  ├─ Kilo Code Gateway (LLM)                             │
│  ├─ HaveIBeenPwned API                                  │
│  ├─ ipapi.co (Geo-IP)                                   │
│  └─ date.nager.at (Holidays)                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Render Configuration

### Backend (Web Service)
```yaml
# render.yaml
services:
  - type: web
    name: zync-backend
    env: node
    buildCommand: npm install
    startCommand: node index.js
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: REDIS_URL
        sync: false
      - key: ENCRYPTION_KEY
        sync: false
      # ... all env vars from .env
```

### Frontend (Static Site)
```yaml
  - type: web
    name: zync-frontend
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_URL
        value: https://zync-backend.onrender.com
```

---

## Build Process

### Backend
1. `npm install` — install dependencies
2. No build step (Node.js runs directly)
3. `node index.js` — start server
4. Health check: `GET /api/health` → `{ status: "ok" }`

### Frontend
1. `npm install` — install dependencies
2. `npm run build` — Vite production build
3. Output: `dist/` directory
4. Served as static files by Render

---

## Health Check Endpoint

### GET /api/health
```js
router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = isAvailable() ? 'connected' : 'disconnected';
  
  res.json({
    status: 'ok',
    database: dbStatus,
    redis: redisStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
```
- Render checks this endpoint for service health
- Returns DB and Redis connection status
- No auth required (public endpoint)

---

## Scaling Considerations

### Socket.IO Scaling
- **Single instance:** Works fine for small user base
- **Multi-instance:** Requires Redis adapter for Socket.IO
  ```js
  io.adapter(redisAdapter({ host: REDIS_HOST, port: 6379 }));
  ```
- Redis adapter broadcasts events across all Node.js instances

### In-Memory State Limitations
- `notePresence` Map (notes socket) — lost on restart, per-instance
- `architectureAnalysisCache` Map — lost on restart, per-instance
- `webhookQueue` Map — lost on restart, per-instance
- `userSockets` Map (chat/presence) — lost on restart, per-instance

**For multi-instance:** These should be moved to Redis (shared state)

### Database Connection Pooling
```js
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
});
```

---

## Environment Setup Checklist

### Pre-Deployment
- [ ] MongoDB Atlas cluster created
- [ ] Redis Cloud instance created
- [ ] Cloudinary account configured
- [ ] Firebase project created with Admin SDK
- [ ] GitHub OAuth App + GitHub App created
- [ ] Google OAuth credentials created
- [ ] LinkedIn OAuth credentials created
- [ ] Kilo Code Gateway URL + API key obtained
- [ ] SMTP credentials (Gmail app password) configured
- [ ] `ENCRYPTION_KEY` generated (32+ char random string)
- [ ] `WEBHOOK_SECRET` generated
- [ ] All env vars set in Render dashboard

### Post-Deployment
- [ ] Health check returns 200
- [ ] Frontend loads and can reach backend
- [ ] Firebase Auth login works
- [ ] Socket.IO connections succeed
- [ ] GitHub webhook delivery verified

---

## Cross-References

- [07-deployment-config.md](./07-deployment-config.md) — Original deployment doc
- [56-environment-variables-reference.md](./56-environment-variables-reference.md) — All env vars
- [50-socket-io-initialization.md](./50-socket-io-initialization.md) — Redis adapter for scaling
- [33-redis-cache-layer.md](./33-redis-cache-layer.md) — Redis configuration

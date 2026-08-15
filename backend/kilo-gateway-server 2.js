/**
 * @fileoverview kilo-gateway-server.js
 *
 * Standalone entry point for the Zync Kilo Code Gateway micro-service.
 *
 * This server exposes ONLY the AI/architecture routes:
 *   POST /api/architecture-agent/chat
 *   GET  /api/architecture-agent/quota
 *   POST /api/generate-project         (architecture generation on project create)
 *   POST /api/projects/:id/analyze-architecture  (analyze from GitHub repo)
 *
 * It is deployed as a SEPARATE Render service (different account / instance)
 * so the Kilo Code Gateway API key, quotas, and heavy AI workloads are fully
 * isolated from the main Zync backend.
 *
 * Required env vars (set in the new Render service):
 *   MONGO_URI                   — same Atlas cluster as main backend (read project docs)
 *   REDIS_URL                   — same Redis instance (quota counters)
 *   REDIS_TLS                   — true if rediss://
 *   FIREBASE_SERVICE_ACCOUNT    — JSON or path (auth token verification)
 *   GCP_SERVICE_ACCOUNT_KEY     — alias accepted by firebaseAdmin.js
 *   KILO_CODE_GATEWAY_URL       — e.g. https://api.kilo.dev
 *   KILO_CODE_GATEWAY_API_KEY   — your Kilo API key
 *   KILO_CODE_GATEWAY_MODEL     — default: kilo-auto/free
 *   FRONTEND_URL                — Vercel frontend origin (for CORS)
 *   ALLOWED_ORIGINS             — comma-separated extra origins
 *   PORT                        — set automatically by Render
 *
 * Deploy commands (in Render dashboard for the new service):
 *   Build:  cd backend && npm install
 *   Start:  node backend/kilo-gateway-server.js
 */

'use strict';
require('dotenv').config();

const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const mongoose   = require('mongoose');

// ─── App ─────────────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,     // API server — no HTML pages served
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// ─── Rate limiting ─────────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
app.use(
  '/api/',
  rateLimit({
    windowMs: isProduction ? 15 * 60 * 1000 : 60 * 1000,
    max: isProduction ? 60 : 300,      // tighter than main backend — AI is expensive
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.', status: 429 },
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'zync-kilo-gateway' }));
app.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'zync-kilo-gateway',
    uptime: process.uptime(),
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    },
    kilo: {
      configured: !!(process.env.KILO_CODE_GATEWAY_URL && process.env.KILO_CODE_GATEWAY_API_KEY),
      model: process.env.KILO_CODE_GATEWAY_MODEL || 'kilo-auto/free',
    },
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/architecture-agent', require('./routes/architectureAgentRoutes'));
app.use('/api/generate-project',   require('./routes/generateProjectRoutes'));
// Project analyze-architecture endpoint lives inside projectRoutes but we
// expose only that sub-path to avoid mounting the entire projects router.
const projectRoutes = require('./routes/projectRoutes');
app.use('/api/projects', projectRoutes);

// ─── 404 catch-all ────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Error handler ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[kilo-gateway] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Database ─────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('[kilo-gateway] MONGO_URI is not set — exiting.');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => console.log('[kilo-gateway] MongoDB connected'))
  .catch((err) => {
    console.error('[kilo-gateway] MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`[kilo-gateway] Listening on port ${PORT}`);
  console.log(`[kilo-gateway] Kilo gateway: ${process.env.KILO_CODE_GATEWAY_URL || '(not configured)'}`);
  console.log(`[kilo-gateway] Model: ${process.env.KILO_CODE_GATEWAY_MODEL || 'kilo-auto/free'}`);
  console.log(`[kilo-gateway] Frontend origins: ${allowedOrigins.join(', ')}`);
});

module.exports = { app, server };

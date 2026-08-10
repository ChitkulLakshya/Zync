/**
 * @fileoverview index.js
 * @module index
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Server-Side API & Business Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const helmet = require('helmet');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { loadSheddingMiddleware } = require('./middleware/loadShedding');

const app = express();

// Initialize architecture queue for health monitoring
global.architectureQueue = {
  getStats: () => ({
    queueLength: 0,
    processing: 0,
    maxConcurrent: 3,
    completedTasks: 0,
    averageDuration: 0
  })
};

app.set('trust proxy', 1);

app.get('/favicon.ico', (req, res) => res.status(204).end());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://127.0.0.1:8081',
  'http://localhost:3000',
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : []),
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {

    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200,
};

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

require('./sockets/noteSocketHandler')(io);
require('./sockets/presenceSocketHandler')(io);
require('./sockets/chatSocketHandler')(io);
const taskIO = require('./sockets/taskSocketHandler')(io);

app.set('taskIO', taskIO);

const PORT = process.env.PORT || 5000;

const projectRoutes = require('./routes/projectRoutes');
const userRoutes = require('./routes/userRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const designRoutes = require('./routes/designRoutes');
const inspirationRoutes = require('./routes/inspirationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const generationRoutes = require('./routes/generateProjectRoutes');
const githubRoutes = require('./routes/github');
const linkRoutes = require('./routes/linkRoutes');
const githubAppWebhook = require('./routes/githubAppWebhook');
const noteRoutes = require('./routes/noteRoutes');
const chatRoutes = require('./routes/chatRoutes');
const taskRoutes = require('./routes/taskRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const supportRoutes = require('./routes/supportRoutes');
const internalMetricsRoutes = require('./routes/internalMetrics');
const collaboratorRoutes = require('./routes/collaboratorRoutes');

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'blob:',
          'https://apis.google.com',
          'https://www.googleapis.com',
          'https://www.gstatic.com',
          'https://www.google.com',
        ],
        'connect-src': [
          "'self'",
          'https://github.com',
          'https://api.github.com',
          'http://localhost:*',
          'ws://localhost:*',
          'wss://*.glitch.me',
          'https://*.googleapis.com',
          'https://www.google.com',
          'https://www.gstatic.com',
          'https://*.firebaseio.com',
          'https://*.firebase.google.com',
        ],
        'img-src': [
          "'self'",
          'data:',
          'https://avatars.githubusercontent.com',
          'https://*.githubusercontent.com',
          'https://*.googleusercontent.com',
          'https://*.google.com',
          'blob:',
          'https://ui-avatars.com',
          'https://res.cloudinary.com',
        ],
        'style-src': [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
        ],
        'worker-src': ["'self'", 'blob:'],
        'frame-src': [
          "'self'",
          'https://github.com',
          'https://*.firebaseapp.com',
          'https://*.google.com',
        ],
        'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

app.use(cors(corsOptions));

const isProduction = process.env.NODE_ENV === 'production';
const limiter = rateLimit({
  windowMs: isProduction ? 15 * 60 * 1000 : 60 * 1000,
  max: isProduction ? 100 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      'Too many requests from this IP, please try again after 15 minutes',
    status: 429,
  },
});


app.use('/api/', limiter);
app.use('/api/', loadSheddingMiddleware);


const webhookJsonParser = express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
});
app.use('/api/webhooks', webhookJsonParser);
app.use('/api/github-app', webhookJsonParser);


app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/projects', projectRoutes);
app.use('/api/generate-project', generationRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/link', linkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/design', designRoutes);
app.use('/api/inspiration', inspirationRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/github-app', githubAppWebhook);
app.use('/api/meet', require('./routes/meetRoutes'));
app.use('/api/linkedin', require('./routes/linkedinRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/google', require('./routes/googleRoutes'));
app.use('/api/calendar', calendarRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/collaborator', collaboratorRoutes);
app.use('/api/cache/sample', require('./routes/redisCacheSampleRoutes'));
app.use('/internal', internalMetricsRoutes);


const distPath = path.join(__dirname, '..', 'dist');
const distIndexHtml = path.join(distPath, 'index.html');
if (fs.existsSync(distIndexHtml)) {
  app.use(express.static(distPath));

  // Health check endpoint with memory monitoring
  app.get('/health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
    
    // Determine health status based on memory usage
    const memoryLimit = 512; // 512 MB for Render free tier
    const memoryPercent = (heapUsedMB / memoryLimit) * 100;
    
    let status = 'healthy';
    if (memoryPercent > 80) status = 'degraded';
    if (memoryPercent > 95) status = 'critical';
    
    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        rss: `${rssMB}MB`,
        limit: `${memoryLimit}MB`,
        percent: `${Math.round(memoryPercent)}%`
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        arch: process.arch
      },
      queue: global.architectureQueue ? global.architectureQueue.getStats() : null
    };
    
    const statusCode = status === 'healthy' ? 200 : (status === 'degraded' ? 200 : 503);
    res.status(statusCode).json(healthData);
  });

  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/internal')) {
      return next();
    }
    if (req.method !== 'GET') {
      return next();
    }
    return res.sendFile(distIndexHtml);
  });
} else {
  app.get('/', (req, res) => {
    res.send('API is running...');
  });
}


const MONGO_OPTIONS = {
  dbName: 'ZYNC_USER',
  retryWrites: false,
  tls: true,
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000,
  autoCreate: false,
  autoIndex: false,
};

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

async function connectWithRetry(attempt = 1) {
  const mongoUri =
    process.env.MONGO_URI && String(process.env.MONGO_URI).trim();
  if (!mongoUri) {
    console.warn(
      '⚠️  MONGO_URI not set — skipping database connection (API will run without MongoDB).'
    );
    return;
  }
  try {
    const conn = await mongoose.connect(mongoUri, MONGO_OPTIONS);
    console.log(`✅ Oracle ADB Connected: ${conn.connection.host}`);
    console.log(`   Database Name: ${conn.connection.name}`);
  } catch (err) {
    console.error(
      `❌ Oracle ADB Connection Error (attempt ${attempt}/${MAX_RETRIES}): ${err.message}`
    );
    if (attempt < MAX_RETRIES) {
      console.log(`   Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return connectWithRetry(attempt + 1);
    }
    console.error(
      '⚠️  All DB connection attempts failed — server continues without DB.'
    );
  }
}

connectWithRetry().catch((err) => {
  console.error('[MongoDB] Unexpected connection bootstrap error:', err);
});


const { connectRedis } = require('./utils/redisClient');
connectRedis();

const startServer = (port) => {
  const onError = (error) => {
    server.off('error', onError);

    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ ERROR: Port ${port} is already in use!`);
      console.error(`Please kill the process using it (e.g., zombie Node process) or change PORT in .env\n`);
      process.exit(1);
    }

    console.error(
      'Failed to start HTTP server:',
      error && error.code,
      error && error.message,
      error
    );
    process.exit(1);
  };

  server.once('error', onError);

  const listenPort = Number(port) || 5000;
  console.log(
    `Binding HTTP server on 0.0.0.0:${listenPort} (PORT=${process.env.PORT || '(unset)'})`
  );

  server.listen(listenPort, '0.0.0.0', () => {
    server.off('error', onError);
    console.log(`🚀 Server successfully started on port ${listenPort}`);
  });
};

startServer(PORT);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

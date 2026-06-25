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


app.set('trust proxy', 1);

app.get('/favicon.ico', (req, res) => res.status(204).end());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
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

const startServer = (port, retriesLeft = 10) => {
  const onError = (error) => {
    server.off('error', onError);

    if (error.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = Number(port) + 1;
      console.warn(`⚠️ Port ${port} is in use, trying ${nextPort}...`);
      setTimeout(() => startServer(nextPort, retriesLeft - 1), 100);
      return;
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

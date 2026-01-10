const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const helmet = require('helmet'); // <--- 1. Import Helmet
const { Server } = require("socket.io");
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:8080', 'https://zync-meet.vercel.app', 'http://localhost:3000'],
    methods: ["GET", "POST"]
  }
});

// Make io accessible to our routers
app.set('io', io);

// Initialize Socket Handlers
require('./sockets/noteSocketHandler')(io);


const PORT = process.env.PORT || 5000;

// Route Imports
const projectRoutes = require('./routes/projectRoutes');
const userRoutes = require('./routes/userRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const designRoutes = require('./routes/designRoutes');
const inspirationRoutes = require('./routes/inspirationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const generationRoutes = require('./routes/generateProjectRoutes');
const githubRoutes = require('./routes/githubRoutes');
const linkRoutes = require('./routes/linkRoutes');
const githubAppWebhook = require('./routes/githubAppWebhook');
const noteRoutes = require('./routes/noteRoutes');

// ==========================================
// 1. SECURITY MIDDLEWARE (Fixes CSP Error)
// ==========================================
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allows dev tools & libraries
        "connect-src": ["'self'", "https://github.com", "https://api.github.com", "http://localhost:*", "https://*.firebaseio.com"], 
        "img-src": ["'self'", "data:", "https://avatars.githubusercontent.com", "https://*.googleusercontent.com"], 
      },
    },
    crossOriginEmbedderPolicy: false, // Prevents blocking of some resources
  })
);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'https://zync-meet.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register Routes
app.use('/api/projects', projectRoutes);
app.use('/api/generate-project', generationRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/link', linkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/design', designRoutes);
app.use('/api/inspiration', inspirationRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/github-app', githubAppWebhook);


// ==========================================
// 2. ROBUST DATABASE CONNECTION
// ==========================================
mongoose.connect(process.env.MONGO_URI, {
  // These options help prevent "buffering timed out" and "ECONNRESET" errors
  serverSelectionTimeoutMS: 5000, 
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('API is running...');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server successfully started on port ${PORT}`);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
/**
 * Project Tracking Management System - Backend API Server
 * Main entry point for the Express application
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load environment variables
const envPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../.env') 
  : path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const geospatialRoutes = require('./routes/geospatial');
const referenceRoutes = require('./routes/reference');
const reportRoutes = require('./routes/reports');
const importRoutes = require('./routes/import');
const auditRoutes = require('./routes/audit');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { securityLogger } = require('./middleware/securityLogger');
const { sanitizeMiddleware } = require('./utils/sanitize');

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store io instance globally for use in routes
app.set('io', io);

// ============================================
// MIDDLEWARE
// ============================================

// Security headers via Helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", process.env.CORS_ORIGIN || "http://localhost:3000"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: process.env.NODE_ENV === 'production'
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
}));

// Parse JSON request body
app.use(express.json({ limit: '1mb' }));

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Input sanitization (XSS prevention)
app.use(sanitizeMiddleware);

// Security event logging
app.use(securityLogger);

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// ============================================
// API ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Project Tracking API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount route modules
// Auth routes (public - no authentication required)
app.use('/api/auth', authRoutes);

// Protected routes (authentication required)
app.use('/api/projects', authenticateToken, projectRoutes);
app.use('/api', authenticateToken, geospatialRoutes);
app.use('/api/reference', authenticateToken, referenceRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/import', authenticateToken, importRoutes);
app.use('/api/audit-logs', authenticateToken, auditRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);

// ============================================
// WEBSOCKET HANDLING
// ============================================

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Subscribe to project updates
  socket.on('subscribe:projects', () => {
    socket.join('projects');
    console.log(`Socket ${socket.id} subscribed to project updates`);
  });

  // Subscribe to specific import progress
  socket.on('subscribe:imports', (importId) => {
    socket.join(`import:${importId}`);
    console.log(`Socket ${socket.id} subscribed to import ${importId}`);
  });

  // Subscribe to user-specific notifications
  socket.on('subscribe:notifications', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} subscribed to notifications for user ${userId}`);
    }
  });

  // Unsubscribe from project updates
  socket.on('unsubscribe:projects', () => {
    socket.leave('projects');
    console.log(`Socket ${socket.id} unsubscribed from project updates`);
  });

  // Unsubscribe from user notifications
  socket.on('unsubscribe:notifications', (userId) => {
    if (userId) {
      socket.leave(`user:${userId}`);
      console.log(`Socket ${socket.id} unsubscribed from notifications for user ${userId}`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Make io available globally for emitting events from routes
global.io = io;

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - Route not found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    path: req.url
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File Too Large',
      message: 'The uploaded file exceeds the maximum allowed size'
    });
  }

  if (err.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'The requested resource was not found'
    });
  }

  // MySQL error handling
  if (err.code && err.code.startsWith('ER_')) {
    // Log error code only (not SQL details)
    console.error('Database error:', err.code);

    // Generic error message to client (no internal structure exposure)
    const errorMap = {
      'ER_DUP_ENTRY': 'A record with this information already exists',
      'ER_NO_REFERENCED_ROW_2': 'Referenced record not found',
      'ER_BAD_NULL_ERROR': 'Required field is missing',
      'ER_DATA_TOO_LONG': 'Data exceeds maximum length',
      'ER_DUP_KEY': 'A record with this information already exists'
    };

    return res.status(400).json({
      success: false,
      error: 'Database Error',
      message: errorMap[err.code] || 'An error occurred while processing your request'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// ============================================
// SERVER START
// ============================================

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
httpServer.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Project Tracking Management System - API Server');
  console.log('='.repeat(60));
  console.log(`Server running on port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60));
});

// Configure server timeouts (prevent slow Loris attacks)
httpServer.setTimeout(120000); // 2 minute timeout for requests
httpServer.keepAliveTimeout = 65000;
httpServer.headersTimeout = 66000;

module.exports = { app, io };

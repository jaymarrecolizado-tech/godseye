/**
 * Project Tracking Management System - Backend API Server
 * Main entry point for the Express application
 */

const express = require('express');
const cors = require('cors');
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

// Import middleware
const { authenticateToken } = require('./middleware/auth');

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

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parse JSON request body
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api', authenticateToken, referenceRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/import', authenticateToken, importRoutes);
app.use('/api/audit-logs', authenticateToken, auditRoutes);

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

  // Unsubscribe from project updates
  socket.on('unsubscribe:projects', () => {
    socket.leave('projects');
    console.log(`Socket ${socket.id} unsubscribed from project updates`);
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
    return res.status(400).json({
      success: false,
      error: 'Database Error',
      message: err.sqlMessage || 'A database error occurred',
      code: err.code
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
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
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'project_tracking'}`);
  console.log('='.repeat(60));
});

module.exports = { app, io };

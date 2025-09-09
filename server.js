// server.js (Updated with auth routes and middleware)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import database connection
const db = require('./config/database');

// Import middleware
const { authenticateToken, requireAdmin } = require('./middleware/auth');

// Import routes
const workOrderRoutes = require('./routes/workOrders');
const serviceRoutes = require('./routes/services');
const contactRoutes = require('./routes/contact');
const galleryRoutes = require('./routes/gallery');
const authRoutes = require('./routes/auth');

// Middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use(limiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directories exist
const uploadDirs = ['uploads/gallery', 'uploads/work-orders'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/gallery', galleryRoutes);

// Public work order submission (no auth required for customers)
app.use('/api/work-orders', (req, res, next) => {
  // Allow POST requests without authentication (for customers to submit orders)
  if (req.method === 'POST') {
    return next();
  }
  // Require authentication for all other work order operations
  authenticateToken(req, res, next);
}, workOrderRoutes);

// Admin routes (require authentication and admin role)
app.get('/api/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { query } = require('./config/database');
    
    // Get dashboard statistics
    const stats = await Promise.all([
      query('SELECT COUNT(*) as count FROM work_orders WHERE status = "pending"'),
      query('SELECT COUNT(*) as count FROM work_orders WHERE status = "in-progress"'),
      query('SELECT COUNT(*) as count FROM work_orders WHERE status = "completed"'),
      query('SELECT COUNT(*) as count FROM contact_messages WHERE status = "unread"'),
      query('SELECT COUNT(*) as count FROM gallery_images'),
      query('SELECT COUNT(*) as count FROM services WHERE is_active = 1'),
      query(`SELECT service_type, COUNT(*) as count 
             FROM work_orders 
             WHERE created_at >= date('now', '-30 days') 
             GROUP BY service_type 
             ORDER BY count DESC 
             LIMIT 5`),
      query(`SELECT DATE(created_at) as date, COUNT(*) as count 
             FROM work_orders 
             WHERE created_at >= date('now', '-7 days') 
             GROUP BY DATE(created_at) 
             ORDER BY date`)
    ]);

    res.json({
      pendingOrders: stats[0][0].count,
      inProgressOrders: stats[1][0].count,
      completedOrders: stats[2][0].count,
      unreadMessages: stats[3][0].count,
      galleryImages: stats[4][0].count,
      activeServices: stats[5][0].count,
      popularServices: stats[6],
      weeklyActivity: stats[7]
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'Man for Hire API',
    version: '1.0.0',
    description: 'Backend API for contractor services website',
    endpoints: {
      public: [
        'GET /api/health - Health check',
        'GET /api/services - Get all services',
        'GET /api/services/categories - Get service categories',
        'GET /api/services/:id - Get specific service',
        'POST /api/work-orders - Submit work order',
        'POST /api/contact - Submit contact message',
        'GET /api/gallery - Get gallery images',
        'POST /api/auth/login - Admin login',
        'POST /api/auth/register - Admin registration (first time only)'
      ],
      admin: [
        'GET /api/admin/dashboard - Admin dashboard stats',
        'GET /api/work-orders - Get all work orders',
        'PUT /api/work-orders/:id - Update work order',
        'DELETE /api/work-orders/:id - Delete work order',
        'POST/PUT/DELETE /api/services/* - Manage services',
        'GET /api/contact - Get contact messages',
        'PUT /api/contact/:id - Update message status',
        'POST/PUT/DELETE /api/gallery/* - Manage gallery',
        'GET /api/auth/me - Get current user info',
        'POST /api/auth/change-password - Change password'
      ]
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 5MB.' 
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files. Maximum is 5 files per upload.' 
      });
    }
  }
  
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ 
      error: 'Duplicate entry. Resource already exists.' 
    });
  }

  res.status(error.status || 500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    availableRoutes: [
      '/api/health',
      '/api/docs',
      '/api/services',
      '/api/work-orders',
      '/api/contact',
      '/api/gallery',
      '/api/auth'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Man for Hire API server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  
  // Setup directories on startup
  const { setupDirectories } = require('./scripts/setup');
  setupDirectories();
});

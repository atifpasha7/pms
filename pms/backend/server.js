// server.js
// PMS Backend — Express application entry point.
// Initialises Oracle pool, mounts all routers, starts HTTP server.

'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const { body, param } = require('express-validator');

const db           = require('./config/db');
const { errorHandler, notFound, validateRequest } = require('./middleware/errorHandler');
const { authenticate, requireRole } = require('./middleware/auth');

// ── Route imports ─────────────────────────────────────────────────────────────
const authRouter          = require('./routes/auth');
const projectRouter       = require('./routes/projects');
const taskRouter          = require('./routes/tasks');        // project-scoped
const dashboardRouter     = require('./routes/dashboard');
const notificationRouter  = require('./routes/notifications');

// ── Controller imports (task endpoints not scoped to a project) ───────────────
const taskCtrl    = require('./controllers/taskController');

const app = express();

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// 1. Helmet — sets 11 security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge:            31536000, // 1 year in seconds
    includeSubDomains: true,
    preload:           true,
  },
}));

// 2. CORS — strictly locked to CLIENT_URL
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:3000',
    ].filter(Boolean);

    // Allow server-to-server requests (no origin) and configured origins
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin "${origin}" not allowed.`));
    }
  },
  credentials:     true,
  methods:         ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders:  ['Content-Type','Authorization'],
  exposedHeaders:  ['X-Total-Count'],
  maxAge:          86400, // preflight cache: 24 hours
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // pre-flight for all routes

// 3. Rate limiting
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,  // 15 minutes
  max:              20,               // 20 attempts per window
  message:          { success: false, error: 'Too many auth attempts. Please try again in 15 minutes.' },
  standardHeaders:  true,
  legacyHeaders:    false,
  skipSuccessfulRequests: false,
});

const apiLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,  // 15 minutes
  max:              500,              // 500 requests per window
  message:          { success: false, error: 'Rate limit exceeded. Please slow down.' },
  standardHeaders:  true,
  legacyHeaders:    false,
  skipSuccessfulRequests: true,
});

// =============================================================================
// GENERAL MIDDLEWARE
// =============================================================================

// 4. Body parsing — 10 MB limit prevents payload-based DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// =============================================================================
// HEALTH CHECK  (no auth required — for uptime monitoring)
// =============================================================================
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await db.healthCheck();
    res.json({
      status:     'ok',
      version:    '1.0.0',
      timestamp:  new Date().toISOString(),
      database:   {
        status:  'connected',
        dbTime:  dbStatus.DB_TIME,
        dbName:  dbStatus.DB_NAME,
      },
      environment: process.env.NODE_ENV,
    });
  } catch (err) {
    res.status(503).json({
      status:   'degraded',
      error:    'Database connection failed.',
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================================================
// API ROUTES
// =============================================================================

// Rate-limit auth endpoints more aggressively
app.use('/api/auth', authLimiter);
app.use('/api',      apiLimiter);

// ── Routers ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRouter);
app.use('/api/dashboard',     dashboardRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/projects',      projectRouter);

// Project-scoped tasks:  /api/projects/:projectId/tasks
app.use('/api/projects/:projectId/tasks', taskRouter);

// ── Task endpoints NOT scoped to a project ────────────────────────────────────
const { authenticate: auth } = require('./middleware/auth');

// GET /api/tasks/my-tasks
app.get('/api/tasks/my-tasks', auth, taskCtrl.getMyTasks);

// GET /api/tasks/:id
app.get('/api/tasks/:id', auth,
  [param('id').isInt({ min: 1 }), validateRequest],
  taskCtrl.getTaskById
);

// PUT /api/tasks/:id
app.put('/api/tasks/:id', auth,
  [
    param('id').isInt({ min: 1 }),
    body('title').optional().trim().isLength({ min: 2, max: 300 }),
    body('status').optional().isIn(['todo','in_progress','review','done','cancelled']),
    body('priority').optional().isIn(['low','medium','high','critical']),
    body('estimatedHours').optional().isFloat({ min: 0 }),
    body('actualHours').optional().isFloat({ min: 0 }),
    validateRequest,
  ],
  taskCtrl.updateTask
);

// PATCH /api/tasks/:id/status  — Kanban drag-and-drop
app.patch('/api/tasks/:id/status', auth,
  [
    param('id').isInt({ min: 1 }),
    body('status').isIn(['todo','in_progress','review','done','cancelled'])
      .withMessage('Invalid status value.'),
    validateRequest,
  ],
  taskCtrl.updateTaskStatus
);

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', auth,
  [param('id').isInt({ min: 1 }), validateRequest],
  taskCtrl.deleteTask
);

// POST /api/tasks/:id/comments
app.post('/api/tasks/:id/comments', auth,
  [
    param('id').isInt({ min: 1 }),
    body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Comment content required.'),
    validateRequest,
  ],
  taskCtrl.addComment
);

// PUT /api/tasks/:id/comments/:cid
app.put('/api/tasks/:id/comments/:cid', auth,
  [
    param('id').isInt({ min: 1 }),
    param('cid').isInt({ min: 1 }),
    body('content').trim().isLength({ min: 1, max: 5000 }),
    validateRequest,
  ],
  taskCtrl.updateComment
);

// DELETE /api/tasks/:id/comments/:cid
app.delete('/api/tasks/:id/comments/:cid', auth,
  [param('id').isInt({ min: 1 }), param('cid').isInt({ min: 1 }), validateRequest],
  taskCtrl.deleteComment
);

// =============================================================================
// 404 + GLOBAL ERROR HANDLER  (must be last)
// =============================================================================
app.use(notFound);
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================
const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Project Management System — Backend Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Initialise Oracle connection pool
    await db.initPool();

    // 2. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`\n✓  HTTP server listening on port ${PORT}`);
      console.log(`   ENV      : ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health   : http://localhost:${PORT}/api/health`);
      console.log(`   API base : http://localhost:${PORT}/api\n`);
    });

    // 3. Graceful shutdown handlers
    const shutdown = async (signal) => {
      console.log(`\n${signal} received — shutting down gracefully...`);
      server.close(async () => {
        await db.closePool();
        console.log('✓  Server closed.');
        process.exit(0);
      });
      // Force exit after 15 s if something hangs
      setTimeout(() => {
        console.error('✗  Forced shutdown after timeout.');
        process.exit(1);
      }, 15000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      console.error('✗  Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('✗  Uncaught Exception:', err.message);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    return server;
  } catch (err) {
    console.error('✗  Server startup failed:', err.message);
    console.error('\nCheck your .env configuration:');
    console.error('  DB_USER          =', process.env.DB_USER);
    console.error('  DB_CONNECT_STRING=', process.env.DB_CONNECT_STRING);
    process.exit(1);
  }
}

startServer();

module.exports = app; // export for testing

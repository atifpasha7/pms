// middleware/errorHandler.js
// Centralised Express error handler.
// Maps Oracle ORA- error codes, JWT errors, and validation errors
// to appropriate HTTP status codes with safe messages.

'use strict';

// ─── Oracle ORA- error code → HTTP mapping ───────────────────────────────────
const ORA_HTTP_MAP = {
  1:    { status: 409, message: 'A record with this value already exists (duplicate).' },
  1400: { status: 400, message: 'A required field was not provided.'                   },
  1722: { status: 400, message: 'Invalid number format in request.'                    },
  2291: { status: 400, message: 'Referenced record does not exist.'                    },
  2292: { status: 409, message: 'Cannot delete: record has dependent children.'        },
  12899: { status: 400, message: 'A field value exceeds the maximum allowed length.'   },
  20001: { status: 403, message: 'This operation is not permitted.'                    },
};

// =============================================================================
// errorHandler(err, req, res, next)
// Must be registered LAST in the Express middleware chain.
// =============================================================================
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Annotate request log with error (visible in Morgan output)
  req._errorLogged = true;
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
  console.error(`  Message : ${err.message}`);
  if (err.sql) console.error(`  SQL     : ${err.sql}`);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);

  // ── 1. Oracle Database errors ─────────────────────────────────────────────
  if (err.errorNum !== undefined) {
    const mapped = ORA_HTTP_MAP[err.errorNum];
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error:   mapped.message,
        code:    `ORA-${String(err.errorNum).padStart(5, '0')}`,
      });
    }
    // Unmapped Oracle error
    const safeMsg = process.env.NODE_ENV === 'development'
      ? err.message
      : 'A database error occurred. Please try again.';
    return res.status(500).json({
      success: false,
      error:   safeMsg,
      code:    `ORA-${err.errorNum}`,
    });
  }

  // ── 2. JWT errors (should be caught in auth.js but belt-and-suspenders) ──
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Invalid token.', code: 'TOKEN_INVALID' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token expired.', code: 'TOKEN_EXPIRED' });
  }

  // ── 3. Application-thrown HTTP errors (created with createHttpError) ──────
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error:   err.message,
      code:    err.code,
    });
  }

  // ── 4. Express-validator errors forwarded by validateRequest ──────────────
  if (err.type === 'VALIDATION_ERROR') {
    return res.status(422).json({
      success: false,
      error:   'Validation failed.',
      errors:  err.errors,
    });
  }

  // ── 5. oracledb connection pool exhausted ────────────────────────────────
  if (err.message && err.message.includes('NJS-040')) {
    return res.status(503).json({
      success: false,
      error:   'Database connection unavailable. Please try again shortly.',
      code:    'DB_POOL_EXHAUSTED',
    });
  }

  // ── 6. Generic 500 ────────────────────────────────────────────────────────
  const message = process.env.NODE_ENV === 'development'
    ? err.message
    : 'An unexpected error occurred. Please try again.';

  res.status(500).json({ success: false, error: message });
};

// =============================================================================
// validateRequest(req, res, next)
// Reads express-validator results and either calls next() or throws a
// formatted validation error caught by errorHandler.
// =============================================================================
const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error:   'Validation failed.',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// =============================================================================
// createHttpError(statusCode, message, code)
// Utility to throw structured HTTP errors from controllers.
//
// Usage: throw createHttpError(404, 'Project not found.', 'NOT_FOUND')
// =============================================================================
const createHttpError = (statusCode, message, code) => {
  const err      = new Error(message);
  err.statusCode = statusCode;
  err.code       = code;
  return err;
};

// =============================================================================
// notFound
// Catch-all for unmatched routes — registered before errorHandler.
// =============================================================================
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error:   `Route not found: ${req.method} ${req.originalUrl}`,
    code:    'ROUTE_NOT_FOUND',
  });
};

module.exports = { errorHandler, validateRequest, createHttpError, notFound };

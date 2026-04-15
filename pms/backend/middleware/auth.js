// middleware/auth.js
// JWT verification middleware + role-based access control (RBAC) helpers.
// Applied per-router — public routes (login/register) bypass this entirely.

'use strict';

const jwt = require('jsonwebtoken');
const db  = require('../config/db');

// =============================================================================
// authenticate
// Verifies the JWT Bearer token in the Authorization header.
// On success: injects req.user = { userId, username, email, role }
// On failure: returns 401 — never reveals whether the email exists.
// =============================================================================
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error:   'Authentication required. Provide a Bearer token.',
      });
    }

    const token = authHeader.slice(7); // strip "Bearer "

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error:   'Session expired. Please log in again.',
          code:    'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        error:   'Invalid authentication token.',
        code:    'TOKEN_INVALID',
      });
    }

    // Verify user still exists and is active (catches deleted/deactivated accounts)
    const result = await db.execute(
      `SELECT USER_ID, USERNAME, EMAIL, ROLE, IS_ACTIVE
       FROM   USERS
       WHERE  USER_ID = :userId`,
      { userId: decoded.userId },
      { autoCommit: true }
    );

    if (!result.rows.length || result.rows[0].IS_ACTIVE === 0) {
      return res.status(401).json({
        success: false,
        error:   'Account not found or deactivated.',
        code:    'ACCOUNT_INACTIVE',
      });
    }

    const user    = result.rows[0];
    req.user      = {
      userId:   user.USER_ID,
      username: user.USERNAME,
      email:    user.EMAIL,
      role:     user.ROLE,
    };

    next();
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// requireRole(...roles)
// Factory: returns middleware that blocks requests from users lacking any
// of the specified system-level roles.
//
// Usage:
//   router.delete('/:id', authenticate, requireRole('admin','manager'), ctrl.delete)
// =============================================================================
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error:   `Access denied. Required role: ${roles.join(' or ')}.`,
      code:    'INSUFFICIENT_ROLE',
    });
  }
  next();
};

// =============================================================================
// requireProjectRole(...projectRoles)
// Checks the calling user's role within the specific project (PROJECT_MEMBERS.ROLE).
// Must come AFTER authenticate and after req.params.id (projectId) is available.
//
// Usage:
//   router.delete('/:id', authenticate, requireProjectRole('owner','manager'), ctrl.delete)
// =============================================================================
const requireProjectRole = (...projectRoles) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }

    // Admin bypasses all project-level checks
    if (req.user.role === 'admin') return next();

    const projectId = req.params.id || req.params.projectId;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'Project ID required.' });
    }

    const result = await db.execute(
      `SELECT ROLE FROM PROJECT_MEMBERS
       WHERE  PROJECT_ID = :projectId
       AND    USER_ID    = :userId`,
      { projectId: Number(projectId), userId: req.user.userId },
      { autoCommit: true }
    );

    if (!result.rows.length) {
      return res.status(403).json({
        success: false,
        error:   'You are not a member of this project.',
        code:    'NOT_A_MEMBER',
      });
    }

    const memberRole = result.rows[0].ROLE;
    req.projectRole  = memberRole; // available to subsequent middleware/controllers

    if (!projectRoles.includes(memberRole)) {
      return res.status(403).json({
        success: false,
        error:   `Insufficient project role. Required: ${projectRoles.join(' or ')}.`,
        code:    'INSUFFICIENT_PROJECT_ROLE',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// optionalAuth
// Like authenticate but does NOT reject unauthenticated requests.
// Populates req.user if a valid token is provided; leaves it undefined otherwise.
// Useful for public endpoints that show extra info to logged-in users.
// =============================================================================
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.execute(
      `SELECT USER_ID, USERNAME, EMAIL, ROLE FROM USERS
       WHERE  USER_ID = :userId AND IS_ACTIVE = 1`,
      { userId: decoded.userId },
      { autoCommit: true }
    );

    if (result.rows.length) {
      const u   = result.rows[0];
      req.user  = { userId: u.USER_ID, username: u.USERNAME, email: u.EMAIL, role: u.ROLE };
    }

    next();
  } catch {
    // Silently ignore invalid tokens for optional auth
    next();
  }
};

module.exports = { authenticate, requireRole, requireProjectRole, optionalAuth };

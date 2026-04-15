// controllers/authController.js
// Authentication & user profile management.
// Handles: register · login · getMe · updateProfile · changePassword · listUsers

'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const { createHttpError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 10;

// =============================================================================
// signToken(user)  — internal helper
// =============================================================================
const signToken = (user) =>
  jwt.sign(
    {
      userId:   user.userId,
      username: user.username,
      email:    user.email,
      role:     user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// =============================================================================
// POST /api/auth/register
// =============================================================================
const register = async (req, res, next) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Check for existing username / email
    const dupCheck = await db.execute(
      `SELECT USER_ID FROM USERS
       WHERE  LOWER(USERNAME) = LOWER(:username) OR LOWER(EMAIL) = LOWER(:email)`,
      { username, email },
      { autoCommit: true }
    );

    if (dupCheck.rows.length) {
      throw createHttpError(409, 'Username or email already in use.', 'DUPLICATE_USER');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await db.execute(
      `INSERT INTO USERS (USERNAME, EMAIL, PASSWORD_HASH, FULL_NAME, ROLE)
       VALUES (:username, :email, :passwordHash, :fullName, 'member')
       RETURNING USER_ID, USERNAME, EMAIL, FULL_NAME, ROLE, CREATED_AT INTO
         :userId, :retUsername, :retEmail, :retFullName, :retRole, :retCreatedAt`,
      {
        username,
        email:        email.toLowerCase(),
        passwordHash,
        fullName,
        userId:       { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER   },
        retUsername:  { dir: require('oracledb').BIND_OUT, type: require('oracledb').STRING   },
        retEmail:     { dir: require('oracledb').BIND_OUT, type: require('oracledb').STRING   },
        retFullName:  { dir: require('oracledb').BIND_OUT, type: require('oracledb').STRING   },
        retRole:      { dir: require('oracledb').BIND_OUT, type: require('oracledb').STRING   },
        retCreatedAt: { dir: require('oracledb').BIND_OUT, type: require('oracledb').DATE     },
      },
      { autoCommit: true }
    );

    const ob = result.outBinds;
    const user = {
      userId:    ob.userId[0],
      username:  ob.retUsername[0],
      email:     ob.retEmail[0],
      fullName:  ob.retFullName[0],
      role:      ob.retRole[0],
      createdAt: ob.retCreatedAt[0],
    };

    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// POST /api/auth/login
// =============================================================================
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await db.execute(
      `SELECT USER_ID, USERNAME, EMAIL, PASSWORD_HASH, FULL_NAME, ROLE, AVATAR_URL, IS_ACTIVE, CREATED_AT
       FROM   USERS
       WHERE  LOWER(EMAIL) = LOWER(:email)`,
      { email },
      { autoCommit: true }
    );

    // Generic message — don't reveal whether email exists
    const INVALID_MSG = 'Invalid email or password.';

    if (!result.rows.length) {
      throw createHttpError(401, INVALID_MSG, 'INVALID_CREDENTIALS');
    }

    const row = result.rows[0];

    if (row.IS_ACTIVE === 0) {
      throw createHttpError(403, 'Account has been deactivated. Contact an administrator.', 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await bcrypt.compare(password, row.PASSWORD_HASH);
    if (!isMatch) {
      throw createHttpError(401, INVALID_MSG, 'INVALID_CREDENTIALS');
    }

    const user = {
      userId:    row.USER_ID,
      username:  row.USERNAME,
      email:     row.EMAIL,
      fullName:  row.FULL_NAME,
      role:      row.ROLE,
      avatarUrl: row.AVATAR_URL,
      createdAt: row.CREATED_AT,
    };

    const token = signToken(user);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/auth/me
// =============================================================================
const getMe = async (req, res, next) => {
  try {
    const result = await db.execute(
      `SELECT USER_ID, USERNAME, EMAIL, FULL_NAME, ROLE, AVATAR_URL, IS_ACTIVE, CREATED_AT, UPDATED_AT
       FROM   USERS
       WHERE  USER_ID = :userId`,
      { userId: req.user.userId },
      { autoCommit: true }
    );

    if (!result.rows.length) throw createHttpError(404, 'User not found.', 'NOT_FOUND');

    const row = result.rows[0];

    // Unread notification count
    const notifResult = await db.execute(
      `SELECT COUNT(*) AS CNT FROM NOTIFICATIONS
       WHERE  USER_ID = :userId AND IS_READ = 0`,
      { userId: req.user.userId },
      { autoCommit: true }
    );

    res.json({
      success: true,
      user: {
        userId:          row.USER_ID,
        username:        row.USERNAME,
        email:           row.EMAIL,
        fullName:        row.FULL_NAME,
        role:            row.ROLE,
        avatarUrl:       row.AVATAR_URL,
        isActive:        row.IS_ACTIVE === 1,
        createdAt:       row.CREATED_AT,
        updatedAt:       row.UPDATED_AT,
        unreadCount:     notifResult.rows[0].CNT,
      },
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PUT /api/auth/profile
// =============================================================================
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, avatarUrl } = req.body;

    await db.execute(
      `UPDATE USERS
       SET    FULL_NAME  = NVL(:fullName,  FULL_NAME),
              AVATAR_URL = NVL(:avatarUrl, AVATAR_URL)
       WHERE  USER_ID    = :userId`,
      { fullName: fullName || null, avatarUrl: avatarUrl || null, userId: req.user.userId },
      { autoCommit: true }
    );

    // Return updated profile
    const result = await db.execute(
      `SELECT USER_ID, USERNAME, EMAIL, FULL_NAME, ROLE, AVATAR_URL, UPDATED_AT
       FROM USERS WHERE USER_ID = :userId`,
      { userId: req.user.userId },
      { autoCommit: true }
    );

    const row = result.rows[0];
    res.json({
      success: true,
      message: 'Profile updated.',
      user: {
        userId:    row.USER_ID,
        username:  row.USERNAME,
        email:     row.EMAIL,
        fullName:  row.FULL_NAME,
        role:      row.ROLE,
        avatarUrl: row.AVATAR_URL,
        updatedAt: row.UPDATED_AT,
      },
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PUT /api/auth/change-password
// =============================================================================
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await db.execute(
      `SELECT PASSWORD_HASH FROM USERS WHERE USER_ID = :userId`,
      { userId: req.user.userId },
      { autoCommit: true }
    );

    if (!result.rows.length) throw createHttpError(404, 'User not found.', 'NOT_FOUND');

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].PASSWORD_HASH);
    if (!isMatch) {
      throw createHttpError(400, 'Current password is incorrect.', 'WRONG_PASSWORD');
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db.execute(
      `UPDATE USERS SET PASSWORD_HASH = :hash WHERE USER_ID = :userId`,
      { hash: newHash, userId: req.user.userId },
      { autoCommit: true }
    );

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/auth/users  — list all active users (for assignment dropdowns)
// =============================================================================
const getAllUsers = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const binds  = {};
    let   where  = 'WHERE IS_ACTIVE = 1';

    if (search) {
      where      += ' AND (LOWER(USERNAME) LIKE :search OR LOWER(FULL_NAME) LIKE :search)';
      binds.search = `%${search.toLowerCase()}%`;
    }

    const result = await db.execute(
      `SELECT USER_ID, USERNAME, EMAIL, FULL_NAME, ROLE, AVATAR_URL
       FROM   USERS
       ${where}
       ORDER  BY FULL_NAME`,
      binds,
      { autoCommit: true }
    );

    res.json({
      success: true,
      users: result.rows.map(r => ({
        userId:    r.USER_ID,
        username:  r.USERNAME,
        email:     r.EMAIL,
        fullName:  r.FULL_NAME,
        role:      r.ROLE,
        avatarUrl: r.AVATAR_URL,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PATCH /api/auth/users/:id/deactivate  — Admin only
// =============================================================================
const deactivateUser = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (targetId === req.user.userId) {
      throw createHttpError(400, 'You cannot deactivate your own account.', 'SELF_DEACTIVATE');
    }

    const result = await db.execute(
      `UPDATE USERS SET IS_ACTIVE = 0 WHERE USER_ID = :id`,
      { id: targetId },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) throw createHttpError(404, 'User not found.', 'NOT_FOUND');

    res.json({ success: true, message: 'User deactivated.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword, getAllUsers, deactivateUser };

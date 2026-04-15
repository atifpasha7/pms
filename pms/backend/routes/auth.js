// routes/auth.js
'use strict';
const express = require('express');
const { body, query }  = require('express-validator');
const router           = express.Router();
const ctrl             = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateRequest }           = require('../middleware/errorHandler');

const passwordRules = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
  .matches(/[0-9]/).withMessage('Password must contain at least one number.');

router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username may only contain letters, numbers, and underscores.'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address.'),
  passwordRules,
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters.'),
  validateRequest,
], ctrl.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email.'),
  body('password').notEmpty().withMessage('Password is required.'),
  validateRequest,
], ctrl.login);

router.get('/me', authenticate, ctrl.getMe);

router.put('/profile', authenticate, [
  body('fullName').optional().trim().isLength({ min: 2, max: 100 }),
  body('avatarUrl').optional().isURL().withMessage('Avatar URL must be a valid URL.'),
  validateRequest,
], ctrl.updateProfile);

router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
  validateRequest,
], ctrl.changePassword);

router.get('/users', authenticate, [
  query('search').optional().trim().isLength({ max: 100 }),
  validateRequest,
], ctrl.getAllUsers);

router.patch('/users/:id/deactivate', authenticate, requireRole('admin'), ctrl.deactivateUser);

module.exports = router;

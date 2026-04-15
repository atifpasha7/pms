// routes/tasks.js
'use strict';
const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router({ mergeParams: true }); // mergeParams for /projects/:projectId/tasks
const ctrl   = require('../controllers/taskController');
const { authenticate, requireProjectRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');

const VALID_STATUS   = ['todo','in_progress','review','done','cancelled'];
const VALID_PRIORITY = ['low','medium','high','critical'];

router.use(authenticate);

// ── Project-scoped task list  (mounted at /api/projects/:projectId/tasks) ────
router.get('/', [
  query('status').optional().isIn(VALID_STATUS),
  query('priority').optional().isIn(VALID_PRIORITY),
  query('assignedTo').optional().isInt({ min: 1 }),
  query('milestoneId').optional().isInt({ min: 1 }),
  validateRequest,
], ctrl.getTasksByProject);

router.post('/', [
  body('title').trim().isLength({ min: 2, max: 300 }),
  body('status').optional().isIn(VALID_STATUS),
  body('priority').optional().isIn(VALID_PRIORITY),
  body('assignedTo').optional({ nullable: true }).isInt({ min: 1 }),
  body('dueDate').optional({ nullable: true }).isISO8601(),
  body('estimatedHours').optional().isFloat({ min: 0 }),
  body('milestoneId').optional({ nullable: true }).isInt({ min: 1 }),
  body('tags').optional(),
  validateRequest,
  requireProjectRole('owner','manager','member'),
], ctrl.createTask);

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────
// routes/tasksDirect.js — task endpoints NOT scoped to a project
// ─────────────────────────────────────────────────────────────────────────────

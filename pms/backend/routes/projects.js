// routes/projects.js
'use strict';
const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const ctrl   = require('../controllers/projectController');
const mCtrl  = require('../controllers/memberController');
const { authenticate, requireProjectRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');

const VALID_STATUS   = ['planning','active','on_hold','completed','cancelled'];
const VALID_PRIORITY = ['low','medium','high','critical'];

router.use(authenticate);

// ── Project CRUD ──────────────────────────────────────────────────────────────
router.get('/', [
  query('status').optional().isIn(VALID_STATUS),
  query('priority').optional().isIn(VALID_PRIORITY),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
], ctrl.getAllProjects);

router.post('/', [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Project name must be 2-150 characters.'),
  body('status').optional().isIn(VALID_STATUS),
  body('priority').optional().isIn(VALID_PRIORITY),
  body('startDate').optional({ nullable: true }).isISO8601().withMessage('Invalid start date format.'),
  body('endDate').optional({ nullable: true }).isISO8601().withMessage('Invalid end date format.'),
  body('budget').optional().isFloat({ min: 0 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex code.'),
  validateRequest,
], ctrl.createProject);

router.get('/:id', [param('id').isInt({ min: 1 }), validateRequest], ctrl.getProjectById);

router.put('/:id', [
  param('id').isInt({ min: 1 }),
  body('name').optional().trim().isLength({ min: 2, max: 150 }),
  body('status').optional().isIn(VALID_STATUS),
  body('priority').optional().isIn(VALID_PRIORITY),
  body('budget').optional().isFloat({ min: 0 }),
  validateRequest,
  requireProjectRole('owner','manager'),
], ctrl.updateProject);

router.delete('/:id', [param('id').isInt({ min: 1 }), validateRequest,
  requireProjectRole('owner')], ctrl.deleteProject);

// ── Milestones ────────────────────────────────────────────────────────────────
router.get('/:id/milestones', [param('id').isInt({ min: 1 }), validateRequest], ctrl.getMilestones);

router.post('/:id/milestones', [
  param('id').isInt({ min: 1 }),
  body('title').trim().isLength({ min: 2, max: 200 }),
  body('dueDate').optional({ nullable: true }).isISO8601(),
  body('status').optional().isIn(['pending','in_progress','completed','overdue']),
  validateRequest,
  requireProjectRole('owner','manager','member'),
], ctrl.createMilestone);

router.put('/:id/milestones/:mid', [param('id').isInt({ min: 1 }), param('mid').isInt({ min: 1 }), validateRequest,
  requireProjectRole('owner','manager','member')], ctrl.updateMilestone);

router.delete('/:id/milestones/:mid', [param('id').isInt({ min: 1 }), param('mid').isInt({ min: 1 }), validateRequest,
  requireProjectRole('owner','manager')], ctrl.deleteMilestone);

// ── Activity ──────────────────────────────────────────────────────────────────
router.get('/:id/activity', [param('id').isInt({ min: 1 }), validateRequest], ctrl.getActivity);

// ── Members ───────────────────────────────────────────────────────────────────
router.get('/:id/members', [param('id').isInt({ min: 1 }), validateRequest], mCtrl.getProjectMembers);

router.post('/:id/members', [
  param('id').isInt({ min: 1 }),
  body('userId').isInt({ min: 1 }).withMessage('Valid userId required.'),
  body('role').optional().isIn(['manager','member','viewer']),
  validateRequest,
  requireProjectRole('owner','manager'),
], mCtrl.addMember);

router.put('/:id/members/:uid', [
  param('id').isInt({ min: 1 }), param('uid').isInt({ min: 1 }),
  body('role').isIn(['manager','member','viewer']).withMessage('Invalid role.'),
  validateRequest,
  requireProjectRole('owner'),
], mCtrl.updateMemberRole);

router.delete('/:id/members/:uid', [param('id').isInt({ min: 1 }), param('uid').isInt({ min: 1 }), validateRequest,
  requireProjectRole('owner')], mCtrl.removeMember);

module.exports = router;

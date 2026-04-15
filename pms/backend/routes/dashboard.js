// routes/dashboard.js
'use strict';
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/stats',             ctrl.getStats);
router.get('/project-overview',  ctrl.getProjectOverview);
router.get('/task-summary',      ctrl.getTaskSummary);
router.get('/recent-activity',   ctrl.getRecentActivity);
router.get('/upcoming-deadlines',ctrl.getUpcomingDeadlines);
module.exports = router;

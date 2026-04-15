// controllers/dashboardController.js
// Analytics & aggregated stats for the dashboard.

'use strict';

const db = require('../config/db');

// =============================================================================
// GET /api/dashboard/stats
// =============================================================================
const getStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    const projectFilter = isAdmin ? '1=1' : `(
      p.OWNER_ID = ${userId} OR EXISTS (
        SELECT 1 FROM PROJECT_MEMBERS pm WHERE pm.PROJECT_ID = p.PROJECT_ID AND pm.USER_ID = ${userId}
      )
    )`;

    const result = await db.execute(
      `SELECT
         (SELECT COUNT(*) FROM PROJECTS p WHERE ${projectFilter})                         AS TOTAL_PROJECTS,
         (SELECT COUNT(*) FROM PROJECTS p WHERE ${projectFilter} AND p.STATUS = 'active') AS ACTIVE_PROJECTS,
         (SELECT COUNT(*) FROM TASKS t
          WHERE  t.PROJECT_ID IN (SELECT PROJECT_ID FROM PROJECTS p WHERE ${projectFilter})) AS TOTAL_TASKS,
         (SELECT COUNT(*) FROM TASKS t
          WHERE  t.PROJECT_ID IN (SELECT PROJECT_ID FROM PROJECTS p WHERE ${projectFilter})
          AND    t.STATUS = 'done')                                                        AS DONE_TASKS,
         (SELECT COUNT(*) FROM TASKS t
          WHERE  t.ASSIGNED_TO = :userId AND t.STATUS NOT IN ('done','cancelled'))         AS MY_OPEN_TASKS,
         (SELECT COUNT(DISTINCT USER_ID) FROM PROJECT_MEMBERS
          WHERE  PROJECT_ID IN (SELECT PROJECT_ID FROM PROJECTS p WHERE ${projectFilter})) AS TEAM_SIZE,
         (SELECT COUNT(*) FROM TASKS t
          WHERE  t.PROJECT_ID IN (SELECT PROJECT_ID FROM PROJECTS p WHERE ${projectFilter})
          AND    t.DUE_DATE < SYSDATE AND t.STATUS NOT IN ('done','cancelled'))            AS OVERDUE_TASKS
       FROM DUAL`,
      { userId },
      { autoCommit: true }
    );

    const row = result.rows[0];
    const completionPct = row.TOTAL_TASKS > 0
      ? Math.round((row.DONE_TASKS / row.TOTAL_TASKS) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        totalProjects:   row.TOTAL_PROJECTS,
        activeProjects:  row.ACTIVE_PROJECTS,
        totalTasks:      row.TOTAL_TASKS,
        doneTasks:       row.DONE_TASKS,
        myOpenTasks:     row.MY_OPEN_TASKS,
        teamSize:        row.TEAM_SIZE,
        overdueTasks:    row.OVERDUE_TASKS,
        completionPct,
      },
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/dashboard/project-overview
// =============================================================================
const getProjectOverview = async (req, res, next) => {
  try {
    const userId  = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    let where = isAdmin
      ? '1=1'
      : `(p.OWNER_ID = :userId OR EXISTS (
          SELECT 1 FROM PROJECT_MEMBERS pm WHERE pm.PROJECT_ID = p.PROJECT_ID AND pm.USER_ID = :userId2
        ))`;

    const binds = isAdmin ? {} : { userId, userId2: userId };

    const result = await db.execute(
      `SELECT * FROM V_PROJECT_SUMMARY p
       WHERE  ${where}
         AND  p.STATUS NOT IN ('cancelled')
       ORDER  BY p.STATUS, p.UPDATED_AT DESC
       FETCH  FIRST 20 ROWS ONLY`,
      binds,
      { autoCommit: true }
    );

    res.json({
      success: true,
      data: result.rows.map(r => ({
        projectId:   r.PROJECT_ID,
        name:        r.NAME,
        status:      r.STATUS,
        priority:    r.PRIORITY,
        progress:    r.PROGRESS,
        color:       r.COLOR,
        endDate:     r.END_DATE,
        isOverdue:   r.IS_OVERDUE === 1,
        totalTasks:  r.TOTAL_TASKS,
        doneTasks:   r.DONE_TASKS,
        memberCount: r.MEMBER_COUNT,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/dashboard/task-summary
// =============================================================================
const getTaskSummary = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await db.execute(
      `SELECT STATUS, COUNT(*) AS CNT
       FROM   TASKS
       WHERE  PROJECT_ID IN (
         SELECT PROJECT_ID FROM PROJECT_MEMBERS WHERE USER_ID = :userId
         UNION
         SELECT PROJECT_ID FROM PROJECTS WHERE OWNER_ID = :userId2
       )
       GROUP  BY STATUS`,
      { userId, userId2: userId },
      { autoCommit: true }
    );

    const summary = { todo: 0, in_progress: 0, review: 0, done: 0, cancelled: 0 };
    result.rows.forEach(r => { summary[r.STATUS] = r.CNT; });

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/dashboard/recent-activity
// =============================================================================
const getRecentActivity = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const limit  = Math.min(50, parseInt(req.query.limit || 20));

    const result = await db.execute(
      `SELECT al.LOG_ID, al.ACTION, al.ENTITY_TYPE, al.DESCRIPTION, al.CREATED_AT,
              u.USERNAME, u.FULL_NAME, u.AVATAR_URL,
              p.NAME AS PROJECT_NAME
       FROM   ACTIVITY_LOGS al
       JOIN   USERS    u ON u.USER_ID    = al.USER_ID
       LEFT JOIN PROJECTS p ON p.PROJECT_ID = al.PROJECT_ID
       WHERE  al.PROJECT_ID IN (
         SELECT PROJECT_ID FROM PROJECT_MEMBERS WHERE USER_ID = :userId
         UNION
         SELECT PROJECT_ID FROM PROJECTS WHERE OWNER_ID = :userId2
       )
       ORDER  BY al.CREATED_AT DESC
       FETCH  FIRST :limit ROWS ONLY`,
      { userId, userId2: userId, limit },
      { autoCommit: true }
    );

    res.json({
      success: true,
      data: result.rows.map(r => ({
        logId:       r.LOG_ID,
        action:      r.ACTION,
        entityType:  r.ENTITY_TYPE,
        description: r.DESCRIPTION,
        createdAt:   r.CREATED_AT,
        projectName: r.PROJECT_NAME,
        user: { username: r.USERNAME, fullName: r.FULL_NAME, avatarUrl: r.AVATAR_URL },
      })),
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/dashboard/upcoming-deadlines
// =============================================================================
const getUpcomingDeadlines = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const days   = parseInt(req.query.days || 7);

    const result = await db.execute(
      `SELECT t.TASK_ID, t.TITLE, t.DUE_DATE, t.STATUS, t.PRIORITY,
              p.NAME AS PROJECT_NAME, p.COLOR AS PROJECT_COLOR,
              u.USERNAME AS ASSIGNEE_USERNAME, u.FULL_NAME AS ASSIGNEE_FULL_NAME
       FROM   TASKS t
       JOIN   PROJECTS p ON p.PROJECT_ID = t.PROJECT_ID
       LEFT JOIN USERS u ON u.USER_ID = t.ASSIGNED_TO
       WHERE  (t.ASSIGNED_TO = :userId OR t.PROJECT_ID IN (
                 SELECT PROJECT_ID FROM PROJECTS WHERE OWNER_ID = :userId2
               ))
         AND  t.DUE_DATE BETWEEN SYSDATE AND SYSDATE + :days
         AND  t.STATUS NOT IN ('done','cancelled')
       ORDER  BY t.DUE_DATE`,
      { userId, userId2: userId, days },
      { autoCommit: true }
    );

    res.json({
      success: true,
      data: result.rows.map(r => ({
        taskId:       r.TASK_ID,
        title:        r.TITLE,
        dueDate:      r.DUE_DATE,
        status:       r.STATUS,
        priority:     r.PRIORITY,
        projectName:  r.PROJECT_NAME,
        projectColor: r.PROJECT_COLOR,
        assignee:     r.ASSIGNEE_USERNAME ? {
          username: r.ASSIGNEE_USERNAME,
          fullName: r.ASSIGNEE_FULL_NAME,
        } : null,
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getProjectOverview, getTaskSummary, getRecentActivity, getUpcomingDeadlines };


// =============================================================================
// controllers/memberController.js — inline export below
// =============================================================================

// =============================================================================
// controllers/notificationController.js — inline below
// =============================================================================

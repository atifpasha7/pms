// controllers/projectController.js
// Full project lifecycle: CRUD · milestones · members · activity feed.
// Uses V_PROJECT_SUMMARY view for efficient listing queries.

'use strict';

const db = require('../config/db');
const { createHttpError } = require('../middleware/errorHandler');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Log an activity row via the stored procedure */
const logActivity = async (binds) => {
  await db.execute(
    `BEGIN sp_log_activity(
       :userId, :projectId, :taskId, :action, :entityType,
       :entityId, :oldValue, :newValue, :description
     ); END;`,
    {
      userId:      binds.userId,
      projectId:   binds.projectId  || null,
      taskId:      binds.taskId     || null,
      action:      binds.action,
      entityType:  binds.entityType,
      entityId:    binds.entityId,
      oldValue:    binds.oldValue   || null,
      newValue:    binds.newValue   || null,
      description: binds.description || null,
    },
    { autoCommit: true }
  );
};

/** Map a V_PROJECT_SUMMARY row to camelCase response shape */
const mapProjectRow = (r) => ({
  projectId:            r.PROJECT_ID,
  name:                 r.NAME,
  description:          r.DESCRIPTION,
  status:               r.STATUS,
  priority:             r.PRIORITY,
  startDate:            r.START_DATE,
  endDate:              r.END_DATE,
  budget:               r.BUDGET,
  progress:             r.PROGRESS,
  color:                r.COLOR,
  createdAt:            r.CREATED_AT,
  updatedAt:            r.UPDATED_AT,
  isOverdue:            r.IS_OVERDUE === 1,
  owner: {
    userId:    r.OWNER_ID,
    username:  r.OWNER_USERNAME,
    fullName:  r.OWNER_FULL_NAME,
    avatarUrl: r.OWNER_AVATAR_URL,
  },
  stats: {
    memberCount:          r.MEMBER_COUNT,
    totalTasks:           r.TOTAL_TASKS,
    doneTasks:            r.DONE_TASKS,
    inProgressTasks:      r.IN_PROGRESS_TASKS,
    todoTasks:            r.TODO_TASKS,
    milestoneCount:       r.MILESTONE_COUNT,
    completedMilestones:  r.COMPLETED_MILESTONES,
  },
});

// =============================================================================
// GET /api/projects
// List projects the caller owns or is a member of.
// Query: status · priority · search · page · limit
// =============================================================================
const getAllProjects = async (req, res, next) => {
  try {
    const { status, priority, search, page = 1, limit = 20 } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * pageSize;

    let where = 'WHERE (p.OWNER_ID = :userId OR EXISTS (\n' +
                '  SELECT 1 FROM PROJECT_MEMBERS pm\n' +
                '  WHERE pm.PROJECT_ID = p.PROJECT_ID AND pm.USER_ID = :userId2\n' +
                '))';
    const binds = { userId: req.user.userId, userId2: req.user.userId };

    if (status) {
      where         += ' AND p.STATUS = :status';
      binds.status   = status;
    }
    if (priority) {
      where         += ' AND p.PRIORITY = :priority';
      binds.priority = priority;
    }
    if (search) {
      where        += ' AND LOWER(p.NAME) LIKE :search';
      binds.search  = `%${search.toLowerCase()}%`;
    }

    // Admin sees all projects
    if (req.user.role === 'admin') {
      where = 'WHERE 1=1';
      delete binds.userId;
      delete binds.userId2;
      if (status)   { where += ' AND p.STATUS = :status';     binds.status   = status; }
      if (priority) { where += ' AND p.PRIORITY = :priority'; binds.priority = priority; }
      if (search)   { where += ' AND LOWER(p.NAME) LIKE :search'; binds.search = `%${search.toLowerCase()}%`; }
    }

    // Count total for pagination
    const countResult = await db.execute(
      `SELECT COUNT(*) AS CNT FROM PROJECTS p ${where}`,
      binds,
      { autoCommit: true }
    );
    const total = countResult.rows[0].CNT;

    // Paginated data from view
    const result = await db.execute(
      `SELECT * FROM V_PROJECT_SUMMARY p
       ${where}
       ORDER  BY p.UPDATED_AT DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { ...binds, offset, limit: pageSize },
      { autoCommit: true }
    );

    res.json({
      success: true,
      data:    result.rows.map(mapProjectRow),
      pagination: {
        total,
        page:      pageNum,
        limit:     pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/projects/:id
// =============================================================================
const getProjectById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const result = await db.execute(
      `SELECT * FROM V_PROJECT_SUMMARY p WHERE p.PROJECT_ID = :id`,
      { id },
      { autoCommit: true }
    );

    if (!result.rows.length) throw createHttpError(404, 'Project not found.', 'NOT_FOUND');

    // Verify caller is a member (or admin)
    if (req.user.role !== 'admin') {
      const memberCheck = await db.execute(
        `SELECT 1 FROM PROJECT_MEMBERS WHERE PROJECT_ID = :id AND USER_ID = :uid`,
        { id, uid: req.user.userId },
        { autoCommit: true }
      );
      if (!memberCheck.rows.length) throw createHttpError(403, 'You are not a member of this project.', 'NOT_A_MEMBER');
    }

    // Members list
    const membersResult = await db.execute(
      `SELECT pm.MEMBER_ID, pm.ROLE, pm.JOINED_AT,
              u.USER_ID, u.USERNAME, u.FULL_NAME, u.EMAIL, u.AVATAR_URL
       FROM   PROJECT_MEMBERS pm
       JOIN   USERS u ON u.USER_ID = pm.USER_ID
       WHERE  pm.PROJECT_ID = :id
       ORDER  BY pm.JOINED_AT`,
      { id },
      { autoCommit: true }
    );

    res.json({
      success: true,
      data: {
        ...mapProjectRow(result.rows[0]),
        members: membersResult.rows.map(m => ({
          memberId:  m.MEMBER_ID,
          role:      m.ROLE,
          joinedAt:  m.JOINED_AT,
          userId:    m.USER_ID,
          username:  m.USERNAME,
          fullName:  m.FULL_NAME,
          email:     m.EMAIL,
          avatarUrl: m.AVATAR_URL,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// POST /api/projects
// =============================================================================
const createProject = async (req, res, next) => {
  try {
    const { name, description, status, priority, startDate, endDate, budget, color } = req.body;

    const result = await db.execute(
      `INSERT INTO PROJECTS (NAME, DESCRIPTION, STATUS, PRIORITY, START_DATE, END_DATE, OWNER_ID, BUDGET, COLOR)
       VALUES (:name, :description, :status, :priority,
               TO_DATE(:startDate, 'YYYY-MM-DD'), TO_DATE(:endDate, 'YYYY-MM-DD'),
               :ownerId, :budget, :color)
       RETURNING PROJECT_ID INTO :projectId`,
      {
        name,
        description: description || null,
        status:      status      || 'planning',
        priority:    priority    || 'medium',
        startDate:   startDate   || null,
        endDate:     endDate     || null,
        ownerId:     req.user.userId,
        budget:      budget      || 0,
        color:       color       || '#00D4FF',
        projectId:   { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
      },
      { autoCommit: true }
    );

    const projectId = result.outBinds.projectId[0];

    await logActivity({
      userId:      req.user.userId,
      projectId,
      action:      'CREATE',
      entityType:  'PROJECT',
      entityId:    projectId,
      description: `Created project "${name}"`,
    });

    // Return the full project from view
    const project = await db.execute(
      `SELECT * FROM V_PROJECT_SUMMARY p WHERE p.PROJECT_ID = :id`,
      { id: projectId },
      { autoCommit: true }
    );

    res.status(201).json({
      success: true,
      message: 'Project created.',
      data:    mapProjectRow(project.rows[0]),
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PUT /api/projects/:id
// Partial update using NVL pattern — only provided fields are changed.
// =============================================================================
const updateProject = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, description, status, priority, startDate, endDate, budget, color } = req.body;

    // Fetch current values for activity log diff
    const current = await db.execute(
      `SELECT STATUS FROM PROJECTS WHERE PROJECT_ID = :id`,
      { id },
      { autoCommit: true }
    );
    if (!current.rows.length) throw createHttpError(404, 'Project not found.', 'NOT_FOUND');
    const oldStatus = current.rows[0].STATUS;

    const result = await db.execute(
      `UPDATE PROJECTS
       SET    NAME        = NVL(:name,         NAME),
              DESCRIPTION = NVL(:description,  DESCRIPTION),
              STATUS      = NVL(:status,        STATUS),
              PRIORITY    = NVL(:priority,      PRIORITY),
              START_DATE  = CASE WHEN :startDate2 IS NOT NULL
                                 THEN TO_DATE(:startDate3, 'YYYY-MM-DD')
                                 ELSE START_DATE END,
              END_DATE    = CASE WHEN :endDate2 IS NOT NULL
                                 THEN TO_DATE(:endDate3, 'YYYY-MM-DD')
                                 ELSE END_DATE END,
              BUDGET      = NVL(:budget,        BUDGET),
              COLOR       = NVL(:color,         COLOR)
       WHERE  PROJECT_ID  = :id`,
      {
        name:        name        || null,
        description: description !== undefined ? description : null,
        status:      status      || null,
        priority:    priority    || null,
        startDate2:  startDate   || null,
        startDate3:  startDate   || null,
        endDate2:    endDate     || null,
        endDate3:    endDate     || null,
        budget:      budget      !== undefined ? budget : null,
        color:       color       || null,
        id,
      },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) throw createHttpError(404, 'Project not found.', 'NOT_FOUND');

    if (status && status !== oldStatus) {
      await logActivity({
        userId: req.user.userId, projectId: id,
        action: 'STATUS_CHANGE', entityType: 'PROJECT', entityId: id,
        oldValue: oldStatus, newValue: status,
        description: `Changed project status from "${oldStatus}" to "${status}"`,
      });
    } else {
      await logActivity({
        userId: req.user.userId, projectId: id,
        action: 'UPDATE', entityType: 'PROJECT', entityId: id,
        description: `Updated project details`,
      });
    }

    const updated = await db.execute(
      `SELECT * FROM V_PROJECT_SUMMARY p WHERE p.PROJECT_ID = :id`,
      { id },
      { autoCommit: true }
    );

    res.json({ success: true, message: 'Project updated.', data: mapProjectRow(updated.rows[0]) });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// DELETE /api/projects/:id
// =============================================================================
const deleteProject = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    // Verify ownership (or admin)
    if (req.user.role !== 'admin') {
      const check = await db.execute(
        `SELECT OWNER_ID FROM PROJECTS WHERE PROJECT_ID = :id`,
        { id },
        { autoCommit: true }
      );
      if (!check.rows.length) throw createHttpError(404, 'Project not found.', 'NOT_FOUND');
      if (check.rows[0].OWNER_ID !== req.user.userId) {
        throw createHttpError(403, 'Only the project owner can delete this project.', 'FORBIDDEN');
      }
    }

    await db.execute(
      `DELETE FROM PROJECTS WHERE PROJECT_ID = :id`,
      { id },
      { autoCommit: true }
    );

    res.json({ success: true, message: 'Project deleted. All related data removed.' });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// MILESTONES
// =============================================================================

const getMilestones = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);

    const result = await db.execute(
      `SELECT m.MILESTONE_ID, m.TITLE, m.DESCRIPTION, m.DUE_DATE, m.STATUS,
              m.CREATED_AT, m.UPDATED_AT,
              u.USERNAME AS CREATOR_USERNAME, u.FULL_NAME AS CREATOR_FULL_NAME,
              (SELECT COUNT(*) FROM TASKS t WHERE t.MILESTONE_ID = m.MILESTONE_ID)                         AS TOTAL_TASKS,
              (SELECT COUNT(*) FROM TASKS t WHERE t.MILESTONE_ID = m.MILESTONE_ID AND t.STATUS = 'done')   AS DONE_TASKS
       FROM   MILESTONES m
       JOIN   USERS u ON u.USER_ID = m.CREATED_BY
       WHERE  m.PROJECT_ID = :projectId
       ORDER  BY m.DUE_DATE NULLS LAST, m.CREATED_AT`,
      { projectId },
      { autoCommit: true }
    );

    res.json({
      success: true,
      data: result.rows.map(m => ({
        milestoneId:  m.MILESTONE_ID,
        title:        m.TITLE,
        description:  m.DESCRIPTION,
        dueDate:      m.DUE_DATE,
        status:       m.STATUS,
        createdAt:    m.CREATED_AT,
        updatedAt:    m.UPDATED_AT,
        createdBy:    { username: m.CREATOR_USERNAME, fullName: m.CREATOR_FULL_NAME },
        totalTasks:   m.TOTAL_TASKS,
        doneTasks:    m.DONE_TASKS,
        progress:     m.TOTAL_TASKS > 0 ? Math.round((m.DONE_TASKS / m.TOTAL_TASKS) * 100) : 0,
      })),
    });
  } catch (err) {
    next(err);
  }
};

const createMilestone = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const { title, description, dueDate, status } = req.body;

    const result = await db.execute(
      `INSERT INTO MILESTONES (PROJECT_ID, TITLE, DESCRIPTION, DUE_DATE, STATUS, CREATED_BY)
       VALUES (:projectId, :title, :description, TO_DATE(:dueDate, 'YYYY-MM-DD'), :status, :createdBy)
       RETURNING MILESTONE_ID INTO :milestoneId`,
      {
        projectId,
        title,
        description: description || null,
        dueDate:     dueDate     || null,
        status:      status      || 'pending',
        createdBy:   req.user.userId,
        milestoneId: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
      },
      { autoCommit: true }
    );

    const milestoneId = result.outBinds.milestoneId[0];

    await logActivity({
      userId: req.user.userId, projectId,
      action: 'CREATE', entityType: 'MILESTONE', entityId: milestoneId,
      description: `Created milestone "${title}"`,
    });

    res.status(201).json({ success: true, message: 'Milestone created.', milestoneId });
  } catch (err) {
    next(err);
  }
};

const updateMilestone = async (req, res, next) => {
  try {
    const milestoneId = Number(req.params.mid);
    const { title, description, dueDate, status } = req.body;

    const result = await db.execute(
      `UPDATE MILESTONES
       SET    TITLE       = NVL(:title,       TITLE),
              DESCRIPTION = NVL(:description, DESCRIPTION),
              DUE_DATE    = CASE WHEN :dueDate2 IS NOT NULL THEN TO_DATE(:dueDate3,'YYYY-MM-DD') ELSE DUE_DATE END,
              STATUS      = NVL(:status,      STATUS)
       WHERE  MILESTONE_ID = :milestoneId`,
      {
        title:       title       || null,
        description: description !== undefined ? description : null,
        dueDate2:    dueDate     || null,
        dueDate3:    dueDate     || null,
        status:      status      || null,
        milestoneId,
      },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) throw createHttpError(404, 'Milestone not found.', 'NOT_FOUND');

    res.json({ success: true, message: 'Milestone updated.' });
  } catch (err) {
    next(err);
  }
};

const deleteMilestone = async (req, res, next) => {
  try {
    const milestoneId = Number(req.params.mid);

    const result = await db.execute(
      `DELETE FROM MILESTONES WHERE MILESTONE_ID = :milestoneId`,
      { milestoneId },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) throw createHttpError(404, 'Milestone not found.', 'NOT_FOUND');

    res.json({ success: true, message: 'Milestone deleted. Associated tasks are now milestone-less.' });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/projects/:id/activity
// =============================================================================
const getActivity = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const limit     = Math.min(100, parseInt(req.query.limit || 50));

    const result = await db.execute(
      `SELECT al.LOG_ID, al.ACTION, al.ENTITY_TYPE, al.ENTITY_ID,
              al.OLD_VALUE, al.NEW_VALUE, al.DESCRIPTION, al.CREATED_AT,
              u.USERNAME, u.FULL_NAME, u.AVATAR_URL
       FROM   ACTIVITY_LOGS al
       JOIN   USERS u ON u.USER_ID = al.USER_ID
       WHERE  al.PROJECT_ID = :projectId
       ORDER  BY al.CREATED_AT DESC
       FETCH  FIRST :limit ROWS ONLY`,
      { projectId, limit },
      { autoCommit: true }
    );

    res.json({
      success: true,
      data: result.rows.map(r => ({
        logId:       r.LOG_ID,
        action:      r.ACTION,
        entityType:  r.ENTITY_TYPE,
        entityId:    r.ENTITY_ID,
        oldValue:    r.OLD_VALUE,
        newValue:    r.NEW_VALUE,
        description: r.DESCRIPTION,
        createdAt:   r.CREATED_AT,
        user: { username: r.USERNAME, fullName: r.FULL_NAME, avatarUrl: r.AVATAR_URL },
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getActivity,
};

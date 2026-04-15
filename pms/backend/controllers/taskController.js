// controllers/taskController.js
// Task lifecycle · Kanban status patch · Comments thread · My-tasks inbox

'use strict';

const oracledb = require('oracledb');
const db       = require('../config/db');
const { createHttpError } = require('../middleware/errorHandler');

// ─── Activity + notification helpers ─────────────────────────────────────────

const logActivity = async (binds) => {
  await db.execute(
    `BEGIN sp_log_activity(:userId,:projectId,:taskId,:action,:entityType,
       :entityId,:oldValue,:newValue,:description); END;`,
    {
      userId:     binds.userId,
      projectId:  binds.projectId  || null,
      taskId:     binds.taskId     || null,
      action:     binds.action,
      entityType: binds.entityType,
      entityId:   binds.entityId,
      oldValue:   binds.oldValue   || null,
      newValue:   binds.newValue   || null,
      description:binds.description|| null,
    },
    { autoCommit: true }
  );
};

const createNotif = async (binds) => {
  await db.execute(
    `BEGIN sp_create_notification(:userId,:type,:title,:message,:relatedType,:relatedId); END;`,
    {
      userId:      binds.userId,
      type:        binds.type,
      title:       binds.title,
      message:     binds.message      || null,
      relatedType: binds.relatedType  || null,
      relatedId:   binds.relatedId    || null,
    },
    { autoCommit: true }
  );
};

/** Map a V_TASK_DETAIL row to camelCase response */
const mapTaskRow = (r) => ({
  taskId:          r.TASK_ID,
  projectId:       r.PROJECT_ID,
  milestoneId:     r.MILESTONE_ID,
  title:           r.TITLE,
  description:     r.DESCRIPTION,
  status:          r.STATUS,
  priority:        r.PRIORITY,
  dueDate:         r.DUE_DATE,
  estimatedHours:  r.ESTIMATED_HOURS,
  actualHours:     r.ACTUAL_HOURS,
  tags:            r.TAGS ? r.TAGS.split(',').map(t => t.trim()) : [],
  sortOrder:       r.SORT_ORDER,
  createdAt:       r.CREATED_AT,
  updatedAt:       r.UPDATED_AT,
  isOverdue:       r.IS_OVERDUE === 1,
  commentCount:    r.COMMENT_COUNT,
  assignee:        r.ASSIGNED_TO ? {
    userId:    r.ASSIGNED_TO,
    username:  r.ASSIGNEE_USERNAME,
    fullName:  r.ASSIGNEE_FULL_NAME,
    avatarUrl: r.ASSIGNEE_AVATAR_URL,
  } : null,
  createdBy: {
    userId:   r.CREATED_BY,
    username: r.CREATOR_USERNAME,
    fullName: r.CREATOR_FULL_NAME,
  },
  project: {
    projectId: r.PROJECT_ID,
    name:      r.PROJECT_NAME,
    color:     r.PROJECT_COLOR,
  },
  milestone: r.MILESTONE_ID ? {
    milestoneId: r.MILESTONE_ID,
    title:       r.MILESTONE_TITLE,
    status:      r.MILESTONE_STATUS,
    dueDate:     r.MILESTONE_DUE_DATE,
  } : null,
});

// =============================================================================
// GET /api/projects/:projectId/tasks
// Query: status · priority · assignedTo · milestoneId · search · page · limit
// =============================================================================
const getTasksByProject = async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    const { status, priority, assignedTo, milestoneId, search, page = 1, limit = 100 } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(200, parseInt(limit));
    const offset   = (pageNum - 1) * pageSize;

    let where  = 'WHERE t.PROJECT_ID = :projectId';
    const binds = { projectId };

    if (status)      { where += ' AND t.STATUS      = :status';      binds.status      = status; }
    if (priority)    { where += ' AND t.PRIORITY    = :priority';    binds.priority    = priority; }
    if (assignedTo)  { where += ' AND t.ASSIGNED_TO = :assignedTo';  binds.assignedTo  = Number(assignedTo); }
    if (milestoneId) { where += ' AND t.MILESTONE_ID= :milestoneId'; binds.milestoneId = Number(milestoneId); }
    if (search)      { where += ' AND LOWER(t.TITLE) LIKE :search';  binds.search      = `%${search.toLowerCase()}%`; }

    const total = await db.execute(
      `SELECT COUNT(*) AS CNT FROM TASKS t ${where}`,
      binds,
      { autoCommit: true }
    );

    const result = await db.execute(
      `SELECT * FROM V_TASK_DETAIL t
       ${where}
       ORDER  BY t.SORT_ORDER, t.CREATED_AT
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { ...binds, offset, limit: pageSize },
      { autoCommit: true }
    );

    res.json({
      success: true,
      data:    result.rows.map(mapTaskRow),
      pagination: {
        total:      total.rows[0].CNT,
        page:       pageNum,
        limit:      pageSize,
        totalPages: Math.ceil(total.rows[0].CNT / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/tasks/my-tasks
// Tasks assigned to the current user across all their projects.
// =============================================================================
const getMyTasks = async (req, res, next) => {
  try {
    const { status, priority, page = 1, limit = 50 } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * pageSize;

    let where  = 'WHERE t.ASSIGNED_TO = :userId';
    const binds = { userId: req.user.userId };

    if (status)   { where += ' AND t.STATUS   = :status';   binds.status   = status; }
    if (priority) { where += ' AND t.PRIORITY = :priority'; binds.priority = priority; }

    const result = await db.execute(
      `SELECT * FROM V_TASK_DETAIL t
       ${where}
       ORDER BY t.DUE_DATE NULLS LAST, t.PRIORITY DESC, t.CREATED_AT
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { ...binds, offset, limit: pageSize },
      { autoCommit: true }
    );

    res.json({ success: true, data: result.rows.map(mapTaskRow) });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET /api/tasks/:id
// Full task detail including comments thread.
// =============================================================================
const getTaskById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const result = await db.execute(
      `SELECT * FROM V_TASK_DETAIL t WHERE t.TASK_ID = :id`,
      { id },
      { autoCommit: true }
    );

    if (!result.rows.length) throw createHttpError(404, 'Task not found.', 'NOT_FOUND');

    // Comments thread
    const comments = await db.execute(
      `SELECT c.COMMENT_ID, c.CONTENT, c.CREATED_AT, c.UPDATED_AT,
              u.USER_ID, u.USERNAME, u.FULL_NAME, u.AVATAR_URL
       FROM   COMMENTS c
       JOIN   USERS    u ON u.USER_ID = c.USER_ID
       WHERE  c.TASK_ID = :taskId
       ORDER  BY c.CREATED_AT`,
      { taskId: id },
      { autoCommit: true }
    );

    // Dependencies
    const deps = await db.execute(
      `SELECT td.DEPENDS_ON_ID, t2.TITLE, t2.STATUS
       FROM   TASK_DEPENDENCIES td
       JOIN   TASKS t2 ON t2.TASK_ID = td.DEPENDS_ON_ID
       WHERE  td.TASK_ID = :taskId`,
      { taskId: id },
      { autoCommit: true }
    );

    res.json({
      success: true,
      data: {
        ...mapTaskRow(result.rows[0]),
        comments: comments.rows.map(c => ({
          commentId: c.COMMENT_ID,
          content:   c.CONTENT,
          createdAt: c.CREATED_AT,
          updatedAt: c.UPDATED_AT,
          author: {
            userId:    c.USER_ID,
            username:  c.USERNAME,
            fullName:  c.FULL_NAME,
            avatarUrl: c.AVATAR_URL,
          },
        })),
        dependencies: deps.rows.map(d => ({
          taskId:  d.DEPENDS_ON_ID,
          title:   d.TITLE,
          status:  d.STATUS,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// POST /api/projects/:projectId/tasks
// =============================================================================
const createTask = async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    const {
      title, description, status, priority,
      assignedTo, dueDate, estimatedHours, milestoneId, tags, sortOrder,
    } = req.body;

    const result = await db.execute(
      `INSERT INTO TASKS
         (PROJECT_ID, MILESTONE_ID, TITLE, DESCRIPTION, STATUS, PRIORITY,
          ASSIGNED_TO, CREATED_BY, DUE_DATE, ESTIMATED_HOURS, TAGS, SORT_ORDER)
       VALUES
         (:projectId, :milestoneId, :title, :description, :status, :priority,
          :assignedTo, :createdBy, TO_DATE(:dueDate,'YYYY-MM-DD'),
          :estimatedHours, :tags, :sortOrder)
       RETURNING TASK_ID INTO :taskId`,
      {
        projectId,
        milestoneId:    milestoneId    || null,
        title,
        description:    description    || null,
        status:         status         || 'todo',
        priority:       priority       || 'medium',
        assignedTo:     assignedTo     || null,
        createdBy:      req.user.userId,
        dueDate:        dueDate        || null,
        estimatedHours: estimatedHours || 0,
        tags:           Array.isArray(tags) ? tags.join(',') : (tags || null),
        sortOrder:      sortOrder      || 0,
        taskId:         { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );

    const taskId = result.outBinds.taskId[0];

    // Log + notify assignee
    await logActivity({
      userId: req.user.userId, projectId, taskId,
      action: 'CREATE', entityType: 'TASK', entityId: taskId,
      description: `Created task "${title}"`,
    });

    if (assignedTo && assignedTo !== req.user.userId) {
      await createNotif({
        userId:      assignedTo,
        type:        'task_assigned',
        title:       'New Task Assigned',
        message:     `You have been assigned "${title}".`,
        relatedType: 'TASK',
        relatedId:   taskId,
      });
    }

    // Return full task
    const task = await db.execute(
      `SELECT * FROM V_TASK_DETAIL t WHERE t.TASK_ID = :id`,
      { id: taskId },
      { autoCommit: true }
    );

    res.status(201).json({ success: true, message: 'Task created.', data: mapTaskRow(task.rows[0]) });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PUT /api/tasks/:id  — full partial update
// =============================================================================
const updateTask = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      title, description, status, priority,
      assignedTo, dueDate, estimatedHours, actualHours, milestoneId, tags, sortOrder,
    } = req.body;

    // Get old values for activity log
    const current = await db.execute(
      `SELECT PROJECT_ID, STATUS, ASSIGNED_TO FROM TASKS WHERE TASK_ID = :id`,
      { id },
      { autoCommit: true }
    );
    if (!current.rows.length) throw createHttpError(404, 'Task not found.', 'NOT_FOUND');
    const { PROJECT_ID: projectId, STATUS: oldStatus, ASSIGNED_TO: oldAssignee } = current.rows[0];

    await db.execute(
      `UPDATE TASKS
       SET    TITLE           = NVL(:title,          TITLE),
              DESCRIPTION     = NVL(:description,    DESCRIPTION),
              STATUS          = NVL(:status,          STATUS),
              PRIORITY        = NVL(:priority,        PRIORITY),
              ASSIGNED_TO     = CASE WHEN :assignedTo2 IS NOT NULL THEN :assignedTo3 ELSE ASSIGNED_TO END,
              DUE_DATE        = CASE WHEN :dueDate2   IS NOT NULL THEN TO_DATE(:dueDate3,'YYYY-MM-DD') ELSE DUE_DATE END,
              ESTIMATED_HOURS = NVL(:estimatedHours,  ESTIMATED_HOURS),
              ACTUAL_HOURS    = NVL(:actualHours,     ACTUAL_HOURS),
              MILESTONE_ID    = CASE WHEN :milestoneId2 IS NOT NULL THEN :milestoneId3 ELSE MILESTONE_ID END,
              TAGS            = NVL(:tags,             TAGS),
              SORT_ORDER      = NVL(:sortOrder,        SORT_ORDER)
       WHERE  TASK_ID = :id`,
      {
        title:          title          || null,
        description:    description    !== undefined ? description : null,
        status:         status         || null,
        priority:       priority       || null,
        assignedTo2:    assignedTo     !== undefined ? String(assignedTo) : null,
        assignedTo3:    assignedTo     || null,
        dueDate2:       dueDate        || null,
        dueDate3:       dueDate        || null,
        estimatedHours: estimatedHours !== undefined ? estimatedHours : null,
        actualHours:    actualHours    !== undefined ? actualHours    : null,
        milestoneId2:   milestoneId    !== undefined ? String(milestoneId) : null,
        milestoneId3:   milestoneId    || null,
        tags:           Array.isArray(tags) ? tags.join(',') : (tags || null),
        sortOrder:      sortOrder      !== undefined ? sortOrder : null,
        id,
      },
      { autoCommit: true }
    );

    if (status && status !== oldStatus) {
      await logActivity({
        userId: req.user.userId, projectId, taskId: id,
        action: 'STATUS_CHANGE', entityType: 'TASK', entityId: id,
        oldValue: oldStatus, newValue: status,
        description: `Changed task status from "${oldStatus}" to "${status}"`,
      });
    } else {
      await logActivity({
        userId: req.user.userId, projectId, taskId: id,
        action: 'UPDATE', entityType: 'TASK', entityId: id,
        description: `Updated task "${title || id}"`,
      });
    }

    // Notify new assignee if changed
    if (assignedTo && assignedTo !== oldAssignee && assignedTo !== req.user.userId) {
      const titleResult = await db.execute(
        `SELECT TITLE FROM TASKS WHERE TASK_ID = :id`, { id }, { autoCommit: true }
      );
      await createNotif({
        userId:      assignedTo,
        type:        'task_assigned',
        title:       'Task Assigned to You',
        message:     `You have been assigned "${titleResult.rows[0].TITLE}".`,
        relatedType: 'TASK',
        relatedId:   id,
      });
    }

    const updated = await db.execute(
      `SELECT * FROM V_TASK_DETAIL t WHERE t.TASK_ID = :id`, { id }, { autoCommit: true }
    );

    res.json({ success: true, message: 'Task updated.', data: mapTaskRow(updated.rows[0]) });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PATCH /api/tasks/:id/status  — Kanban drag-and-drop quick update
// =============================================================================
const updateTaskStatus = async (req, res, next) => {
  try {
    const id       = Number(req.params.id);
    const { status, sortOrder } = req.body;

    const current = await db.execute(
      `SELECT PROJECT_ID, STATUS FROM TASKS WHERE TASK_ID = :id`,
      { id },
      { autoCommit: true }
    );
    if (!current.rows.length) throw createHttpError(404, 'Task not found.', 'NOT_FOUND');

    const { PROJECT_ID: projectId, STATUS: oldStatus } = current.rows[0];

    await db.execute(
      `UPDATE TASKS
       SET    STATUS     = :status,
              SORT_ORDER = NVL(:sortOrder, SORT_ORDER)
       WHERE  TASK_ID    = :id`,
      { status, sortOrder: sortOrder || null, id },
      { autoCommit: true }
    );

    await logActivity({
      userId: req.user.userId, projectId, taskId: id,
      action: 'STATUS_CHANGE', entityType: 'TASK', entityId: id,
      oldValue: oldStatus, newValue: status,
      description: `Moved task to "${status}"`,
    });

    // Updated progress is auto-computed by trigger
    const progressResult = await db.execute(
      `SELECT PROGRESS FROM PROJECTS WHERE PROJECT_ID = :pid`,
      { pid: projectId },
      { autoCommit: true }
    );

    res.json({
      success:  true,
      message:  `Task status updated to "${status}".`,
      taskId:   id,
      status,
      projectProgress: progressResult.rows[0].PROGRESS,
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// DELETE /api/tasks/:id
// =============================================================================
const deleteTask = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const check = await db.execute(
      `SELECT PROJECT_ID, TITLE FROM TASKS WHERE TASK_ID = :id`,
      { id },
      { autoCommit: true }
    );
    if (!check.rows.length) throw createHttpError(404, 'Task not found.', 'NOT_FOUND');

    await db.execute(
      `DELETE FROM TASKS WHERE TASK_ID = :id`,
      { id },
      { autoCommit: true }
    );

    await logActivity({
      userId: req.user.userId, projectId: check.rows[0].PROJECT_ID,
      action: 'DELETE', entityType: 'TASK', entityId: id,
      description: `Deleted task "${check.rows[0].TITLE}"`,
    });

    res.json({ success: true, message: 'Task deleted.' });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// COMMENTS
// =============================================================================

const addComment = async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const { content } = req.body;

    // Verify task exists
    const task = await db.execute(
      `SELECT PROJECT_ID, TITLE, ASSIGNED_TO FROM TASKS WHERE TASK_ID = :id`,
      { id: taskId },
      { autoCommit: true }
    );
    if (!task.rows.length) throw createHttpError(404, 'Task not found.', 'NOT_FOUND');

    const result = await db.execute(
      `INSERT INTO COMMENTS (TASK_ID, USER_ID, CONTENT)
       VALUES (:taskId, :userId, :content)
       RETURNING COMMENT_ID, CREATED_AT INTO :commentId, :createdAt`,
      {
        taskId,
        userId:    req.user.userId,
        content,
        commentId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        createdAt: { dir: oracledb.BIND_OUT, type: oracledb.DATE   },
      },
      { autoCommit: true }
    );

    const { PROJECT_ID: projectId, TITLE: taskTitle, ASSIGNED_TO: assigneeId } = task.rows[0];

    await logActivity({
      userId: req.user.userId, projectId, taskId,
      action: 'COMMENT', entityType: 'COMMENT', entityId: result.outBinds.commentId[0],
      description: `Commented on task "${taskTitle}"`,
    });

    // Notify task assignee (if different from commenter)
    if (assigneeId && assigneeId !== req.user.userId) {
      await createNotif({
        userId:      assigneeId,
        type:        'comment',
        title:       'New Comment on Your Task',
        message:     `${req.user.fullName || req.user.username} commented on "${taskTitle}".`,
        relatedType: 'TASK',
        relatedId:   taskId,
      });
    }

    res.status(201).json({
      success:   true,
      message:   'Comment added.',
      commentId: result.outBinds.commentId[0],
      createdAt: result.outBinds.createdAt[0],
    });
  } catch (err) {
    next(err);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const commentId = Number(req.params.cid);
    const { content } = req.body;

    const check = await db.execute(
      `SELECT USER_ID FROM COMMENTS WHERE COMMENT_ID = :id`,
      { id: commentId },
      { autoCommit: true }
    );
    if (!check.rows.length) throw createHttpError(404, 'Comment not found.', 'NOT_FOUND');
    if (check.rows[0].USER_ID !== req.user.userId && req.user.role !== 'admin') {
      throw createHttpError(403, 'You can only edit your own comments.', 'FORBIDDEN');
    }

    await db.execute(
      `UPDATE COMMENTS SET CONTENT = :content WHERE COMMENT_ID = :id`,
      { content, id: commentId },
      { autoCommit: true }
    );

    res.json({ success: true, message: 'Comment updated.' });
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const commentId = Number(req.params.cid);

    const check = await db.execute(
      `SELECT USER_ID FROM COMMENTS WHERE COMMENT_ID = :id`,
      { id: commentId },
      { autoCommit: true }
    );
    if (!check.rows.length) throw createHttpError(404, 'Comment not found.', 'NOT_FOUND');
    if (check.rows[0].USER_ID !== req.user.userId && req.user.role !== 'admin') {
      throw createHttpError(403, 'You can only delete your own comments.', 'FORBIDDEN');
    }

    await db.execute(
      `DELETE FROM COMMENTS WHERE COMMENT_ID = :id`,
      { id: commentId },
      { autoCommit: true }
    );

    res.json({ success: true, message: 'Comment deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTasksByProject,
  getMyTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  addComment,
  updateComment,
  deleteComment,
};

// controllers/notificationController.js

'use strict';

const db = require('../config/db');
const { createHttpError } = require('../middleware/errorHandler');

const getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly, limit = 50 } = req.query;
    let where = 'WHERE USER_ID = :userId';
    const binds = { userId: req.user.userId };

    if (unreadOnly === 'true') where += ' AND IS_READ = 0';

    const result = await db.execute(
      `SELECT NOTIFICATION_ID, TYPE, TITLE, MESSAGE, IS_READ,
              RELATED_TYPE, RELATED_ID, CREATED_AT
       FROM   NOTIFICATIONS
       ${where}
       ORDER  BY CREATED_AT DESC
       FETCH  FIRST :limit ROWS ONLY`,
      { ...binds, limit: Number(limit) },
      { autoCommit: true }
    );

    const unreadCount = await db.execute(
      `SELECT COUNT(*) AS CNT FROM NOTIFICATIONS WHERE USER_ID = :uid AND IS_READ = 0`,
      { uid: req.user.userId },
      { autoCommit: true }
    );

    res.json({
      success: true,
      data: result.rows.map(n => ({
        notificationId: n.NOTIFICATION_ID,
        type:           n.TYPE,
        title:          n.TITLE,
        message:        n.MESSAGE,
        isRead:         n.IS_READ === 1,
        relatedType:    n.RELATED_TYPE,
        relatedId:      n.RELATED_ID,
        createdAt:      n.CREATED_AT,
      })),
      unreadCount: unreadCount.rows[0].CNT,
    });
  } catch (err) { next(err); }
};

const markRead = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await db.execute(
      `UPDATE NOTIFICATIONS SET IS_READ = 1 WHERE NOTIFICATION_ID = :id AND USER_ID = :uid`,
      { id, uid: req.user.userId },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) throw createHttpError(404, 'Notification not found.', 'NOT_FOUND');
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
  try {
    await db.execute(
      `UPDATE NOTIFICATIONS SET IS_READ = 1 WHERE USER_ID = :uid AND IS_READ = 0`,
      { uid: req.user.userId },
      { autoCommit: true }
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) { next(err); }
};

module.exports = { getNotifications, markRead, markAllRead };

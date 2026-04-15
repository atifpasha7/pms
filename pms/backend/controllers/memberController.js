// controllers/memberController.js

'use strict';

const db = require('../config/db');
const { createHttpError } = require('../middleware/errorHandler');

const getProjectMembers = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const result = await db.execute(
      `SELECT pm.MEMBER_ID, pm.ROLE, pm.JOINED_AT,
              u.USER_ID, u.USERNAME, u.FULL_NAME, u.EMAIL, u.AVATAR_URL
       FROM   PROJECT_MEMBERS pm
       JOIN   USERS u ON u.USER_ID = pm.USER_ID
       WHERE  pm.PROJECT_ID = :projectId
       ORDER  BY DECODE(pm.ROLE,'owner',1,'manager',2,'member',3,'viewer',4), pm.JOINED_AT`,
      { projectId },
      { autoCommit: true }
    );
    res.json({
      success: true,
      data: result.rows.map(m => ({
        memberId: m.MEMBER_ID, role: m.ROLE, joinedAt: m.JOINED_AT,
        userId: m.USER_ID, username: m.USERNAME, fullName: m.FULL_NAME,
        email: m.EMAIL, avatarUrl: m.AVATAR_URL,
      })),
    });
  } catch (err) { next(err); }
};

const addMember = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const { userId, role } = req.body;

    // Can't add someone already in the project
    const exists = await db.execute(
      `SELECT 1 FROM PROJECT_MEMBERS WHERE PROJECT_ID = :p AND USER_ID = :u`,
      { p: projectId, u: userId },
      { autoCommit: true }
    );
    if (exists.rows.length) throw createHttpError(409, 'User is already a project member.', 'ALREADY_MEMBER');

    const oracledb = require('oracledb');
    const result = await db.execute(
      `INSERT INTO PROJECT_MEMBERS (PROJECT_ID, USER_ID, ROLE) VALUES (:p, :u, :role)
       RETURNING MEMBER_ID INTO :memberId`,
      { p: projectId, u: userId, role: role || 'member',
        memberId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
      { autoCommit: true }
    );

    // Notify the added user
    await db.execute(
      `BEGIN sp_create_notification(:uid,'project_invite','Added to Project',
         'You have been added to a project as ' || :role || '.','PROJECT',:pid); END;`,
      { uid: userId, role: role || 'member', pid: projectId },
      { autoCommit: true }
    );

    res.status(201).json({ success: true, message: 'Member added.', memberId: result.outBinds.memberId[0] });
  } catch (err) { next(err); }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const userId    = Number(req.params.uid);
    const { role }  = req.body;

    // Protect the owner role
    if (role === 'owner') throw createHttpError(400, 'Cannot assign owner role via this endpoint.', 'INVALID_ROLE');

    const result = await db.execute(
      `UPDATE PROJECT_MEMBERS SET ROLE = :role WHERE PROJECT_ID = :p AND USER_ID = :u`,
      { role, p: projectId, u: userId },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) throw createHttpError(404, 'Member not found.', 'NOT_FOUND');
    res.json({ success: true, message: 'Member role updated.' });
  } catch (err) { next(err); }
};

const removeMember = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const userId    = Number(req.params.uid);

    // Cannot remove the owner
    const check = await db.execute(
      `SELECT ROLE FROM PROJECT_MEMBERS WHERE PROJECT_ID = :p AND USER_ID = :u`,
      { p: projectId, u: userId },
      { autoCommit: true }
    );
    if (!check.rows.length) throw createHttpError(404, 'Member not found.', 'NOT_FOUND');
    if (check.rows[0].ROLE === 'owner') {
      throw createHttpError(400, 'Cannot remove the project owner. Transfer ownership first.', 'CANNOT_REMOVE_OWNER');
    }

    await db.execute(
      `DELETE FROM PROJECT_MEMBERS WHERE PROJECT_ID = :p AND USER_ID = :u`,
      { p: projectId, u: userId },
      { autoCommit: true }
    );

    res.json({ success: true, message: 'Member removed.' });
  } catch (err) { next(err); }
};

module.exports = { getProjectMembers, addMember, updateMemberRole, removeMember };

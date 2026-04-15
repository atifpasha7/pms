-- =============================================================================
-- PROJECT MANAGEMENT SYSTEM — Oracle 23ai Free
-- schema.sql  |  Full DDL: Tables · Indexes · Views · Triggers · Sequences
-- Run as: pms_user connected to FREEPDB1
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP (drop in reverse FK order to avoid ORA-02449)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN
  FOR t IN (
    SELECT table_name FROM user_tables
    WHERE  table_name IN (
      'NOTIFICATIONS','ACTIVITY_LOGS','COMMENTS',
      'TASK_DEPENDENCIES','TASKS','MILESTONES',
      'PROJECT_MEMBERS','PROJECTS','USERS'
    )
    ORDER BY CASE table_name
      WHEN 'NOTIFICATIONS'     THEN 1
      WHEN 'ACTIVITY_LOGS'     THEN 2
      WHEN 'COMMENTS'          THEN 3
      WHEN 'TASK_DEPENDENCIES' THEN 4
      WHEN 'TASKS'             THEN 5
      WHEN 'MILESTONES'        THEN 6
      WHEN 'PROJECT_MEMBERS'   THEN 7
      WHEN 'PROJECTS'          THEN 8
      WHEN 'USERS'             THEN 9
    END
  ) LOOP
    EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS PURGE';
  END LOOP;
END;
/

-- Drop views if they exist
BEGIN
  FOR v IN (SELECT view_name FROM user_views
            WHERE view_name IN ('V_PROJECT_SUMMARY','V_TASK_DETAIL','V_UNREAD_COUNTS'))
  LOOP
    EXECUTE IMMEDIATE 'DROP VIEW ' || v.view_name;
  END LOOP;
END;
/


-- =============================================================================
-- TABLE 1 — USERS
-- Central entity for authentication, authorization, and user identity.
-- =============================================================================
CREATE TABLE USERS (
  USER_ID       NUMBER         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  USERNAME      VARCHAR2(50)   NOT NULL,
  EMAIL         VARCHAR2(100)  NOT NULL,
  PASSWORD_HASH VARCHAR2(255)  NOT NULL,
  FULL_NAME     VARCHAR2(100)  NOT NULL,
  ROLE          VARCHAR2(20)   DEFAULT 'member' NOT NULL,
  AVATAR_URL    VARCHAR2(500),
  IS_ACTIVE     NUMBER(1)      DEFAULT 1 NOT NULL,
  CREATED_AT    TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
  UPDATED_AT    TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
  -- ── Constraints ──────────────────────────────────────────────────────────
  CONSTRAINT uq_users_username UNIQUE (USERNAME),
  CONSTRAINT uq_users_email    UNIQUE (EMAIL),
  CONSTRAINT chk_users_role    CHECK  (ROLE IN ('admin','manager','member')),
  CONSTRAINT chk_users_active  CHECK  (IS_ACTIVE IN (0,1))
);

COMMENT ON TABLE  USERS              IS 'System user accounts — authentication, RBAC, and identity.';
COMMENT ON COLUMN USERS.USER_ID      IS 'Surrogate PK, auto-incremented via IDENTITY.';
COMMENT ON COLUMN USERS.USERNAME     IS 'Unique login handle; lowercase enforced at application level.';
COMMENT ON COLUMN USERS.EMAIL        IS 'Unique email address used for authentication.';
COMMENT ON COLUMN USERS.PASSWORD_HASH IS 'bcrypt hash (10 rounds); plaintext never stored.';
COMMENT ON COLUMN USERS.ROLE         IS 'System-level role: admin | manager | member.';
COMMENT ON COLUMN USERS.IS_ACTIVE    IS 'Soft-delete flag: 1 = active, 0 = deactivated.';


-- =============================================================================
-- TABLE 2 — PROJECTS
-- Core project entity. One owner (USERS), many members (PROJECT_MEMBERS).
-- =============================================================================
CREATE TABLE PROJECTS (
  PROJECT_ID  NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  NAME        VARCHAR2(150)   NOT NULL,
  DESCRIPTION CLOB,
  STATUS      VARCHAR2(20)    DEFAULT 'planning' NOT NULL,
  PRIORITY    VARCHAR2(10)    DEFAULT 'medium'   NOT NULL,
  START_DATE  DATE,
  END_DATE    DATE,
  OWNER_ID    NUMBER          NOT NULL,
  BUDGET      NUMBER(15,2)    DEFAULT 0 NOT NULL,
  PROGRESS    NUMBER(3,0)     DEFAULT 0 NOT NULL,
  COLOR       VARCHAR2(7)     DEFAULT '#00D4FF' NOT NULL,
  CREATED_AT  TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
  UPDATED_AT  TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
  -- ── Constraints ──────────────────────────────────────────────────────────
  CONSTRAINT fk_projects_owner   FOREIGN KEY (OWNER_ID) REFERENCES USERS(USER_ID),
  CONSTRAINT chk_projects_status CHECK (STATUS   IN ('planning','active','on_hold','completed','cancelled')),
  CONSTRAINT chk_projects_prio   CHECK (PRIORITY IN ('low','medium','high','critical')),
  CONSTRAINT chk_projects_prog   CHECK (PROGRESS BETWEEN 0 AND 100),
  CONSTRAINT chk_projects_budget CHECK (BUDGET   >= 0),
  CONSTRAINT chk_projects_dates  CHECK (END_DATE IS NULL OR START_DATE IS NULL OR END_DATE >= START_DATE)
);

COMMENT ON TABLE  PROJECTS            IS 'Core project entity with lifecycle tracking and budget.';
COMMENT ON COLUMN PROJECTS.PROGRESS   IS 'Computed percentage: (done tasks / total tasks) * 100. Updated by trigger.';
COMMENT ON COLUMN PROJECTS.COLOR      IS 'Hex color code for UI card theming, e.g. #00D4FF.';


-- =============================================================================
-- TABLE 3 — PROJECT_MEMBERS
-- Associative entity resolving M:N between USERS ↔ PROJECTS with roles.
-- =============================================================================
CREATE TABLE PROJECT_MEMBERS (
  MEMBER_ID   NUMBER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  PROJECT_ID  NUMBER        NOT NULL,
  USER_ID     NUMBER        NOT NULL,
  ROLE        VARCHAR2(20)  DEFAULT 'member' NOT NULL,
  JOINED_AT   TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
  -- ── Constraints ──────────────────────────────────────────────────────────
  CONSTRAINT fk_pm_project  FOREIGN KEY (PROJECT_ID) REFERENCES PROJECTS(PROJECT_ID) ON DELETE CASCADE,
  CONSTRAINT fk_pm_user     FOREIGN KEY (USER_ID)    REFERENCES USERS(USER_ID)    ON DELETE CASCADE,
  CONSTRAINT uq_pm_member   UNIQUE (PROJECT_ID, USER_ID),
  CONSTRAINT chk_pm_role    CHECK  (ROLE IN ('owner','manager','member','viewer'))
);

COMMENT ON TABLE PROJECT_MEMBERS IS 'Junction table: user membership in projects with project-scoped roles.';


-- =============================================================================
-- TABLE 4 — MILESTONES
-- Significant deliverable checkpoints within a project. Cascade delete from PROJECTS.
-- =============================================================================
CREATE TABLE MILESTONES (
  MILESTONE_ID NUMBER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  PROJECT_ID   NUMBER        NOT NULL,
  TITLE        VARCHAR2(200) NOT NULL,
  DESCRIPTION  CLOB,
  DUE_DATE     DATE,
  STATUS       VARCHAR2(20)  DEFAULT 'pending' NOT NULL,
  CREATED_BY   NUMBER        NOT NULL,
  CREATED_AT   TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
  UPDATED_AT   TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
  -- ── Constraints ──────────────────────────────────────────────────────────
  CONSTRAINT fk_ms_project  FOREIGN KEY (PROJECT_ID) REFERENCES PROJECTS(PROJECT_ID)  ON DELETE CASCADE,
  CONSTRAINT fk_ms_creator  FOREIGN KEY (CREATED_BY) REFERENCES USERS(USER_ID),
  CONSTRAINT chk_ms_status  CHECK (STATUS IN ('pending','in_progress','completed','overdue'))
);

COMMENT ON TABLE MILESTONES IS 'Project checkpoints that group related tasks under a deliverable.';


-- =============================================================================
-- TABLE 5 — TASKS
-- Atomic unit of work. Mandatory project FK, optional milestone FK.
-- =============================================================================
CREATE TABLE TASKS (
  TASK_ID          NUMBER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  PROJECT_ID       NUMBER        NOT NULL,
  MILESTONE_ID     NUMBER,
  TITLE            VARCHAR2(300) NOT NULL,
  DESCRIPTION      CLOB,
  STATUS           VARCHAR2(20)  DEFAULT 'todo'   NOT NULL,
  PRIORITY         VARCHAR2(10)  DEFAULT 'medium' NOT NULL,
  ASSIGNED_TO      NUMBER,
  CREATED_BY       NUMBER        NOT NULL,
  DUE_DATE         DATE,
  ESTIMATED_HOURS  NUMBER(6,2)   DEFAULT 0 NOT NULL,
  ACTUAL_HOURS     NUMBER(6,2)   DEFAULT 0 NOT NULL,
  TAGS             VARCHAR2(500),
  SORT_ORDER       NUMBER        DEFAULT 0 NOT NULL,
  CREATED_AT       TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
  UPDATED_AT       TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
  -- ── Constraints ──────────────────────────────────────────────────────────
  CONSTRAINT fk_tasks_project   FOREIGN KEY (PROJECT_ID)   REFERENCES PROJECTS(PROJECT_ID)   ON DELETE CASCADE,
  CONSTRAINT fk_tasks_milestone FOREIGN KEY (MILESTONE_ID) REFERENCES MILESTONES(MILESTONE_ID) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_assignee  FOREIGN KEY (ASSIGNED_TO)  REFERENCES USERS(USER_ID)         ON DELETE SET NULL,
  CONSTRAINT fk_tasks_creator   FOREIGN KEY (CREATED_BY)   REFERENCES USERS(USER_ID),
  CONSTRAINT chk_tasks_status   CHECK (STATUS   IN ('todo','in_progress','review','done','cancelled')),
  CONSTRAINT chk_tasks_prio     CHECK (PRIORITY IN ('low','medium','high','critical')),
  CONSTRAINT chk_tasks_hours_e  CHECK (ESTIMATED_HOURS >= 0),
  CONSTRAINT chk_tasks_hours_a  CHECK (ACTUAL_HOURS    >= 0)
);

COMMENT ON TABLE  TASKS              IS 'Atomic work units. Full lifecycle from todo → done.';
COMMENT ON COLUMN TASKS.TAGS         IS 'Denormalized comma-separated labels, e.g. "api,backend". Trade-off for query simplicity.';
COMMENT ON COLUMN TASKS.SORT_ORDER   IS 'Manual ordering within a Kanban column for drag-and-drop.';


-- =============================================================================
-- TABLE 6 — TASK_DEPENDENCIES
-- M:N self-referencing on TASKS. Models blocking/blocked-by relationships.
-- =============================================================================
CREATE TABLE TASK_DEPENDENCIES (
  DEPENDENCY_ID  NUMBER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  TASK_ID        NUMBER  NOT NULL,
  DEPENDS_ON_ID  NUMBER  NOT NULL,
  -- ── Constraints ──────────────────────────────────────────────────────────
  CONSTRAINT fk_td_task       FOREIGN KEY (TASK_ID)       REFERENCES TASKS(TASK_ID) ON DELETE CASCADE,
  CONSTRAINT fk_td_depends    FOREIGN KEY (DEPENDS_ON_ID) REFERENCES TASKS(TASK_ID) ON DELETE CASCADE,
  CONSTRAINT uq_td_pair       UNIQUE (TASK_ID, DEPENDS_ON_ID),
  CONSTRAINT chk_td_no_self   CHECK  (TASK_ID <> DEPENDS_ON_ID)
);

COMMENT ON TABLE  TASK_DEPENDENCIES             IS 'Weak entity: task dependency chains (blocked-by / blocking).';
COMMENT ON COLUMN TASK_DEPENDENCIES.TASK_ID     IS 'The task that IS BEING BLOCKED (needs prerequisite to finish first).';
COMMENT ON COLUMN TASK_DEPENDENCIES.DEPENDS_ON_ID IS 'The prerequisite task that must complete first.';


-- =============================================================================
-- TABLE 7 — COMMENTS
-- Task-level discussion thread for collaboration and audit.
-- =============================================================================
CREATE TABLE COMMENTS (
  COMMENT_ID  NUMBER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  TASK_ID     NUMBER  NOT NULL,
  USER_ID     NUMBER  NOT NULL,
  CONTENT     CLOB    NOT NULL,
  CREATED_AT  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  UPDATED_AT  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  -- ── Constraints ──────────────────────────────────────────────────────────
  CONSTRAINT fk_comments_task FOREIGN KEY (TASK_ID)  REFERENCES TASKS(TASK_ID) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (USER_ID)  REFERENCES USERS(USER_ID) ON DELETE CASCADE
);

COMMENT ON TABLE COMMENTS IS 'Task-level threaded comments; CASCADE DELETE from both TASKS and USERS.';


-- =============================================================================
-- TABLE 8 — ACTIVITY_LOGS
-- Immutable audit trail. Never updated, only inserted.
-- =============================================================================
CREATE TABLE ACTIVITY_LOGS (
  LOG_ID       NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  USER_ID      NUMBER          NOT NULL,
  PROJECT_ID   NUMBER,
  TASK_ID      NUMBER,
  ACTION       VARCHAR2(50)    NOT NULL,
  ENTITY_TYPE  VARCHAR2(30)    NOT NULL,
  ENTITY_ID    NUMBER          NOT NULL,
  OLD_VALUE    VARCHAR2(500),
  NEW_VALUE    VARCHAR2(500),
  DESCRIPTION  VARCHAR2(1000),
  CREATED_AT   TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
  -- ── Constraints ──────────────────────────────────────────────────────────
  CONSTRAINT fk_al_user    FOREIGN KEY (USER_ID)    REFERENCES USERS(USER_ID),
  CONSTRAINT fk_al_project FOREIGN KEY (PROJECT_ID) REFERENCES PROJECTS(PROJECT_ID) ON DELETE CASCADE,
  CONSTRAINT fk_al_task    FOREIGN KEY (TASK_ID)    REFERENCES TASKS(TASK_ID)    ON DELETE SET NULL,
  CONSTRAINT chk_al_action CHECK (ACTION IN ('CREATE','UPDATE','DELETE','STATUS_CHANGE','COMMENT','MEMBER_ADD','MEMBER_REMOVE')),
  CONSTRAINT chk_al_entity CHECK (ENTITY_TYPE IN ('PROJECT','TASK','MILESTONE','MEMBER','COMMENT'))
);

COMMENT ON TABLE ACTIVITY_LOGS IS 'Immutable audit trail. Rows are INSERT-only; no UPDATE or DELETE permitted via app.';


-- =============================================================================
-- TABLE 9 — NOTIFICATIONS
-- Per-user in-app notification inbox with read/unread state.
-- =============================================================================
CREATE TABLE NOTIFICATIONS (
  NOTIFICATION_ID  NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  USER_ID          NUMBER          NOT NULL,
  TYPE             VARCHAR2(30)    NOT NULL,
  TITLE            VARCHAR2(200)   NOT NULL,
  MESSAGE          VARCHAR2(1000),
  IS_READ          NUMBER(1)       DEFAULT 0 NOT NULL,
  RELATED_TYPE     VARCHAR2(30),
  RELATED_ID       NUMBER,
  CREATED_AT       TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
  -- ── Constraints ──────────────────────────────────────────────────────────
  CONSTRAINT fk_notif_user      FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID) ON DELETE CASCADE,
  CONSTRAINT chk_notif_type     CHECK (TYPE IN ('task_assigned','task_due','comment','project_invite','milestone','mention','status_change')),
  CONSTRAINT chk_notif_is_read  CHECK (IS_READ IN (0,1)),
  CONSTRAINT chk_notif_rel_type CHECK (RELATED_TYPE IS NULL OR RELATED_TYPE IN ('TASK','PROJECT','MILESTONE'))
);

COMMENT ON TABLE NOTIFICATIONS IS 'In-app notification inbox: read/unread, deep-link via RELATED_TYPE + RELATED_ID.';


-- =============================================================================
-- INDEXES — B-Tree on all FK columns + high-frequency filter/sort columns
-- =============================================================================

-- PROJECTS
CREATE INDEX idx_projects_owner  ON PROJECTS(OWNER_ID);
CREATE INDEX idx_projects_status ON PROJECTS(STATUS);
CREATE INDEX idx_projects_prio   ON PROJECTS(PRIORITY);

-- PROJECT_MEMBERS
CREATE INDEX idx_pm_project ON PROJECT_MEMBERS(PROJECT_ID);
CREATE INDEX idx_pm_user    ON PROJECT_MEMBERS(USER_ID);

-- MILESTONES
CREATE INDEX idx_ms_project ON MILESTONES(PROJECT_ID);
CREATE INDEX idx_ms_status  ON MILESTONES(STATUS);

-- TASKS — most critical; nearly every query filters by these
CREATE INDEX idx_tasks_project   ON TASKS(PROJECT_ID);
CREATE INDEX idx_tasks_assigned  ON TASKS(ASSIGNED_TO);
CREATE INDEX idx_tasks_status    ON TASKS(STATUS);
CREATE INDEX idx_tasks_milestone ON TASKS(MILESTONE_ID);
CREATE INDEX idx_tasks_creator   ON TASKS(CREATED_BY);
CREATE INDEX idx_tasks_due       ON TASKS(DUE_DATE);
CREATE INDEX idx_tasks_proj_stat ON TASKS(PROJECT_ID, STATUS);   -- composite for Kanban

-- TASK_DEPENDENCIES
CREATE INDEX idx_td_task     ON TASK_DEPENDENCIES(TASK_ID);
CREATE INDEX idx_td_depends  ON TASK_DEPENDENCIES(DEPENDS_ON_ID);

-- COMMENTS
CREATE INDEX idx_comments_task ON COMMENTS(TASK_ID);
CREATE INDEX idx_comments_user ON COMMENTS(USER_ID);

-- ACTIVITY_LOGS
CREATE INDEX idx_al_project  ON ACTIVITY_LOGS(PROJECT_ID);
CREATE INDEX idx_al_user     ON ACTIVITY_LOGS(USER_ID);
CREATE INDEX idx_al_task     ON ACTIVITY_LOGS(TASK_ID);
CREATE INDEX idx_al_created  ON ACTIVITY_LOGS(CREATED_AT DESC);

-- NOTIFICATIONS — composite for unread badge query
CREATE INDEX idx_notif_user_read ON NOTIFICATIONS(USER_ID, IS_READ);
CREATE INDEX idx_notif_created   ON NOTIFICATIONS(CREATED_AT DESC);


-- =============================================================================
-- VIEWS
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- V_PROJECT_SUMMARY
-- Single-query project list with aggregated counts.
-- Used by: GET /api/projects, GET /api/dashboard/project-overview
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW V_PROJECT_SUMMARY AS
SELECT
  p.PROJECT_ID,
  p.NAME,
  p.DESCRIPTION,
  p.STATUS,
  p.PRIORITY,
  p.START_DATE,
  p.END_DATE,
  p.BUDGET,
  p.PROGRESS,
  p.COLOR,
  p.CREATED_AT,
  p.UPDATED_AT,
  -- Owner details
  p.OWNER_ID,
  u.USERNAME         AS OWNER_USERNAME,
  u.FULL_NAME        AS OWNER_FULL_NAME,
  u.AVATAR_URL       AS OWNER_AVATAR_URL,
  -- Aggregated counts (scalar subquery caching in Oracle 23ai)
  (SELECT COUNT(*) FROM PROJECT_MEMBERS pm WHERE pm.PROJECT_ID = p.PROJECT_ID)
                     AS MEMBER_COUNT,
  (SELECT COUNT(*) FROM TASKS t         WHERE t.PROJECT_ID  = p.PROJECT_ID)
                     AS TOTAL_TASKS,
  (SELECT COUNT(*) FROM TASKS t         WHERE t.PROJECT_ID  = p.PROJECT_ID AND t.STATUS = 'done')
                     AS DONE_TASKS,
  (SELECT COUNT(*) FROM TASKS t         WHERE t.PROJECT_ID  = p.PROJECT_ID AND t.STATUS = 'in_progress')
                     AS IN_PROGRESS_TASKS,
  (SELECT COUNT(*) FROM TASKS t         WHERE t.PROJECT_ID  = p.PROJECT_ID AND t.STATUS = 'todo')
                     AS TODO_TASKS,
  (SELECT COUNT(*) FROM MILESTONES ms   WHERE ms.PROJECT_ID = p.PROJECT_ID)
                     AS MILESTONE_COUNT,
  (SELECT COUNT(*) FROM MILESTONES ms   WHERE ms.PROJECT_ID = p.PROJECT_ID AND ms.STATUS = 'completed')
                     AS COMPLETED_MILESTONES,
  -- Overdue flag
  CASE WHEN p.END_DATE < SYSDATE AND p.STATUS NOT IN ('completed','cancelled')
       THEN 1 ELSE 0 END AS IS_OVERDUE
FROM PROJECTS p
JOIN USERS    u ON u.USER_ID = p.OWNER_ID;

COMMENT ON TABLE V_PROJECT_SUMMARY IS 'Denormalised project listing with aggregated task/member counts.';


-- ─────────────────────────────────────────────────────────────────────────────
-- V_TASK_DETAIL
-- Full task row with resolved FK display names.
-- Used by: GET /api/tasks/:id, GET /api/projects/:id/tasks (Kanban)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW V_TASK_DETAIL AS
SELECT
  t.TASK_ID,
  t.PROJECT_ID,
  t.MILESTONE_ID,
  t.TITLE,
  t.DESCRIPTION,
  t.STATUS,
  t.PRIORITY,
  t.DUE_DATE,
  t.ESTIMATED_HOURS,
  t.ACTUAL_HOURS,
  t.TAGS,
  t.SORT_ORDER,
  t.CREATED_AT,
  t.UPDATED_AT,
  -- Assignee details
  t.ASSIGNED_TO,
  a.USERNAME      AS ASSIGNEE_USERNAME,
  a.FULL_NAME     AS ASSIGNEE_FULL_NAME,
  a.AVATAR_URL    AS ASSIGNEE_AVATAR_URL,
  -- Creator details
  t.CREATED_BY,
  c.USERNAME      AS CREATOR_USERNAME,
  c.FULL_NAME     AS CREATOR_FULL_NAME,
  -- Project details
  p.NAME          AS PROJECT_NAME,
  p.COLOR         AS PROJECT_COLOR,
  -- Milestone details
  m.TITLE         AS MILESTONE_TITLE,
  m.STATUS        AS MILESTONE_STATUS,
  m.DUE_DATE      AS MILESTONE_DUE_DATE,
  -- Comment count
  (SELECT COUNT(*) FROM COMMENTS co WHERE co.TASK_ID = t.TASK_ID) AS COMMENT_COUNT,
  -- Overdue flag
  CASE WHEN t.DUE_DATE < SYSDATE AND t.STATUS NOT IN ('done','cancelled')
       THEN 1 ELSE 0 END AS IS_OVERDUE
FROM      TASKS     t
JOIN      PROJECTS  p  ON p.PROJECT_ID  = t.PROJECT_ID
JOIN      USERS     c  ON c.USER_ID     = t.CREATED_BY
LEFT JOIN USERS     a  ON a.USER_ID     = t.ASSIGNED_TO
LEFT JOIN MILESTONES m ON m.MILESTONE_ID = t.MILESTONE_ID;

COMMENT ON TABLE V_TASK_DETAIL IS 'Full task display row with resolved assignee, creator, project, and milestone names.';


-- ─────────────────────────────────────────────────────────────────────────────
-- V_UNREAD_COUNTS
-- Per-user unread notification count for badge rendering.
-- Used by: GET /api/notifications (badge count)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW V_UNREAD_COUNTS AS
SELECT
  USER_ID,
  COUNT(*) AS UNREAD_COUNT
FROM NOTIFICATIONS
WHERE IS_READ = 0
GROUP BY USER_ID;


-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- trg_projects_updated_at — auto-stamp UPDATED_AT on any project row change
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON PROJECTS
  FOR EACH ROW
BEGIN
  :NEW.UPDATED_AT := SYSTIMESTAMP;
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- trg_tasks_updated_at — auto-stamp UPDATED_AT on any task row change
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON TASKS
  FOR EACH ROW
BEGIN
  :NEW.UPDATED_AT := SYSTIMESTAMP;
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- trg_milestones_updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_milestones_updated_at
  BEFORE UPDATE ON MILESTONES
  FOR EACH ROW
BEGIN
  :NEW.UPDATED_AT := SYSTIMESTAMP;
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- trg_users_updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON USERS
  FOR EACH ROW
BEGIN
  :NEW.UPDATED_AT := SYSTIMESTAMP;
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- trg_comments_updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON COMMENTS
  FOR EACH ROW
BEGIN
  :NEW.UPDATED_AT := SYSTIMESTAMP;
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- trg_recalc_project_progress
-- Fires after any INSERT, UPDATE, or DELETE on TASKS.
-- Recomputes PROJECTS.PROGRESS = (done tasks / non-cancelled tasks) * 100
-- Excludes cancelled tasks from denominator (they don't count against progress).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_recalc_project_progress
  AFTER INSERT OR UPDATE OF STATUS OR DELETE ON TASKS
  FOR EACH ROW
DECLARE
  v_project_id  TASKS.PROJECT_ID%TYPE;
  v_total       NUMBER;
  v_done        NUMBER;
  v_new_pct     NUMBER;
BEGIN
  -- Determine which project to recalculate
  IF DELETING THEN
    v_project_id := :OLD.PROJECT_ID;
  ELSE
    v_project_id := :NEW.PROJECT_ID;
  END IF;

  SELECT
    COUNT(CASE WHEN STATUS != 'cancelled' THEN 1 END),
    COUNT(CASE WHEN STATUS  = 'done'      THEN 1 END)
  INTO v_total, v_done
  FROM TASKS
  WHERE PROJECT_ID = v_project_id;

  v_new_pct := CASE WHEN v_total = 0 THEN 0
                    ELSE ROUND((v_done / v_total) * 100)
               END;

  UPDATE PROJECTS
  SET    PROGRESS   = v_new_pct,
         UPDATED_AT = SYSTIMESTAMP
  WHERE  PROJECT_ID = v_project_id;
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- trg_protect_activity_logs
-- Prevents UPDATE and DELETE on ACTIVITY_LOGS — immutable audit trail.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_protect_activity_logs
  BEFORE UPDATE OR DELETE ON ACTIVITY_LOGS
  FOR EACH ROW
BEGIN
  RAISE_APPLICATION_ERROR(-20001,
    'Activity logs are immutable. UPDATE and DELETE are not permitted.');
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- trg_auto_add_owner_member
-- When a new project is created, automatically insert the owner into
-- PROJECT_MEMBERS with role = 'owner'.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_auto_add_owner_member
  AFTER INSERT ON PROJECTS
  FOR EACH ROW
BEGIN
  INSERT INTO PROJECT_MEMBERS (PROJECT_ID, USER_ID, ROLE)
  VALUES (:NEW.PROJECT_ID, :NEW.OWNER_ID, 'owner');
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- trg_milestone_overdue
-- Marks milestone STATUS = 'overdue' automatically when DUE_DATE has passed
-- and status is still pending or in_progress.
-- Called on UPDATE of DUE_DATE or STATUS.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_milestone_overdue
  BEFORE INSERT OR UPDATE OF STATUS, DUE_DATE ON MILESTONES
  FOR EACH ROW
BEGIN
  IF :NEW.DUE_DATE IS NOT NULL
     AND :NEW.DUE_DATE < SYSDATE
     AND :NEW.STATUS IN ('pending','in_progress')
  THEN
    :NEW.STATUS := 'overdue';
  END IF;
END;
/


-- =============================================================================
-- STORED PROCEDURES
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_log_activity
-- Inserts a row into ACTIVITY_LOGS. Called from application code via CALL.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE sp_log_activity (
  p_user_id     IN ACTIVITY_LOGS.USER_ID%TYPE,
  p_project_id  IN ACTIVITY_LOGS.PROJECT_ID%TYPE  DEFAULT NULL,
  p_task_id     IN ACTIVITY_LOGS.TASK_ID%TYPE     DEFAULT NULL,
  p_action      IN ACTIVITY_LOGS.ACTION%TYPE,
  p_entity_type IN ACTIVITY_LOGS.ENTITY_TYPE%TYPE,
  p_entity_id   IN ACTIVITY_LOGS.ENTITY_ID%TYPE,
  p_old_value   IN ACTIVITY_LOGS.OLD_VALUE%TYPE   DEFAULT NULL,
  p_new_value   IN ACTIVITY_LOGS.NEW_VALUE%TYPE   DEFAULT NULL,
  p_description IN ACTIVITY_LOGS.DESCRIPTION%TYPE DEFAULT NULL
) AS
BEGIN
  INSERT INTO ACTIVITY_LOGS
    (USER_ID, PROJECT_ID, TASK_ID, ACTION, ENTITY_TYPE, ENTITY_ID,
     OLD_VALUE, NEW_VALUE, DESCRIPTION)
  VALUES
    (p_user_id, p_project_id, p_task_id, p_action, p_entity_type, p_entity_id,
     p_old_value, p_new_value, p_description);
END sp_log_activity;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_create_notification
-- Inserts a notification row. Called from application code.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE sp_create_notification (
  p_user_id      IN NOTIFICATIONS.USER_ID%TYPE,
  p_type         IN NOTIFICATIONS.TYPE%TYPE,
  p_title        IN NOTIFICATIONS.TITLE%TYPE,
  p_message      IN NOTIFICATIONS.MESSAGE%TYPE    DEFAULT NULL,
  p_related_type IN NOTIFICATIONS.RELATED_TYPE%TYPE DEFAULT NULL,
  p_related_id   IN NOTIFICATIONS.RELATED_ID%TYPE   DEFAULT NULL
) AS
BEGIN
  INSERT INTO NOTIFICATIONS
    (USER_ID, TYPE, TITLE, MESSAGE, RELATED_TYPE, RELATED_ID)
  VALUES
    (p_user_id, p_type, p_title, p_message, p_related_type, p_related_id);
END sp_create_notification;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_project_stats
-- Returns a single row of aggregated stats for a given project.
-- Used by the project detail page header.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE sp_get_project_stats (
  p_project_id    IN  PROJECTS.PROJECT_ID%TYPE,
  p_total_tasks   OUT NUMBER,
  p_done_tasks    OUT NUMBER,
  p_overdue_tasks OUT NUMBER,
  p_member_count  OUT NUMBER,
  p_total_hours_e OUT NUMBER,
  p_total_hours_a OUT NUMBER
) AS
BEGIN
  SELECT
    COUNT(*),
    COUNT(CASE WHEN STATUS = 'done'                            THEN 1 END),
    COUNT(CASE WHEN DUE_DATE < SYSDATE AND STATUS NOT IN ('done','cancelled') THEN 1 END),
    SUM(NVL(ESTIMATED_HOURS,0)),
    SUM(NVL(ACTUAL_HOURS,0))
  INTO p_total_tasks, p_done_tasks, p_overdue_tasks, p_total_hours_e, p_total_hours_a
  FROM TASKS
  WHERE PROJECT_ID = p_project_id;

  SELECT COUNT(*)
  INTO p_member_count
  FROM PROJECT_MEMBERS
  WHERE PROJECT_ID = p_project_id;
END sp_get_project_stats;
/


-- =============================================================================
-- VERIFICATION QUERIES  (run to confirm all objects created)
-- =============================================================================
-- SELECT object_name, object_type, status FROM user_objects ORDER BY object_type, object_name;
-- SELECT table_name, num_rows FROM user_tables ORDER BY table_name;

COMMIT;

PROMPT ✓  PMS schema created successfully — tables, indexes, views, triggers, procedures.

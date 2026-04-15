-- =============================================================================
-- PROJECT MANAGEMENT SYSTEM — Oracle 23ai Free
-- seed.sql  |  Realistic sample data for development & testing
-- Run AFTER schema.sql  |  Connect as pms_user @ FREEPDB1
-- =============================================================================
-- NOTE: Passwords below are bcrypt hashes.
--   admin@pms.dev   → Password123!
--   sarah@pms.dev   → Password123!
--   (all seed users use the same hash for dev convenience)
-- bcrypt hash (10 rounds) for "Password123!":
-- $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- (standard test vector — never use in production)
-- =============================================================================

SET DEFINE OFF;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS  (6 seed users covering all roles)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO USERS (USERNAME, EMAIL, PASSWORD_HASH, FULL_NAME, ROLE) VALUES
  ('admin',    'admin@pms.dev',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin');

INSERT INTO USERS (USERNAME, EMAIL, PASSWORD_HASH, FULL_NAME, ROLE) VALUES
  ('sarah_m',  'sarah@pms.dev',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah Mitchell',      'manager');

INSERT INTO USERS (USERNAME, EMAIL, PASSWORD_HASH, FULL_NAME, ROLE) VALUES
  ('alex_k',   'alex@pms.dev',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alex Kumar',          'manager');

INSERT INTO USERS (USERNAME, EMAIL, PASSWORD_HASH, FULL_NAME, ROLE) VALUES
  ('priya_d',  'priya@pms.dev',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Priya Desai',         'member');

INSERT INTO USERS (USERNAME, EMAIL, PASSWORD_HASH, FULL_NAME, ROLE) VALUES
  ('omar_f',   'omar@pms.dev',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Omar Farooq',         'member');

INSERT INTO USERS (USERNAME, EMAIL, PASSWORD_HASH, FULL_NAME, ROLE) VALUES
  ('zara_h',   'zara@pms.dev',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Zara Hassan',         'member');

COMMIT;

-- Grab user IDs for subsequent inserts
-- USER_IDs will be 1,2,3,4,5,6 in a clean install

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PROJECTS  (3 projects with varied statuses)
-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECT 1: E-Commerce Platform (active, owned by sarah_m)
INSERT INTO PROJECTS (NAME, DESCRIPTION, STATUS, PRIORITY, START_DATE, END_DATE, OWNER_ID, BUDGET, COLOR)
VALUES (
  'E-Commerce Platform',
  'Full-stack online shopping platform with payment gateway, product catalog, cart, and order management. Target launch Q2 2025.',
  'active', 'high',
  DATE '2025-01-15', DATE '2025-06-30',
  2,  -- sarah_m
  75000.00,
  '#00D4FF'
);

-- PROJECT 2: Mobile Banking App (planning, owned by alex_k)
INSERT INTO PROJECTS (NAME, DESCRIPTION, STATUS, PRIORITY, START_DATE, END_DATE, OWNER_ID, BUDGET, COLOR)
VALUES (
  'Mobile Banking App',
  'iOS and Android mobile banking application with biometric auth, transaction history, and instant transfers.',
  'planning', 'critical',
  DATE '2025-03-01', DATE '2025-12-31',
  3,  -- alex_k
  120000.00,
  '#7C3AED'
);

-- PROJECT 3: Internal HR Portal (completed, owned by sarah_m)
INSERT INTO PROJECTS (NAME, DESCRIPTION, STATUS, PRIORITY, START_DATE, END_DATE, OWNER_ID, BUDGET, COLOR)
VALUES (
  'Internal HR Portal',
  'Employee self-service portal for leave requests, payroll slips, performance reviews, and org chart.',
  'completed', 'medium',
  DATE '2024-06-01', DATE '2024-12-15',
  2,  -- sarah_m
  30000.00,
  '#00FF88'
);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PROJECT_MEMBERS
-- (Owner row is auto-inserted by trg_auto_add_owner_member trigger)
-- Add additional members here.
-- ─────────────────────────────────────────────────────────────────────────────
-- Project 1 members
INSERT INTO PROJECT_MEMBERS (PROJECT_ID, USER_ID, ROLE) VALUES (1, 3, 'manager');  -- alex_k
INSERT INTO PROJECT_MEMBERS (PROJECT_ID, USER_ID, ROLE) VALUES (1, 4, 'member');   -- priya_d
INSERT INTO PROJECT_MEMBERS (PROJECT_ID, USER_ID, ROLE) VALUES (1, 5, 'member');   -- omar_f
INSERT INTO PROJECT_MEMBERS (PROJECT_ID, USER_ID, ROLE) VALUES (1, 6, 'viewer');   -- zara_h

-- Project 2 members
INSERT INTO PROJECT_MEMBERS (PROJECT_ID, USER_ID, ROLE) VALUES (2, 2, 'manager');  -- sarah_m
INSERT INTO PROJECT_MEMBERS (PROJECT_ID, USER_ID, ROLE) VALUES (2, 4, 'member');   -- priya_d
INSERT INTO PROJECT_MEMBERS (PROJECT_ID, USER_ID, ROLE) VALUES (2, 6, 'member');   -- zara_h

-- Project 3 members
INSERT INTO PROJECT_MEMBERS (PROJECT_ID, USER_ID, ROLE) VALUES (3, 4, 'member');   -- priya_d
INSERT INTO PROJECT_MEMBERS (PROJECT_ID, USER_ID, ROLE) VALUES (3, 5, 'member');   -- omar_f

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. MILESTONES  (per project)
-- ─────────────────────────────────────────────────────────────────────────────
-- Project 1 milestones
INSERT INTO MILESTONES (PROJECT_ID, TITLE, DESCRIPTION, DUE_DATE, STATUS, CREATED_BY) VALUES
  (1, 'Backend API v1', 'Complete all REST endpoints, auth, and DB integration.', DATE '2025-03-15', 'completed', 2);

INSERT INTO MILESTONES (PROJECT_ID, TITLE, DESCRIPTION, DUE_DATE, STATUS, CREATED_BY) VALUES
  (1, 'Frontend MVP', 'Product listing, cart, and checkout flow functional.', DATE '2025-04-30', 'in_progress', 2);

INSERT INTO MILESTONES (PROJECT_ID, TITLE, DESCRIPTION, DUE_DATE, STATUS, CREATED_BY) VALUES
  (1, 'Payment Integration', 'Stripe + PayPal gateway integration and testing.', DATE '2025-06-01', 'pending', 2);

-- Project 2 milestones
INSERT INTO MILESTONES (PROJECT_ID, TITLE, DESCRIPTION, DUE_DATE, STATUS, CREATED_BY) VALUES
  (2, 'Architecture Design', 'Finalize system architecture, DB schema, and API contracts.', DATE '2025-04-15', 'in_progress', 3);

INSERT INTO MILESTONES (PROJECT_ID, TITLE, DESCRIPTION, DUE_DATE, STATUS, CREATED_BY) VALUES
  (2, 'Prototype v0.1', 'Clickable prototype with core banking screens.', DATE '2025-06-30', 'pending', 3);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TASKS  (varied statuses, priorities, assignments)
-- ─────────────────────────────────────────────────────────────────────────────
-- ── Project 1, Milestone 1 (Backend API v1 — completed) ──────────────────────
INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, 1, 'Set up Oracle 23ai schema', 'done', 'high', 4, 2,
        DATE '2025-02-01', 8, 9, 'database,backend');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, 1, 'Implement JWT authentication', 'done', 'critical', 5, 2,
        DATE '2025-02-10', 12, 11, 'auth,security,backend');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, 1, 'Product CRUD API endpoints', 'done', 'high', 4, 2,
        DATE '2025-02-20', 16, 18, 'api,backend');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, 1, 'Order management API', 'done', 'high', 5, 2,
        DATE '2025-03-10', 20, 22, 'api,backend,orders');

-- ── Project 1, Milestone 2 (Frontend MVP — in_progress) ──────────────────────
INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, 2, 'Product listing page', 'done', 'high', 6, 2,
        DATE '2025-03-25', 10, 12, 'frontend,react');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, 2, 'Shopping cart component', 'in_progress', 'high', 6, 2,
        DATE '2025-04-15', 8, 4, 'frontend,react,cart');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, 2, 'Checkout flow & address form', 'in_progress', 'high', 4, 2,
        DATE '2025-04-20', 12, 3, 'frontend,react,checkout');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, 2, 'User profile & order history', 'todo', 'medium', 6, 2,
        DATE '2025-04-28', 8, 0, 'frontend,react');

-- ── Project 1, Milestone 3 (Payment — pending) ────────────────────────────────
INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, 3, 'Stripe webhook integration', 'todo', 'critical', 5, 2,
        DATE '2025-05-10', 16, 0, 'payment,stripe,backend');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, 3, 'PayPal SDK setup', 'todo', 'high', 5, 2,
        DATE '2025-05-20', 12, 0, 'payment,paypal,backend');

-- ── Project 1 — unassigned tasks ──────────────────────────────────────────────
INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, NULL, 'Write API documentation', 'todo', 'low', NULL, 2,
        DATE '2025-05-30', 6, 0, 'docs');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (1, NULL, 'Performance load testing', 'todo', 'medium', 5, 2,
        DATE '2025-06-15', 8, 0, 'testing,performance');

-- ── Project 2 — planning tasks ────────────────────────────────────────────────
INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (2, 4, 'Draft system architecture document', 'in_progress', 'critical', 4, 3,
        DATE '2025-04-01', 16, 8, 'architecture,docs');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (2, 4, 'Define API contracts (OpenAPI 3.0)', 'in_progress', 'high', 6, 3,
        DATE '2025-04-10', 12, 5, 'api,docs');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (2, 4, 'Database schema design', 'review', 'high', 4, 3,
        DATE '2025-04-12', 10, 10, 'database');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (2, 5, 'UI/UX wireframes (Figma)', 'todo', 'medium', 6, 3,
        DATE '2025-05-15', 20, 0, 'design,figma');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (2, NULL, 'Security audit plan', 'todo', 'critical', NULL, 3,
        DATE '2025-05-01', 8, 0, 'security');

-- ── Project 3 — all done (completed project) ─────────────────────────────────
INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (3, NULL, 'Leave request module', 'done', 'high', 4, 2,
        DATE '2024-09-01', 20, 22, 'backend,frontend');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (3, NULL, 'Payroll slip PDF generation', 'done', 'medium', 5, 2,
        DATE '2024-10-01', 16, 14, 'backend,pdf');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (3, NULL, 'Performance review workflow', 'done', 'high', 4, 2,
        DATE '2024-11-15', 24, 26, 'backend,workflow');

INSERT INTO TASKS (PROJECT_ID, MILESTONE_ID, TITLE, STATUS, PRIORITY, ASSIGNED_TO, CREATED_BY,
                   DUE_DATE, ESTIMATED_HOURS, ACTUAL_HOURS, TAGS)
VALUES (3, NULL, 'Deploy to production + UAT', 'done', 'critical', 5, 2,
        DATE '2024-12-10', 8, 10, 'devops');

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TASK_DEPENDENCIES
-- ─────────────────────────────────────────────────────────────────────────────
-- Shopping cart depends on Product listing being done (tasks 6 & 7)
INSERT INTO TASK_DEPENDENCIES (TASK_ID, DEPENDS_ON_ID) VALUES (6, 5);  -- cart → listing
-- Checkout depends on cart (task 7 → 6)
INSERT INTO TASK_DEPENDENCIES (TASK_ID, DEPENDS_ON_ID) VALUES (7, 6);  -- checkout → cart
-- Stripe depends on Order management API (task 9 → 4)
INSERT INTO TASK_DEPENDENCIES (TASK_ID, DEPENDS_ON_ID) VALUES (9,  4);
-- PayPal depends on Stripe webhook (task 10 → 9)
INSERT INTO TASK_DEPENDENCIES (TASK_ID, DEPENDS_ON_ID) VALUES (10, 9);
-- API contracts depend on architecture doc (tasks 14 → 13)
INSERT INTO TASK_DEPENDENCIES (TASK_ID, DEPENDS_ON_ID) VALUES (14, 13);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. COMMENTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Comments on task 2 (JWT auth)
INSERT INTO COMMENTS (TASK_ID, USER_ID, CONTENT) VALUES
  (2, 4, 'Using RS256 algorithm for the JWT signing — this will allow public key verification without sharing the secret. Do we need to support token refresh, or will a 7-day expiry be sufficient for now?');

INSERT INTO COMMENTS (TASK_ID, USER_ID, CONTENT) VALUES
  (2, 2, 'Let''s go with HS256 for now to keep it simple — we can upgrade to RS256 in the security hardening phase. 7 days expiry is fine for the MVP. Please add token blacklisting logic for logout.');

INSERT INTO COMMENTS (TASK_ID, USER_ID, CONTENT) VALUES
  (2, 5, 'Token blacklisting added via an in-memory Set. Note: this won''t survive server restarts. Should we move to Redis-backed blacklisting before go-live?');

-- Comments on task 6 (Shopping cart)
INSERT INTO COMMENTS (TASK_ID, USER_ID, CONTENT) VALUES
  (6, 6, 'Cart state is currently in localStorage. Should we persist it to the DB for cross-device sync? The backend endpoint is already designed to support it.');

INSERT INTO COMMENTS (TASK_ID, USER_ID, CONTENT) VALUES
  (6, 2, 'Yes, persist to DB. Add a CARTS table or just use a JSON column on the USERS table. Keep localStorage as a cache layer for performance.');

-- Comments on task 15 (Database schema for banking app)
INSERT INTO COMMENTS (TASK_ID, USER_ID, CONTENT) VALUES
  (15, 4, 'Schema review complete. I suggest adding a TRANSACTIONS table with a composite index on (ACCOUNT_ID, CREATED_AT DESC) for the transaction history queries. Also consider partitioning by month.');

INSERT INTO COMMENTS (TASK_ID, USER_ID, CONTENT) VALUES
  (15, 3, 'Good call on the partitioning. Let''s use interval partitioning on CREATED_AT — Oracle 23ai handles this transparently. Add to architecture doc before sign-off.');

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ACTIVITY_LOGS  (representative entries)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO ACTIVITY_LOGS (USER_ID, PROJECT_ID, TASK_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DESCRIPTION) VALUES
  (2, 1, NULL, 'CREATE', 'PROJECT', 1, 'Created project "E-Commerce Platform"');

INSERT INTO ACTIVITY_LOGS (USER_ID, PROJECT_ID, TASK_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DESCRIPTION) VALUES
  (2, 1, 1,    'CREATE', 'TASK',    1, 'Created task "Set up Oracle 23ai schema"');

INSERT INTO ACTIVITY_LOGS (USER_ID, PROJECT_ID, TASK_ID, ACTION, ENTITY_TYPE, ENTITY_ID,
                           OLD_VALUE, NEW_VALUE, DESCRIPTION) VALUES
  (4, 1, 1,    'STATUS_CHANGE', 'TASK', 1, 'todo', 'done', 'Marked task "Set up Oracle 23ai schema" as done');

INSERT INTO ACTIVITY_LOGS (USER_ID, PROJECT_ID, TASK_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DESCRIPTION) VALUES
  (2, 1, 2,    'CREATE', 'TASK',    2, 'Created task "Implement JWT authentication"');

INSERT INTO ACTIVITY_LOGS (USER_ID, PROJECT_ID, TASK_ID, ACTION, ENTITY_TYPE, ENTITY_ID,
                           OLD_VALUE, NEW_VALUE, DESCRIPTION) VALUES
  (5, 1, 2,    'STATUS_CHANGE', 'TASK', 2, 'in_progress', 'done', 'Completed JWT authentication implementation');

INSERT INTO ACTIVITY_LOGS (USER_ID, PROJECT_ID, TASK_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DESCRIPTION) VALUES
  (3, 2, NULL, 'CREATE', 'PROJECT', 2, 'Created project "Mobile Banking App"');

INSERT INTO ACTIVITY_LOGS (USER_ID, PROJECT_ID, TASK_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DESCRIPTION) VALUES
  (2, 1, NULL, 'MEMBER_ADD', 'MEMBER', 3, 'Added alex_k to project as manager');

INSERT INTO ACTIVITY_LOGS (USER_ID, PROJECT_ID, TASK_ID, ACTION, ENTITY_TYPE, ENTITY_ID, DESCRIPTION) VALUES
  (6, 1, 6,    'COMMENT', 'COMMENT', 1, 'Commented on "Shopping cart component"');

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications for priya_d (USER_ID=4)
INSERT INTO NOTIFICATIONS (USER_ID, TYPE, TITLE, MESSAGE, IS_READ, RELATED_TYPE, RELATED_ID) VALUES
  (4, 'task_assigned', 'New Task Assigned',
   'You have been assigned "Set up Oracle 23ai schema" in E-Commerce Platform.',
   1, 'TASK', 1);

INSERT INTO NOTIFICATIONS (USER_ID, TYPE, TITLE, MESSAGE, IS_READ, RELATED_TYPE, RELATED_ID) VALUES
  (4, 'task_assigned', 'New Task Assigned',
   'You have been assigned "Checkout flow & address form" in E-Commerce Platform.',
   0, 'TASK', 7);

INSERT INTO NOTIFICATIONS (USER_ID, TYPE, TITLE, MESSAGE, IS_READ, RELATED_TYPE, RELATED_ID) VALUES
  (4, 'project_invite', 'Added to Project',
   'You have been added to "Mobile Banking App" as a member.',
   0, 'PROJECT', 2);

-- Notifications for omar_f (USER_ID=5)
INSERT INTO NOTIFICATIONS (USER_ID, TYPE, TITLE, MESSAGE, IS_READ, RELATED_TYPE, RELATED_ID) VALUES
  (5, 'task_assigned', 'New Task Assigned',
   'You have been assigned "Implement JWT authentication" in E-Commerce Platform.',
   1, 'TASK', 2);

INSERT INTO NOTIFICATIONS (USER_ID, TYPE, TITLE, MESSAGE, IS_READ, RELATED_TYPE, RELATED_ID) VALUES
  (5, 'comment', 'New Comment on Your Task',
   'Alex Kumar commented on "Shopping cart component".',
   0, 'TASK', 6);

INSERT INTO NOTIFICATIONS (USER_ID, TYPE, TITLE, MESSAGE, IS_READ, RELATED_TYPE, RELATED_ID) VALUES
  (5, 'task_due', 'Task Due Soon',
   '"Stripe webhook integration" is due in 3 days.',
   0, 'TASK', 9);

-- Notifications for zara_h (USER_ID=6)
INSERT INTO NOTIFICATIONS (USER_ID, TYPE, TITLE, MESSAGE, IS_READ, RELATED_TYPE, RELATED_ID) VALUES
  (6, 'task_assigned', 'New Task Assigned',
   'You have been assigned "Define API contracts" in Mobile Banking App.',
   0, 'TASK', 14);

INSERT INTO NOTIFICATIONS (USER_ID, TYPE, TITLE, MESSAGE, IS_READ, RELATED_TYPE, RELATED_ID) VALUES
  (6, 'milestone', 'Milestone Updated',
   'Milestone "Architecture Design" status changed to in_progress.',
   0, 'MILESTONE', 4);

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 'USERS'             AS tbl, COUNT(*) AS rows FROM USERS           UNION ALL
SELECT 'PROJECTS'          AS tbl, COUNT(*) AS rows FROM PROJECTS         UNION ALL
SELECT 'PROJECT_MEMBERS'   AS tbl, COUNT(*) AS rows FROM PROJECT_MEMBERS  UNION ALL
SELECT 'MILESTONES'        AS tbl, COUNT(*) AS rows FROM MILESTONES       UNION ALL
SELECT 'TASKS'             AS tbl, COUNT(*) AS rows FROM TASKS            UNION ALL
SELECT 'TASK_DEPENDENCIES' AS tbl, COUNT(*) AS rows FROM TASK_DEPENDENCIES UNION ALL
SELECT 'COMMENTS'          AS tbl, COUNT(*) AS rows FROM COMMENTS         UNION ALL
SELECT 'ACTIVITY_LOGS'     AS tbl, COUNT(*) AS rows FROM ACTIVITY_LOGS    UNION ALL
SELECT 'NOTIFICATIONS'     AS tbl, COUNT(*) AS rows FROM NOTIFICATIONS
ORDER BY 1;

-- Check project progress was auto-calculated by trigger
SELECT PROJECT_ID, NAME, PROGRESS || '%' AS PROGRESS FROM PROJECTS ORDER BY PROJECT_ID;

PROMPT ✓  Seed data inserted successfully.

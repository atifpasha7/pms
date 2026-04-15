# Project Management System — Backend

**Stack:** Node.js 20 · Express.js 4 · Oracle 23ai Free · JWT · bcrypt

---

## Quick Start

### 1. Oracle 23ai Free Setup

```sql
-- Connect as SYSDBA
sqlplus sys/YourSysPassword@localhost:1521/FREEPDB1 as sysdba

-- Create application user
ALTER SESSION SET CONTAINER = FREEPDB1;
CREATE USER pms_user IDENTIFIED BY "YourPassword123";
GRANT CONNECT, RESOURCE, CREATE VIEW TO pms_user;
ALTER USER pms_user QUOTA UNLIMITED ON USERS;

-- Connect as pms_user and run schema
@sql/schema.sql

-- Load seed data (optional)
@sql/seed.sql

-- Verify
SELECT object_name, object_type, status FROM user_objects
ORDER BY object_type, object_name;
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Oracle credentials and JWT secret
npm run dev
```

### 3. Verify

```bash
curl http://localhost:5000/api/health
```

---

## REST API Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login → JWT |
| GET | /api/auth/me | Current user |
| GET | /api/dashboard/stats | KPI stats |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Project detail |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| GET | /api/projects/:id/tasks | Project tasks |
| POST | /api/projects/:id/tasks | Create task |
| PATCH | /api/tasks/:id/status | Kanban status update |
| GET | /api/tasks/my-tasks | My assigned tasks |
| GET | /api/notifications | Inbox |

All protected endpoints require: `Authorization: Bearer <token>`

---

## Database Objects

| Type | Name | Purpose |
|------|------|---------|
| Table | USERS | User accounts |
| Table | PROJECTS | Project entities |
| Table | PROJECT_MEMBERS | M:N user-project membership |
| Table | MILESTONES | Project checkpoints |
| Table | TASKS | Work items |
| Table | TASK_DEPENDENCIES | M:N task blocking |
| Table | COMMENTS | Task discussion |
| Table | ACTIVITY_LOGS | Immutable audit trail |
| Table | NOTIFICATIONS | Per-user inbox |
| View | V_PROJECT_SUMMARY | Project listing with aggregates |
| View | V_TASK_DETAIL | Task detail with resolved names |
| View | V_UNREAD_COUNTS | Unread notification counts |
| Trigger | trg_recalc_project_progress | Auto-compute % from tasks |
| Trigger | trg_auto_add_owner_member | Auto-add owner to members |
| Trigger | trg_protect_activity_logs | Immutable audit enforcement |
| Trigger | trg_milestone_overdue | Auto-mark overdue milestones |
| Procedure | sp_log_activity | Insert activity log row |
| Procedure | sp_create_notification | Insert notification row |
| Procedure | sp_get_project_stats | Aggregated project stats |

---

## Seed Users

| Email | Password | Role |
|-------|----------|------|
| admin@pms.dev | Password123! | admin |
| sarah@pms.dev | Password123! | manager |
| alex@pms.dev | Password123! | manager |
| priya@pms.dev | Password123! | member |
| omar@pms.dev | Password123! | member |
| zara@pms.dev | Password123! | member |

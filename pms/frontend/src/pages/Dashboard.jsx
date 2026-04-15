// src/pages/Dashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, CheckSquare, Users, TrendingUp,
  AlertCircle, Clock, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { useDashboard } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  StatCard, ProgressBar, StatusBadge, PriorityBadge,
  Avatar, PageLoader, Spinner,
} from '../components/common/index.jsx';
import { fmtDate, fmtRelative, getStatusCfg } from '../utils/helpers.js';

/* ── Custom tooltip for BarChart ─────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
      borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill, display: 'flex', gap: 8 }}>
          <span>{p.name}:</span><span style={{ fontWeight: 600 }}>{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

/* ── Activity icon by action ──────────────────────────────────── */
const actionColor = (action) => ({
  CREATE: 'var(--success)', UPDATE: 'var(--accent)', DELETE: 'var(--danger)',
  STATUS_CHANGE: 'var(--warning)', COMMENT: 'var(--purple)', MEMBER_ADD: 'var(--accent)',
}[action] || 'var(--text-muted)');

const Dashboard = () => {
  const { stats, overview, taskSummary, activity, deadlines, loading } = useDashboard();
  const { user }   = useAuth();
  const navigate   = useNavigate();

  if (loading) return <PageLoader />;

  /* Task summary pie data */
  const pieData = taskSummary ? [
    { name: 'Todo',        value: taskSummary.todo,        fill: '#94A3B8' },
    { name: 'In Progress', value: taskSummary.in_progress, fill: '#7C3AED' },
    { name: 'Review',      value: taskSummary.review,      fill: '#FFB347' },
    { name: 'Done',        value: taskSummary.done,        fill: '#00FF88' },
  ].filter(d => d.value > 0) : [];

  /* Project progress bar chart data */
  const barData = overview.slice(0, 8).map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    progress: p.progress,
    fill: p.color || 'var(--accent)',
  }));

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.75rem' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          <span style={{ color: 'var(--accent)' }}>{user?.fullName?.split(' ')[0] || user?.username}</span> 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Here's what's happening across your projects today.
        </p>
      </div>

      {/* ── KPI Stats ──────────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { icon: <FolderKanban size={20} />, label: 'Total Projects',  value: stats?.totalProjects,  sub: `${stats?.activeProjects ?? 0} active`,   color: 'var(--accent)'   },
          { icon: <CheckSquare  size={20} />, label: 'Total Tasks',     value: stats?.totalTasks,     sub: `${stats?.doneTasks ?? 0} completed`,      color: 'var(--success)'  },
          { icon: <Users        size={20} />, label: 'Team Members',    value: stats?.teamSize,       sub: 'across all projects',                      color: 'var(--purple)'   },
          { icon: <TrendingUp   size={20} />, label: 'Completion Rate', value: `${stats?.completionPct ?? 0}%`, sub: `${stats?.overdueTasks ?? 0} overdue`, color: 'var(--warning)'  },
        ].map((s, i) => (
          <div key={s.label} className={`stagger-${i + 1}`} style={{ animation: 'fadeInUp 0.4s ease-out both' }}>
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* ── My open tasks alert ─────────────────────────────────── */}
      {stats?.myOpenTasks > 0 && (
        <div style={{ marginBottom: 28, padding: '14px 20px',
          background: 'var(--accent-dim)', border: '1px solid var(--accent)',
          borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer' }}
          onClick={() => navigate('/my-tasks')}>
          <CheckSquare size={18} color="var(--accent)" />
          <span style={{ fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600 }}>
            You have <strong>{stats.myOpenTasks}</strong> open task{stats.myOpenTasks !== 1 ? 's' : ''} assigned to you.
          </span>
          <ArrowRight size={16} color="var(--accent)" style={{ marginLeft: 'auto' }} />
        </div>
      )}

      {/* ── Charts row ─────────────────────────────────────────── */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        {/* Project progress chart */}
        <div className="card">
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>
            Project Progress
          </h3>
          {barData.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: '0.875rem' }}>No projects yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={20}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="progress" radius={[6,6,0,0]} name="Progress">
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Task distribution pie */}
        <div className="card">
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>
            Task Distribution
          </h3>
          {pieData.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: '0.875rem' }}>No tasks yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
                  borderRadius: 8, fontSize: '0.8rem' }} />
                <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Bottom row ─────────────────────────────────────────── */}
      <div className="grid-2">
        {/* Upcoming deadlines */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem' }}>
              Upcoming Deadlines
            </h3>
            <Clock size={16} color="var(--text-muted)" />
          </div>
          {deadlines.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No upcoming deadlines 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deadlines.slice(0, 6).map(d => (
                <div key={d.taskId} style={{ display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10, background: 'var(--bg-elevated)',
                  cursor: 'pointer', transition: 'background 150ms' }}
                  onClick={() => navigate('/my-tasks')}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%',
                    background: d.color || 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.projectName}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                      {fmtDate(d.dueDate)}
                    </div>
                    <PriorityBadge priority={d.priority} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card">
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>
            Recent Activity
          </h3>
          {activity.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent activity.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {activity.slice(0, 8).map((a, i) => (
                <div key={a.logId} style={{ display: 'flex', gap: 12, paddingBottom: 14,
                  borderBottom: i < activity.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  marginBottom: 14 }}>
                  <Avatar user={a.user} size={28} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600 }}>{a.user.fullName || a.user.username}</span>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{a.description}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                      {a.projectName && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.projectName}</span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {fmtRelative(a.createdAt)}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: actionColor(a.action),
                    background: actionColor(a.action) + '22', padding: '2px 7px', borderRadius: 99,
                    alignSelf: 'flex-start', flexShrink: 0 }}>
                    {a.action}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

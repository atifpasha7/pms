// src/pages/MyTasks.jsx
import React, { useState, useEffect } from 'react';
import { ListTodo, Calendar, Clock, MessageCircle } from 'lucide-react';
import { tasksApi } from '../api/index.js';
import {
  StatusBadge, PriorityBadge, Avatar, PageLoader,
  EmptyState, SearchInput, ProgressBar,
} from '../components/common/index.jsx';
import { fmtDate, fmtRelative, isOverdue, getApiError, KANBAN_COLUMNS } from '../utils/helpers.js';
import toast from 'react-hot-toast';

const MyTasks = () => {
  const [tasks,    setTasks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState('');
  const [view,     setView]     = useState('list'); // list | grouped

  useEffect(() => {
    tasksApi.getMyTasks({ limit: 200 })
      .then(({ data }) => setTasks(data.data))
      .catch(err => toast.error(getApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksApi.updateStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, status: newStatus } : t));
    } catch (err) { toast.error(getApiError(err)); }
  };

  const filtered = tasks.filter(t => {
    if (statusF && t.status !== statusF) return false;
    if (search  && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const overdue  = filtered.filter(t => isOverdue(t.dueDate, t.status));
  const upcoming = filtered.filter(t => !isOverdue(t.dueDate, t.status) && t.status !== 'done' && t.status !== 'cancelled');
  const done     = filtered.filter(t => t.status === 'done');

  const TaskCard = ({ task }) => {
    const od = isOverdue(task.dueDate, task.status);
    return (
      <div style={{ background: 'var(--bg-elevated)', border: `1px solid ${od ? 'var(--danger)' : 'var(--border)'}`,
        borderRadius: 12, padding: '16px', transition: 'all 150ms', marginBottom: 8 }}
        onMouseEnter={e => e.currentTarget.style.borderColor = od ? 'var(--danger)' : 'var(--border-bright)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = od ? 'var(--danger)' : 'var(--border)'}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{task.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%',
                background: task.project?.color || 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{task.project?.name}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <PriorityBadge priority={task.priority} size="sm" />
            <StatusBadge status={task.status} size="xs" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 14, fontSize: '0.75rem', color: 'var(--text-muted)', alignItems: 'center' }}>
            {task.dueDate && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4,
                color: od ? 'var(--danger)' : 'var(--text-muted)', fontWeight: od ? 600 : 400 }}>
                <Calendar size={12} /> {od ? 'Overdue · ' : ''}{fmtDate(task.dueDate)}
              </span>
            )}
            {task.estimatedHours > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> {task.estimatedHours}h est.
              </span>
            )}
            {task.commentCount > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MessageCircle size={12} /> {task.commentCount}
              </span>
            )}
            {task.milestone && (
              <span style={{ color: 'var(--warning)', fontSize: '0.7rem' }}>🏁 {task.milestone.title}</span>
            )}
          </div>
          {/* Quick status selector */}
          <select value={task.status}
            onChange={e => handleStatusChange(task.taskId, e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ padding: '3px 8px', fontSize: '0.72rem', background: 'var(--bg-surface)',
              border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {['todo','in_progress','review','done','cancelled'].map(s =>
              <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
      </div>
    );
  };

  if (loading) return <PageLoader />;

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">
            {tasks.filter(t => !['done','cancelled'].includes(t.status)).length} open
            {' · '}{tasks.filter(t => t.status === 'done').length} completed
          </p>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface)',
          border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {['list','grouped'].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.8rem',
                fontFamily: "'Syne', sans-serif", fontWeight: 600, border: 'none', cursor: 'pointer',
                background: view === v ? 'var(--accent)' : 'none',
                color: view === v ? '#0A0E1A' : 'var(--text-muted)',
                transition: 'all 150ms' }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search my tasks…"
          style={{ flex: '1 1 200px', minWidth: 200 }} />
        <select className="form-select" value={statusF} onChange={e => setStatusF(e.target.value)} style={{ width: 150 }}>
          <option value="">All statuses</option>
          {['todo','in_progress','review','done','cancelled'].map(s =>
            <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {/* Summary mini-stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'Overdue',     count: overdue.length,  color: 'var(--danger)' },
          { label: 'In Progress', count: tasks.filter(t=>t.status==='in_progress').length, color: 'var(--purple)' },
          { label: 'Review',      count: tasks.filter(t=>t.status==='review').length, color: 'var(--warning)' },
          { label: 'Completed',   count: done.length,     color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: '1.5rem', color: s.color, lineHeight: 1 }}>{s.count}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ListTodo size={28} color="var(--text-muted)" />}
          title="No tasks assigned to you"
          description="Tasks assigned to you across all projects will appear here." />
      ) : view === 'grouped' ? (
        /* Grouped by status */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {KANBAN_COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.id);
            return (
              <div key={col.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem',
                    color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)',
                    background: 'var(--bg-elevated)', padding: '1px 8px', borderRadius: 99 }}>
                    {colTasks.length}
                  </span>
                </div>
                {colTasks.map(t => <TaskCard key={t.taskId} task={t} />)}
                {colTasks.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)',
                    fontSize: '0.8rem', border: '1px dashed var(--border)', borderRadius: 10 }}>
                    Nothing here
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat list grouped by overdue / upcoming / done */
        <div>
          {overdue.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700,
                  fontSize: '0.8rem', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Overdue · {overdue.length}
                </span>
              </div>
              {overdue.map(t => <TaskCard key={t.taskId} task={t} />)}
            </div>
          )}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700,
                  fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Active · {upcoming.length}
                </span>
              </div>
              {upcoming.map(t => <TaskCard key={t.taskId} task={t} />)}
            </div>
          )}
          {done.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700,
                  fontSize: '0.8rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Completed · {done.length}
                </span>
              </div>
              {done.map(t => <TaskCard key={t.taskId} task={t} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyTasks;

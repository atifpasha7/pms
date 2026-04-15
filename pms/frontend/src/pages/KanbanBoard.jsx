// src/pages/KanbanBoard.jsx
import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, GripVertical, MessageCircle, Calendar, Clock } from 'lucide-react';
import { useTasks } from '../hooks/index.js';
import { StatusBadge, PriorityBadge, Avatar, Button, Modal, PageLoader, EmptyState } from '../components/common/index.jsx';
import { KANBAN_COLUMNS, fmtDateShort, isOverdue, getApiError } from '../utils/helpers.js';
import toast from 'react-hot-toast';
import { tasksApi } from '../api/index.js';

/* ── Task card inside Kanban column ──────────────────────────── */
const KanbanCard = ({ task, onDragStart, onClick }) => {
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      style={{ background: 'var(--bg-elevated)', border: `1px solid var(--border)`,
        borderRadius: 12, padding: '14px', cursor: 'grab', transition: 'all 150ms',
        borderLeft: `3px solid ${overdue ? 'var(--danger)' : 'transparent'}`,
        userSelect: 'none' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{task.title}</p>
        <PriorityBadge priority={task.priority} size="sm" />
      </div>
      {task.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {task.tags.slice(0,3).map(tag => (
            <span key={tag} style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: 99,
              background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600 }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 10, fontSize: '0.72rem', color: 'var(--text-muted)', alignItems: 'center' }}>
          {task.commentCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <MessageCircle size={11} />{task.commentCount}
            </span>
          )}
          {task.dueDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3,
              color: overdue ? 'var(--danger)' : 'var(--text-muted)' }}>
              <Calendar size={11} />{fmtDateShort(task.dueDate)}
            </span>
          )}
          {task.estimatedHours > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={11} />{task.estimatedHours}h
            </span>
          )}
        </div>
        {task.assignee && <Avatar user={task.assignee} size={22} />}
      </div>
    </div>
  );
};

/* ── Task quick-create form ───────────────────────────────────── */
const QuickTaskForm = ({ projectId, status, onCreated, onClose }) => {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const { data } = await tasksApi.create(projectId, { title, status });
      onCreated(data.data);
      setTitle('');
      onClose();
    } catch (err) { toast.error(getApiError(err)); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} style={{ padding: '0 16px 12px' }}>
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Task title…" className="form-input"
        style={{ marginBottom: 8, fontSize: '0.8125rem' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <Button type="submit" size="sm" loading={loading}>Add</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};

/* ── Main Kanban board ───────────────────────────────────────── */
const KanbanBoard = ({ projectId: propProjectId }) => {
  const params       = useParams();
  const projectId    = propProjectId || params.projectId || params.id;
  const { tasks, setTasks, loading, updateTaskStatus } = useTasks(projectId);
  const [addingTo, setAddingTo] = useState(null); // column id where quick-add is open
  const dragTask  = useRef(null);
  const dragFrom  = useRef(null);

  const tasksByCol = (colId) => tasks.filter(t => t.status === colId)
    .sort((a,b) => a.sortOrder - b.sortOrder);

  const onDragStart = (e, task, fromCol) => {
    dragTask.current = task;
    dragFrom.current = fromCol;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = async (e, toCol) => {
    e.preventDefault();
    const task = dragTask.current;
    if (!task || task.status === toCol) return;
    // Optimistic update
    setTasks(prev => prev.map(t => t.taskId === task.taskId ? { ...t, status: toCol } : t));
    try {
      await updateTaskStatus(task.taskId, toCol);
    } catch (err) {
      setTasks(prev => prev.map(t => t.taskId === task.taskId ? { ...t, status: task.status } : t));
      toast.error(getApiError(err));
    }
    dragTask.current = null;
  };

  const colAccent = {
    todo: '#94A3B8', in_progress: '#7C3AED', review: '#FFB347', done: '#00FF88',
  };

  if (loading) return <PageLoader />;

  return (
    <div className="kanban-board">
      {KANBAN_COLUMNS.map(col => (
        <div key={col.id} className="kanban-column"
          style={{ borderTop: `3px solid ${colAccent[col.id]}` }}>
          {/* Column header */}
          <div className="kanban-col-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: colAccent[col.id] }} />
              <span className="kanban-col-title" style={{ color: colAccent[col.id] }}>{col.label}</span>
            </div>
            <span className="kanban-col-count">{tasksByCol(col.id).length}</span>
          </div>

          {/* Drop zone */}
          <div className="kanban-col-body"
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = 'rgba(0,212,255,0.04)'; }}
            onDragLeave={e => { e.currentTarget.style.background = ''; }}
            onDrop={e => { e.currentTarget.style.background = ''; onDrop(e, col.id); }}>
            {tasksByCol(col.id).length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)',
                fontSize: '0.8rem', borderRadius: 8, border: '1px dashed var(--border)' }}>
                Drop tasks here
              </div>
            )}
            {tasksByCol(col.id).map(task => (
              <KanbanCard key={task.taskId} task={task}
                onDragStart={(e) => onDragStart(e, task, col.id)}
                onClick={() => {}} />
            ))}

            {/* Quick add */}
            {addingTo === col.id ? (
              <QuickTaskForm projectId={projectId} status={col.id}
                onCreated={newTask => setTasks(prev => [...prev, newTask])}
                onClose={() => setAddingTo(null)} />
            ) : (
              <button onClick={() => setAddingTo(col.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                  width: '100%', background: 'none', border: '1px dashed var(--border)',
                  borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer',
                  fontSize: '0.8rem', transition: 'all 150ms' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                <Plus size={14} /> Add task
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;

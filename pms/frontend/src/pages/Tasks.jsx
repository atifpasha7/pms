// src/pages/Tasks.jsx
import React, { useState, useEffect } from 'react';
import { CheckSquare } from 'lucide-react';
import { tasksApi } from '../api/index.js';
import { StatusBadge, PriorityBadge, PageLoader, EmptyState, SearchInput } from '../components/common/index.jsx';
import { fmtDate, getApiError } from '../utils/helpers.js';
import toast from 'react-hot-toast';

const Tasks = () => {
  const [tasks,    setTasks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [priority, setPriority] = useState('');

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
    if (status   && t.status   !== status)   return false;
    if (priority && t.priority !== priority) return false;
    if (search   && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <PageLoader />;

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Tasks</h1>
          <p className="page-subtitle">{tasks.length} tasks across your projects</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tasks…"
          style={{ flex: '1 1 200px', minWidth: 200 }} />
        <select className="form-select" value={status} onChange={e => setStatus(e.target.value)} style={{ width: 150 }}>
          <option value="">All statuses</option>
          {['todo','in_progress','review','done','cancelled'].map(s =>
            <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select className="form-select" value={priority} onChange={e => setPriority(e.target.value)} style={{ width: 140 }}>
          <option value="">All priorities</option>
          {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CheckSquare size={28} color="var(--text-muted)" />}
          title="No tasks found" description="Adjust your filters or wait for tasks to be assigned." />
      ) : (
        <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Due date</th><th>Update</th></tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.taskId}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.title}</div>
                    {t.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {t.tags.slice(0,3).map(tag => (
                          <span key={tag} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 99,
                            background: 'var(--accent-dim)', color: 'var(--accent)' }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%',
                        background: t.project?.color || 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.project?.name}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={t.status} /></td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td style={{ fontSize: '0.8rem', color: t.isOverdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {t.dueDate ? fmtDate(t.dueDate) : '—'}
                  </td>
                  <td>
                    <select className="form-select" value={t.status}
                      onChange={e => handleStatusChange(t.taskId, e.target.value)}
                      style={{ padding: '4px 10px', fontSize: '0.75rem', width: 'auto' }}>
                      {['todo','in_progress','review','done','cancelled'].map(s =>
                        <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Tasks;

// src/pages/Projects.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Filter } from 'lucide-react';
import { useProjects } from '../hooks/index.js';
import { Button, Modal, EmptyState, SkeletonCard, SearchInput, StatusBadge, PriorityBadge, ProgressBar, AvatarGroup } from '../components/common/index.jsx';
import { fmtDate, getApiError } from '../utils/helpers.js';
import toast from 'react-hot-toast';

/* ── ProjectCard ──────────────────────────────────────────────── */
const ProjectCard = ({ project, onClick }) => (
  <div onClick={onClick}
    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'all 200ms',
      position: 'relative', overflow: 'hidden' }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
    {/* Color strip */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
      background: project.color || 'var(--accent)', borderRadius: '16px 16px 0 0' }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem',
          marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.name}
        </h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {project.description || 'No description provided.'}
        </p>
      </div>
      <StatusBadge status={project.status} size="xs" />
    </div>

    {/* Progress */}
    <ProgressBar value={project.progress} height={5} showLabel />

    {/* Meta */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>📋 {project.stats?.totalTasks || 0} tasks</span>
        {project.endDate && <span>📅 {fmtDate(project.endDate)}</span>}
      </div>
      <PriorityBadge priority={project.priority} size="sm" />
    </div>
  </div>
);

/* ── ProjectForm ──────────────────────────────────────────────── */
const COLORS = ['#00D4FF','#7C3AED','#00FF88','#FFB347','#FF4560','#F472B6','#34D399','#60A5FA'];

const ProjectForm = ({ onSubmit, loading, initial = {} }) => {
  const [form, setForm] = useState({
    name: initial.name || '', description: initial.description || '',
    status: initial.status || 'planning', priority: initial.priority || 'medium',
    startDate: initial.startDate ? initial.startDate.slice(0,10) : '',
    endDate: initial.endDate ? initial.endDate.slice(0,10) : '',
    budget: initial.budget || '', color: initial.color || '#00D4FF',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="form-group">
        <label className="form-label">Project name *</label>
        <input className="form-input" value={form.name} required
          onChange={e => set('name', e.target.value)} placeholder="E.g. E-Commerce Platform" />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="What is this project about?" rows={3} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            {['planning','active','on_hold','completed','cancelled'].map(s =>
              <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Start date</label>
          <input type="date" className="form-input" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">End date</label>
          <input type="date" className="form-input" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Budget</label>
        <input type="number" className="form-input" value={form.budget} min="0"
          onChange={e => set('budget', e.target.value)} placeholder="0.00" />
      </div>
      {/* Color picker */}
      <div className="form-group">
        <label className="form-label">Project colour</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('color', c)}
              style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                cursor: 'pointer', outline: form.color === c ? `3px solid ${c}` : 'none',
                outlineOffset: 2, transition: 'transform 150ms' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''} />
          ))}
        </div>
      </div>
      <Button type="submit" size="md" loading={loading} style={{ alignSelf: 'flex-end', minWidth: 120 }}>
        {initial.name ? 'Save changes' : 'Create project'}
      </Button>
    </form>
  );
};

/* ── Main page ────────────────────────────────────────────────── */
const Projects = () => {
  const navigate   = useNavigate();
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [priorityFilter, setPriority] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating]     = useState(false);
  const { projects, loading, createProject } = useProjects();

  const filtered = projects.filter(p => {
    if (statusFilter   && p.status   !== statusFilter)   return false;
    if (priorityFilter && p.priority !== priorityFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async (form) => {
    setCreating(true);
    try {
      const proj = await createProject(form);
      setCreateOpen(false);
      navigate(`/projects/${proj.projectId}`);
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          New project
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search projects…" style={{ flex: '1 1 200px', minWidth: 200 }} />
        <select className="form-select" value={statusFilter} onChange={e => setStatus(e.target.value)}
          style={{ width: 150 }}>
          <option value="">All statuses</option>
          {['planning','active','on_hold','completed','cancelled'].map(s =>
            <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select className="form-select" value={priorityFilter} onChange={e => setPriority(e.target.value)}
          style={{ width: 140 }}>
          <option value="">All priorities</option>
          {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid-3">
          {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={28} color="var(--text-muted)" />}
          title={projects.length === 0 ? 'No projects yet' : 'No matching projects'}
          description={projects.length === 0 ? 'Create your first project to get started.' : 'Try adjusting your filters.'}
          action={projects.length === 0
            ? <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>Create project</Button>
            : null}
        />
      ) : (
        <div className="grid-3">
          {filtered.map((p, i) => (
            <div key={p.projectId} className={`stagger-${Math.min(i+1, 4)}`}
              style={{ animation: 'fadeInUp 0.35s ease-out both' }}>
              <ProjectCard project={p} onClick={() => navigate(`/projects/${p.projectId}`)} />
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New project" size="lg">
        <ProjectForm onSubmit={handleCreate} loading={creating} />
      </Modal>
    </div>
  );
};

export default Projects;

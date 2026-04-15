// src/pages/ProjectDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trash2, Edit2, Users, CheckSquare,
  Flag, Activity, LayoutGrid, ListChecks, Plus,
  Calendar, DollarSign, User,
} from 'lucide-react';
import { projectsApi, tasksApi } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Button, StatusBadge, PriorityBadge, ProgressBar, Avatar,
  Modal, ConfirmDialog, PageLoader, EmptyState,
} from '../components/common/index.jsx';
import KanbanBoard from './KanbanBoard.jsx';
import { fmtDate, fmtRelative, getApiError } from '../utils/helpers.js';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: <LayoutGrid size={14} /> },
  { id: 'kanban',     label: 'Board',      icon: <LayoutGrid size={14} /> },
  { id: 'tasks',      label: 'Tasks',      icon: <ListChecks size={14} /> },
  { id: 'milestones', label: 'Milestones', icon: <Flag      size={14} /> },
  { id: 'members',    label: 'Members',    icon: <Users     size={14} /> },
  { id: 'activity',   label: 'Activity',   icon: <Activity  size={14} /> },
];

/* ── Task row ────────────────────────────────────────────────── */
const TaskRow = ({ task, onStatusChange }) => (
  <tr>
    <td>
      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{task.title}</div>
      {task.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {task.tags.slice(0,3).map(t => (
            <span key={t} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 99,
              background: 'var(--accent-dim)', color: 'var(--accent)' }}>{t}</span>
          ))}
        </div>
      )}
    </td>
    <td><StatusBadge status={task.status} /></td>
    <td><PriorityBadge priority={task.priority} /></td>
    <td>
      {task.assignee
        ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar user={task.assignee} size={24} />
            <span style={{ fontSize: '0.8rem' }}>{task.assignee.fullName}</span>
          </div>
        : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unassigned</span>}
    </td>
    <td style={{ fontSize: '0.8rem', color: task.isOverdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
      {task.dueDate ? fmtDate(task.dueDate) : '—'}
    </td>
    <td>
      <select className="form-select" value={task.status}
        onChange={e => onStatusChange(task.taskId, e.target.value)}
        style={{ padding: '4px 10px', fontSize: '0.75rem', width: 'auto' }}>
        {['todo','in_progress','review','done','cancelled'].map(s =>
          <option key={s} value={s}>{s.replace('_',' ')}</option>)}
      </select>
    </td>
  </tr>
);

/* ── Milestone card ─────────────────────────────────────────── */
const MilestoneCard = ({ ms }) => (
  <div className="card">
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem' }}>{ms.title}</h4>
        {ms.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{ms.description}</p>}
      </div>
      <StatusBadge status={ms.status} />
    </div>
    <ProgressBar value={ms.progress} height={4} showLabel />
    <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
      <span>📋 {ms.totalTasks} tasks ({ms.doneTasks} done)</span>
      {ms.dueDate && <span>📅 {fmtDate(ms.dueDate)}</span>}
    </div>
  </div>
);

/* ── Task create form ───────────────────────────────────────── */
const TaskForm = ({ projectId, members, onCreated, onClose }) => {
  const [form, setForm] = useState({ title:'', description:'', priority:'medium', status:'todo', assignedTo:'', dueDate:'', estimatedHours:'' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await tasksApi.create(projectId, {
        ...form, assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : 0,
      });
      onCreated(data.data); toast.success('Task created!'); onClose();
    } catch (err) { toast.error(getApiError(err)); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="form-group">
        <label className="form-label">Title *</label>
        <input className="form-input" required value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Task title…" />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={form.description} onChange={e=>set('description',e.target.value)} rows={2} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e=>set('status',e.target.value)}>
            {['todo','in_progress','review','done'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={form.priority} onChange={e=>set('priority',e.target.value)}>
            {['low','medium','high','critical'].map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Assignee</label>
          <select className="form-select" value={form.assignedTo} onChange={e=>set('assignedTo',e.target.value)}>
            <option value="">Unassigned</option>
            {members.map(m=><option key={m.userId} value={m.userId}>{m.fullName}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Due date</label>
          <input type="date" className="form-input" value={form.dueDate} onChange={e=>set('dueDate',e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Est. hours</label>
          <input type="number" className="form-input" value={form.estimatedHours} min="0" onChange={e=>set('estimatedHours',e.target.value)} placeholder="0" />
        </div>
      </div>
      <Button type="submit" loading={loading} style={{ alignSelf:'flex-end' }}>Create task</Button>
    </form>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject]   = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks]       = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('overview');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatus, setTaskStatus] = useState('');
  const [msModal, setMsModal]   = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [msForm, setMsForm]     = useState({ title:'', description:'', dueDate:'' });
  const [taskModal, setTaskModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pR, mR, tR, aR] = await Promise.all([
          projectsApi.getById(id),
          projectsApi.getMilestones(id),
          tasksApi.getByProject(id, { limit: 200 }),
          projectsApi.getActivity(id, 30),
        ]);
        setProject(pR.data.data);
        setMilestones(mR.data.data);
        setTasks(tR.data.data);
        setActivity(aR.data.data);
      } catch (err) { toast.error(getApiError(err)); navigate('/projects'); }
      finally { setLoading(false); }
    })();
  }, [id]); // eslint-disable-line

  const handleStatusChange = async (taskId, status) => {
    try {
      await tasksApi.updateStatus(taskId, status);
      setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, status } : t));
      const r = await projectsApi.getById(id);
      setProject(r.data.data);
    } catch (err) { toast.error(getApiError(err)); }
  };

  const handleCreateMilestone = async (e) => {
    e.preventDefault(); setMsLoading(true);
    try {
      await projectsApi.createMilestone(id, msForm);
      const r = await projectsApi.getMilestones(id);
      setMilestones(r.data.data);
      setMsModal(false);
      setMsForm({ title:'', description:'', dueDate:'' });
      toast.success('Milestone created!');
    } catch (err) { toast.error(getApiError(err)); }
    finally { setMsLoading(false); }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      await projectsApi.delete(id);
      toast.success('Project deleted.');
      navigate('/projects');
    } catch (err) { toast.error(getApiError(err)); setDeleting(false); }
  };

  if (loading) return <PageLoader />;
  if (!project) return null;

  const isOwner = project.owner?.userId === user?.userId || user?.role === 'admin';
  const members = project.members || [];
  const filteredTasks = tasks.filter(t => {
    if (taskStatus && t.status !== taskStatus) return false;
    if (taskSearch && !t.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* ─── Page header ─────────────────────────────────────── */}
      <div style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)', padding:'24px 32px' }}>
        <button onClick={() => navigate('/projects')}
          style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text-muted)',
            fontSize:'0.8rem', background:'none', border:'none', cursor:'pointer', marginBottom:16,
            fontFamily:"'DM Sans',sans-serif", transition:'color 150ms' }}
          onMouseEnter={e=>e.currentTarget.style.color='var(--text-primary)'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
          <ArrowLeft size={14}/> Back to projects
        </button>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8, flexWrap:'wrap' }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:project.color,
                boxShadow:`0 0 10px ${project.color}66`, flexShrink:0 }} />
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', margin:0 }}>
                {project.name}
              </h2>
              <StatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
            </div>
            {project.description && (
              <p style={{ color:'var(--text-secondary)', fontSize:'0.875rem', maxWidth:640, marginBottom:12 }}>
                {project.description}
              </p>
            )}
            <div style={{ display:'flex', gap:20, fontSize:'0.8rem', color:'var(--text-muted)', flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ display:'flex', alignItems:'center', gap:5 }}><User size={13}/> {project.owner?.fullName}</span>
              {project.startDate && (
                <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <Calendar size={13}/> {fmtDate(project.startDate)} → {fmtDate(project.endDate)}
                </span>
              )}
              {project.budget > 0 && (
                <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <DollarSign size={13}/> {Number(project.budget).toLocaleString()}
                </span>
              )}
              <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                <Users size={13}/> {project.stats?.memberCount||0} members
              </span>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:12, flexShrink:0 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.75rem',
                color:'var(--accent)', lineHeight:1 }}>{project.progress}%</div>
              <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2 }}>complete</div>
            </div>
            <div style={{ width:160 }}><ProgressBar value={project.progress} height={6}/></div>
            {isOwner && (
              <div style={{ display:'flex', gap:8 }}>
                <Button variant="danger" size="sm" icon={<Trash2 size={13}/>}
                  onClick={() => setDeleteDialog(true)}>Delete</Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display:'flex', gap:24, marginTop:20, paddingTop:20, borderTop:'1px solid var(--border)', flexWrap:'wrap' }}>
          {[
            { label:'Total',   v:project.stats?.totalTasks||0,       c:'var(--text-secondary)' },
            { label:'Done',    v:project.stats?.doneTasks||0,         c:'var(--success)' },
            { label:'Active',  v:project.stats?.inProgressTasks||0,   c:'var(--purple)' },
            { label:'To Do',   v:project.stats?.todoTasks||0,         c:'var(--text-muted)' },
            { label:'Milestones', v:project.stats?.milestoneCount||0, c:'var(--warning)' },
          ].map(s=>(
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'1.2rem', color:s.c }}>{s.v}</div>
              <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────── */}
      <div style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)',
        padding:'0 32px', display:'flex', gap:4, overflowX:'auto' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'12px 16px',
              background:'none', border:'none',
              borderBottom:`2px solid ${tab===t.id?'var(--accent)':'transparent'}`,
              color: tab===t.id ? 'var(--accent)' : 'var(--text-muted)',
              fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:'0.8125rem',
              cursor:'pointer', transition:'all 150ms', whiteSpace:'nowrap' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ─── Content ─────────────────────────────────────────── */}
      <div style={{ padding: tab==='kanban' ? '24px 32px 0' : '28px 32px' }}>

        {/* OVERVIEW */}
        {tab==='overview' && (
          <div className="grid-2">
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="card">
                <h4 style={{ fontFamily:"'Syne',sans-serif", fontSize:'0.8rem', fontWeight:700,
                  color:'var(--text-muted)', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  Task Breakdown
                </h4>
                {['todo','in_progress','review','done','cancelled'].map(s=>{
                  const cnt=tasks.filter(t=>t.status===s).length;
                  if(!cnt) return null;
                  const pct=tasks.length?Math.round((cnt/tasks.length)*100):0;
                  const c={todo:'#94A3B8',in_progress:'#7C3AED',review:'#FFB347',done:'#00FF88',cancelled:'#FF4560'}[s];
                  return (
                    <div key={s} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', marginBottom:4 }}>
                        <span style={{ color:c, fontWeight:600 }}>{s.replace('_',' ')}</span>
                        <span style={{ color:'var(--text-muted)' }}>{cnt}</span>
                      </div>
                      <ProgressBar value={pct} height={4} color={c}/>
                    </div>
                  );
                })}
              </div>
              <div className="card">
                <h4 style={{ fontFamily:"'Syne',sans-serif", fontSize:'0.8rem', fontWeight:700,
                  color:'var(--text-muted)', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.08em' }}>Team</h4>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {members.slice(0,6).map(m=>(
                    <div key={m.userId} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar user={m} size={30}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'0.8rem', fontWeight:600 }}>{m.fullName}</div>
                        <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', textTransform:'capitalize' }}>{m.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card">
              <h4 style={{ fontFamily:"'Syne',sans-serif", fontSize:'0.8rem', fontWeight:700,
                color:'var(--text-muted)', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.08em' }}>Milestones</h4>
              {milestones.length===0
                ? <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>No milestones yet.</p>
                : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {milestones.slice(0,4).map(ms=><MilestoneCard key={ms.milestoneId} ms={ms}/>)}
                  </div>}
            </div>
          </div>
        )}

        {/* KANBAN */}
        {tab==='kanban' && <KanbanBoard projectId={id}/>}

        {/* TASKS */}
        {tab==='tasks' && (
          <div>
            <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
              <input value={taskSearch} onChange={e=>setTaskSearch(e.target.value)}
                placeholder="Search tasks…" className="form-input" style={{ maxWidth:260 }}/>
              <select className="form-select" value={taskStatus} onChange={e=>setTaskStatus(e.target.value)} style={{ width:140 }}>
                <option value="">All statuses</option>
                {['todo','in_progress','review','done','cancelled'].map(s=>
                  <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
              <div style={{ marginLeft:'auto' }}>
                <Button variant="primary" size="sm" icon={<Plus size={14}/>} onClick={()=>setTaskModal(true)}>New task</Button>
              </div>
            </div>
            {filteredTasks.length===0
              ? <EmptyState icon={<CheckSquare size={24} color="var(--text-muted)"/>}
                  title="No tasks found"
                  description="Create your first task to get started."
                  action={<Button variant="primary" icon={<Plus size={14}/>} onClick={()=>setTaskModal(true)}>New task</Button>}/>
              : <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due date</th><th>Update</th></tr></thead>
                    <tbody>
                      {filteredTasks.map(t=><TaskRow key={t.taskId} task={t} onStatusChange={handleStatusChange}/>)}
                    </tbody>
                  </table>
                </div>}
          </div>
        )}

        {/* MILESTONES */}
        {tab==='milestones' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
              <Button variant="primary" size="sm" icon={<Plus size={14}/>} onClick={()=>setMsModal(true)}>New milestone</Button>
            </div>
            {milestones.length===0
              ? <EmptyState icon={<Flag size={24} color="var(--text-muted)"/>}
                  title="No milestones yet"
                  description="Create milestones to track key deliverables."
                  action={<Button variant="primary" icon={<Plus size={14}/>} onClick={()=>setMsModal(true)}>New milestone</Button>}/>
              : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:16 }}>
                  {milestones.map(ms=><MilestoneCard key={ms.milestoneId} ms={ms}/>)}
                </div>}
          </div>
        )}

        {/* MEMBERS */}
        {tab==='members' && (
          <div style={{ maxWidth:640 }}>
            {members.map(m=>(
              <div key={m.userId} style={{ display:'flex', alignItems:'center', gap:14,
                padding:'14px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                <Avatar user={m} size={40}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600 }}>{m.fullName}</div>
                  <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>@{m.username} · {m.email}</div>
                </div>
                <span style={{ fontSize:'0.75rem', fontWeight:600, padding:'3px 10px', borderRadius:99,
                  background:'var(--accent-dim)', color:'var(--accent)', textTransform:'capitalize' }}>{m.role}</span>
              </div>
            ))}
          </div>
        )}

        {/* ACTIVITY */}
        {tab==='activity' && (
          <div style={{ maxWidth:640 }}>
            {activity.length===0
              ? <p style={{ color:'var(--text-muted)' }}>No activity recorded yet.</p>
              : activity.map((a,i)=>(
                <div key={a.logId} style={{ display:'flex', gap:14, paddingBottom:16,
                  borderBottom: i<activity.length-1 ? '1px solid var(--border-subtle)' : 'none', marginBottom:16 }}>
                  <Avatar user={a.user} size={32} style={{ flexShrink:0, marginTop:2 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'0.875rem' }}>
                      <strong>{a.user.fullName||a.user.username}</strong>{' '}
                      <span style={{ color:'var(--text-secondary)' }}>{a.description}</span>
                    </div>
                    {a.oldValue&&a.newValue&&(
                      <div style={{ fontSize:'0.75rem', marginTop:4, color:'var(--text-muted)' }}>
                        <span style={{ color:'var(--danger)', textDecoration:'line-through' }}>{a.oldValue}</span>
                        {' → '}
                        <span style={{ color:'var(--success)' }}>{a.newValue}</span>
                      </div>
                    )}
                    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:4 }}>{fmtRelative(a.createdAt)}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────── */}
      <Modal isOpen={msModal} onClose={()=>setMsModal(false)} title="New milestone" size="md">
        <form onSubmit={handleCreateMilestone} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" required value={msForm.title}
              onChange={e=>setMsForm(f=>({...f,title:e.target.value}))} placeholder="E.g. Backend API v1"/>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={msForm.description}
              onChange={e=>setMsForm(f=>({...f,description:e.target.value}))} rows={2}/>
          </div>
          <div className="form-group">
            <label className="form-label">Due date</label>
            <input type="date" className="form-input" value={msForm.dueDate}
              onChange={e=>setMsForm(f=>({...f,dueDate:e.target.value}))}/>
          </div>
          <Button type="submit" loading={msLoading} style={{ alignSelf:'flex-end' }}>Create milestone</Button>
        </form>
      </Modal>

      <Modal isOpen={taskModal} onClose={()=>setTaskModal(false)} title="New task" size="lg">
        <TaskForm projectId={id} members={members}
          onCreated={t=>setTasks(prev=>[...prev,t])} onClose={()=>setTaskModal(false)}/>
      </Modal>

      <ConfirmDialog isOpen={deleteDialog} onClose={()=>setDeleteDialog(false)}
        onConfirm={handleDeleteProject} loading={deleting}
        title="Delete project"
        message={`Are you sure you want to delete "${project.name}"? All tasks, milestones, and data will be permanently removed.`}
        confirmLabel="Delete project"/>
    </div>
  );
};

export default ProjectDetail;

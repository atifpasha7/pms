// src/utils/helpers.js
import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns';

/* ── Date ──────────────────────────────────────────────────── */
export const fmtDate = (d) => {
  if (!d) return '—';
  try { return format(typeof d === 'string' ? parseISO(d) : new Date(d), 'MMM d, yyyy'); }
  catch { return '—'; }
};
export const fmtDateShort = (d) => {
  if (!d) return '—';
  try { return format(typeof d === 'string' ? parseISO(d) : new Date(d), 'MMM d'); }
  catch { return '—'; }
};
export const fmtRelative = (d) => {
  if (!d) return '—';
  try { return formatDistanceToNow(typeof d === 'string' ? parseISO(d) : new Date(d), { addSuffix: true }); }
  catch { return '—'; }
};
export const isOverdue = (dueDate, status) => {
  if (!dueDate || ['done','cancelled'].includes(status)) return false;
  return isAfter(new Date(), typeof dueDate === 'string' ? parseISO(dueDate) : new Date(dueDate));
};

/* ── Status → colour & label ───────────────────────────────── */
export const STATUS_CONFIG = {
  // Task statuses
  todo:        { label: 'To Do',       color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', dot: '#94A3B8' },
  in_progress: { label: 'In Progress', color: '#7C3AED', bg: 'rgba(124,58,237,0.15)',  dot: '#7C3AED' },
  review:      { label: 'Review',      color: '#FFB347', bg: 'rgba(255,179,71,0.12)',  dot: '#FFB347' },
  done:        { label: 'Done',        color: '#00FF88', bg: 'rgba(0,255,136,0.12)',   dot: '#00FF88' },
  cancelled:   { label: 'Cancelled',   color: '#FF4560', bg: 'rgba(255,69,96,0.12)',   dot: '#FF4560' },
  // Project statuses
  planning:   { label: 'Planning',   color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', dot: '#94A3B8' },
  active:     { label: 'Active',     color: '#00D4FF', bg: 'rgba(0,212,255,0.12)',   dot: '#00D4FF' },
  on_hold:    { label: 'On Hold',    color: '#FFB347', bg: 'rgba(255,179,71,0.12)',  dot: '#FFB347' },
  completed:  { label: 'Completed',  color: '#00FF88', bg: 'rgba(0,255,136,0.12)',   dot: '#00FF88' },
  // Milestone statuses (reuse)
  pending:    { label: 'Pending',    color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', dot: '#94A3B8' },
  overdue:    { label: 'Overdue',    color: '#FF4560', bg: 'rgba(255,69,96,0.12)',   dot: '#FF4560' },
};

export const getStatusCfg = (status) =>
  STATUS_CONFIG[status] || { label: status, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', dot: '#94A3B8' };

/* ── Priority → colour & label ─────────────────────────────── */
export const PRIORITY_CONFIG = {
  low:      { label: 'Low',      color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  medium:   { label: 'Medium',   color: '#00D4FF', bg: 'rgba(0,212,255,0.1)'   },
  high:     { label: 'High',     color: '#FFB347', bg: 'rgba(255,179,71,0.1)'  },
  critical: { label: 'Critical', color: '#FF4560', bg: 'rgba(255,69,96,0.1)'   },
};
export const getPriorityCfg = (p) =>
  PRIORITY_CONFIG[p] || { label: p, color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' };

/* ── Initials avatar ────────────────────────────────────────── */
export const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

/* ── Hex → RGBA ─────────────────────────────────────────────── */
export const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

/* ── Truncate text ──────────────────────────────────────────── */
export const truncate = (str, max = 60) =>
  str && str.length > max ? `${str.slice(0, max)}…` : (str || '');

/* ── Extract error message from Axios error ─────────────────── */
export const getApiError = (err) =>
  err?.response?.data?.error || err?.response?.data?.message || err?.message || 'An unexpected error occurred.';

/* ── Kanban column definitions ─────────────────────────────── */
export const KANBAN_COLUMNS = [
  { id: 'todo',        label: 'To Do',        color: '#94A3B8' },
  { id: 'in_progress', label: 'In Progress',  color: '#7C3AED' },
  { id: 'review',      label: 'Review',       color: '#FFB347' },
  { id: 'done',        label: 'Done',         color: '#00FF88' },
];

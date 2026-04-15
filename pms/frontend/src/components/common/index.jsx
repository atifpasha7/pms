// src/components/common/index.jsx
// All shared UI primitives in one file for import simplicity.
import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { getInitials, getStatusCfg, getPriorityCfg } from '../../utils/helpers.js';

/* ══════════════════════════════════════════════════════════════
   BUTTON
   Variants: primary | secondary | ghost | danger | outline
   ══════════════════════════════════════════════════════════════ */
export const Button = ({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false,
  icon, iconRight, onClick, type = 'button',
  className = '', style = {},
}) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', fontFamily: "'Syne', sans-serif", fontWeight: 600,
    borderRadius: '8px', cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 150ms ease-out', border: '1px solid transparent',
    opacity: disabled || loading ? 0.6 : 1, whiteSpace: 'nowrap',
    outline: 'none',
  };
  const sizes = {
    sm: { padding: '6px 14px', fontSize: '0.8125rem' },
    md: { padding: '9px 20px', fontSize: '0.875rem'  },
    lg: { padding: '12px 28px', fontSize: '1rem'     },
    icon: { padding: '8px', width: '36px', height: '36px', borderRadius: '8px' },
  };
  const variants = {
    primary:   { background: 'var(--accent)', color: '#0A0E1A', borderColor: 'var(--accent)' },
    secondary: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border-bright)' },
    ghost:     { background: 'transparent', color: 'var(--text-secondary)', borderColor: 'transparent' },
    danger:    { background: 'var(--danger-dim)', color: 'var(--danger)', borderColor: 'var(--danger)' },
    outline:   { background: 'transparent', color: 'var(--accent)', borderColor: 'var(--accent)' },
    success:   { background: 'var(--success-dim)', color: 'var(--success)', borderColor: 'var(--success)' },
  };

  return (
    <button
      type={type}
      onClick={!disabled && !loading ? onClick : undefined}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      className={className}
      disabled={disabled || loading}
    >
      {loading ? (
        <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
      ) : icon}
      {size !== 'icon' && children}
      {!loading && iconRight}
    </button>
  );
};

/* ══════════════════════════════════════════════════════════════
   BADGE  — status / priority colour-coded chips
   ══════════════════════════════════════════════════════════════ */
export const StatusBadge = ({ status, size = 'sm' }) => {
  const cfg   = getStatusCfg(status);
  const sizes = { xs: { fontSize: '0.7rem', padding: '2px 7px' }, sm: { fontSize: '0.75rem', padding: '3px 10px' },
                  md: { fontSize: '0.8rem', padding: '4px 12px' } };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      borderRadius: '9999px', fontWeight: 600, fontFamily: "'Syne', sans-serif",
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}22`,
      ...sizes[size],
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

export const PriorityBadge = ({ priority, size = 'sm' }) => {
  const cfg   = getPriorityCfg(priority);
  const sizes = { sm: { fontSize: '0.75rem', padding: '3px 10px' }, md: { fontSize: '0.8rem', padding: '4px 12px' } };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      borderRadius: '9999px', fontWeight: 600, fontFamily: "'Syne', sans-serif",
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33`,
      ...sizes[size],
    }}>
      {cfg.label}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════════
   AVATAR
   ══════════════════════════════════════════════════════════════ */
export const Avatar = ({ user, size = 32, style: extraStyle = {} }) => {
  const dim   = typeof size === 'number' ? `${size}px` : size;
  const fontSize = typeof size === 'number' ? `${Math.round(size * 0.38)}px` : '14px';
  if (user?.avatarUrl) {
    return (
      <img src={user.avatarUrl} alt={user.fullName || user.username}
        style={{ width: dim, height: dim, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...extraStyle }} />
    );
  }
  const initials = getInitials(user?.fullName || user?.username || '?');
  const hue = [...(user?.username || 'A')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span style={{
      width: dim, height: dim, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},55%,30%)`, border: `1px solid hsl(${hue},55%,40%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 700, color: `hsl(${hue},80%,80%)`,
      fontFamily: "'Syne', sans-serif", userSelect: 'none', ...extraStyle,
    }}>
      {initials}
    </span>
  );
};

export const AvatarGroup = ({ users = [], max = 4, size = 26 }) => {
  const visible = users.slice(0, max);
  const extra   = users.length - max;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((u, i) => (
        <span key={u.userId || i} style={{ marginLeft: i === 0 ? 0 : -8 }}
          data-tooltip={u.fullName || u.username}>
          <Avatar user={u} size={size} style={{ border: '2px solid var(--bg-surface)' }} />
        </span>
      ))}
      {extra > 0 && (
        <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-elevated)',
          border: '2px solid var(--bg-surface)', marginLeft: -8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>
          +{extra}
        </span>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   PROGRESS BAR
   ══════════════════════════════════════════════════════════════ */
export const ProgressBar = ({ value = 0, height = 4, showLabel = false, color }) => {
  const pct = Math.max(0, Math.min(100, value));
  const barColor = color || (pct === 100 ? 'var(--success)' : pct > 66 ? 'var(--accent)' : pct > 33 ? 'var(--warning)' : 'var(--danger)');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
      <div style={{ flex: 1, height, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor,
          borderRadius: 99, transition: 'width 0.5s ease-out' }} />
      </div>
      {showLabel && (
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: barColor,
          fontFamily: "'Syne', sans-serif", minWidth: 32, textAlign: 'right' }}>
          {pct}%
        </span>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   LOADER — skeleton + spinner variants
   ══════════════════════════════════════════════════════════════ */
export const Spinner = ({ size = 20, color = 'var(--accent)' }) => (
  <span style={{
    display: 'inline-block', width: size, height: size,
    border: `2px solid ${color}33`, borderTopColor: color,
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  }} />
);

export const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '60vh', flexDirection: 'column', gap: 16 }}>
    <Spinner size={36} />
    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</span>
  </div>
);

export const SkeletonCard = () => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div className="skeleton" style={{ height: 20, width: '60%' }} />
    <div className="skeleton" style={{ height: 14, width: '90%' }} />
    <div className="skeleton" style={{ height: 14, width: '75%' }} />
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <div className="skeleton" style={{ height: 24, width: 70, borderRadius: 99 }} />
      <div className="skeleton" style={{ height: 24, width: 55, borderRadius: 99 }} />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   MODAL — accessible, focus-trapped overlay
   ══════════════════════════════════════════════════════════════ */
export const Modal = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = { sm: 420, md: 560, lg: 720, xl: 900 };

  return (
    <div ref={overlayRef} onClick={(e) => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', animation: 'fadeIn 0.2s ease-out',
      }}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
        style={{
          width: '100%', maxWidth: sizes[size], maxHeight: '90vh',
          background: 'var(--bg-surface)', border: '1px solid var(--border-bright)',
          borderRadius: '20px', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          animation: 'scaleIn 0.2s ease-out',
        }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 id="modal-title" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700,
            fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: 'none',
            border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', transition: 'all 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>{children}</div>
        {/* Footer */}
        {footer && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   CONFIRM DIALOG
   ══════════════════════════════════════════════════════════════ */
export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading }) => (
  <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title}
    footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>
    }>
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--danger-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <AlertTriangle size={20} color="var(--danger)" />
      </div>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem', paddingTop: 8 }}>
        {message}
      </p>
    </div>
  </Modal>
);

/* ══════════════════════════════════════════════════════════════
   EMPTY STATE
   ══════════════════════════════════════════════════════════════ */
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <div className="empty-state-title">{title}</div>
    {description && <p className="empty-state-desc">{description}</p>}
    {action}
  </div>
);

/* ══════════════════════════════════════════════════════════════
   STAT CARD — dashboard KPI tile
   ══════════════════════════════════════════════════════════════ */
export const StatCard = ({ icon, label, value, sub, color = 'var(--accent)', trend }) => (
  <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120,
      background: `radial-gradient(circle at 100% 0%, ${color}18 0%, transparent 70%)`,
      pointerEvents: 'none' }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`,
        border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color }}>
        {icon}
      </div>
      {trend !== undefined && (
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: '2rem', fontFamily: "'Syne', sans-serif", fontWeight: 800,
        color: 'var(--text-primary)', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   SEARCH INPUT
   ══════════════════════════════════════════════════════════════ */
export const SearchInput = ({ value, onChange, placeholder = 'Search…', style: extra = {} }) => (
  <div style={{ position: 'relative', ...extra }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
      style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="form-input"
      style={{ paddingLeft: 38, ...extra }} />
  </div>
);

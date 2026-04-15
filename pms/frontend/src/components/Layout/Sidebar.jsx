// src/components/Layout/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, CheckSquare, ListTodo,
  Settings, LogOut, ChevronLeft, ChevronRight, Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Avatar } from '../common/index.jsx';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/dashboard',  icon: <LayoutDashboard size={18} />, label: 'Dashboard'  },
  { to: '/projects',   icon: <FolderKanban    size={18} />, label: 'Projects'   },
  { to: '/tasks',      icon: <CheckSquare     size={18} />, label: 'All Tasks'  },
  { to: '/my-tasks',   icon: <ListTodo        size={18} />, label: 'My Tasks'   },
  { to: '/settings',   icon: <Settings        size={18} />, label: 'Settings'   },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const w = collapsed ? 72 : 256;

  const handleLogout = () => { logout(); navigate('/login'); toast.success('Logged out.'); };

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: w,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 250ms ease-out',
      zIndex: 100, overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 0' : '20px 20px', display: 'flex',
        alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)',
        justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent), var(--purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={18} color="#0A0E1A" fill="#0A0E1A" />
        </div>
        {!collapsed && (
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: '1.1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            PMS
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              gap: 12, padding: collapsed ? '10px' : '10px 12px',
              borderRadius: 10, marginBottom: 2,
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              transition: 'all 150ms', textDecoration: 'none',
              justifyContent: collapsed ? 'center' : 'flex-start',
              whiteSpace: 'nowrap',
            })}
            onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}}
            onMouseLeave={e => { if (!e.currentTarget.dataset.active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; }}}
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? 'var(--accent)' : 'inherit', flexShrink: 0 }}>{icon}</span>
                {!collapsed && <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + collapse toggle */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 8px' }}>
        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          padding: collapsed ? '8px 0' : '8px 10px', borderRadius: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          marginBottom: 4 }}>
          <Avatar user={user} size={32} style={{ flexShrink: 0 }} />
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName || user?.username}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user?.role}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '8px 0' : '8px 10px', borderRadius: 10,
            color: 'var(--text-muted)', background: 'none', border: 'none',
            cursor: 'pointer', transition: 'all 150ms',
            justifyContent: collapsed ? 'center' : 'flex-start',
            marginBottom: 4 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-dim)'; e.currentTarget.style.color = 'var(--danger)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <LogOut size={16} />
          {!collapsed && <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button onClick={onToggle}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '6px', borderRadius: 8, color: 'var(--text-muted)',
            background: 'none', border: 'none', cursor: 'pointer', transition: 'all 150ms' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

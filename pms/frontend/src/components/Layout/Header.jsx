// src/components/Layout/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Avatar } from '../common/index.jsx';
import { notificationsApi } from '../../api/index.js';
import { fmtRelative } from '../../utils/helpers.js';

const PAGE_TITLES = {
  '/dashboard':  'Dashboard',
  '/projects':   'Projects',
  '/tasks':      'All Tasks',
  '/my-tasks':   'My Tasks',
  '/settings':   'Settings',
};

const Header = () => {
  const { user, logout }   = useAuth();
  const location           = useLocation();
  const navigate           = useNavigate();
  const [notifOpen, setNotifOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchVal, setSearchVal]     = useState('');
  const notifRef = useRef(null);
  const userRef  = useRef(null);

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/'))
    ?.[1] || 'PMS';

  // Fetch notifications
  useEffect(() => {
    notificationsApi.getAll({ limit: 10 })
      .then(({ data }) => {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }).catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <header style={{
      position: 'fixed', top: 0, right: 0, left: 0,
      height: 'var(--header-height)',
      background: 'rgba(15,22,41,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 28px', gap: 16, zIndex: 90,
    }}>
      {/* Page title */}
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800,
        fontSize: '1.15rem', color: 'var(--text-primary)', marginRight: 'auto' }}>
        {title}
      </h1>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input value={searchVal} onChange={e => setSearchVal(e.target.value)}
          placeholder="Quick search…"
          style={{ paddingLeft: 34, paddingRight: 14, paddingTop: 7, paddingBottom: 7,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8125rem',
            fontFamily: "'DM Sans', sans-serif", outline: 'none', width: 220,
            transition: 'all 150ms' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Notifications */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button onClick={() => setNotifOpen(v => !v)}
          style={{ width: 38, height: 38, borderRadius: 10,
            background: notifOpen ? 'var(--bg-elevated)' : 'transparent',
            border: '1px solid ' + (notifOpen ? 'var(--border-bright)' : 'transparent'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative',
            transition: 'all 150ms' }}>
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: 4, right: 4,
              minWidth: 16, height: 16, borderRadius: 99,
              background: 'var(--danger)', color: '#fff',
              fontSize: '0.65rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-primary)', padding: '0 3px' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 360, background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)', borderRadius: 16,
            boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden',
            animation: 'scaleIn 0.15s ease-out' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none',
                    border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Mark all read
                </button>
              )}
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No notifications yet
                </div>
              ) : notifications.map(n => (
                <div key={n.notificationId}
                  style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
                    background: n.isRead ? 'transparent' : 'var(--accent-dim)',
                    cursor: 'pointer', transition: 'background 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'var(--accent-dim)'}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    {!n.isRead && (
                      <span style={{ width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)',
                        marginBottom: 2 }}>{n.title}</div>
                      {n.message && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)',
                          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical' }}>{n.message}</div>
                      )}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {fmtRelative(n.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div ref={userRef} style={{ position: 'relative' }}>
        <button onClick={() => setUserMenuOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
            borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer',
            transition: 'background 150ms' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <Avatar user={user} size={30} />
          {!userMenuOpen ? null : null}
        </button>

        {userMenuOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            minWidth: 180, background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)', borderRadius: 12,
            boxShadow: 'var(--shadow-lg)', zIndex: 200, padding: 6,
            animation: 'scaleIn 0.15s ease-out' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.fullName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
            {[
              { label: 'Settings', action: () => { navigate('/settings'); setUserMenuOpen(false); } },
              { label: 'Logout',   action: () => { logout(); navigate('/login'); }, danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                style={{ width: '100%', display: 'block', textAlign: 'left',
                  padding: '8px 12px', borderRadius: 8, fontSize: '0.875rem',
                  color: item.danger ? 'var(--danger)' : 'var(--text-secondary)',
                  background: 'none', border: 'none', cursor: 'pointer', transition: 'all 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'var(--danger-dim)' : 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

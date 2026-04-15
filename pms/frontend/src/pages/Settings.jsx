// src/pages/Settings.jsx
import React, { useState } from 'react';
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Avatar } from '../components/common/index.jsx';
import { getApiError } from '../utils/helpers.js';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');

  /* ── Profile form ─────────────────────────────────────────── */
  const [profile, setProfile]   = useState({ fullName: user?.fullName || '', avatarUrl: user?.avatarUrl || '' });
  const [pLoading, setPLoading] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setPLoading(true);
    try {
      const { data } = await authApi.updateProfile(profile);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) { toast.error(getApiError(err)); }
    finally { setPLoading(false); }
  };

  /* ── Password form ────────────────────────────────────────── */
  const [pwForm, setPwForm]     = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw]     = useState({ cur: false, new: false, conf: false });
  const [pwErrors, setPwErrors] = useState({});

  const savePw = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Current password required.';
    if (pwForm.newPassword.length < 8) errs.newPassword = 'Must be at least 8 characters.';
    if (pwForm.newPassword !== pwForm.confirm) errs.confirm = 'Passwords do not match.';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwLoading(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(getApiError(err)); }
    finally { setPwLoading(false); }
  };

  const TABS = [
    { id: 'profile',  label: 'Profile',  icon: <User size={15} /> },
    { id: 'security', label: 'Security', icon: <Lock size={15} /> },
  ];

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out', maxWidth: 760 }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* PROFILE */}
      {tab === 'profile' && (
        <div className="card" style={{ maxWidth: 520 }}>
          {/* Avatar preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28,
            padding: '16px 20px', background: 'var(--bg-elevated)', borderRadius: 12 }}>
            <Avatar user={{ ...user, fullName: profile.fullName, avatarUrl: profile.avatarUrl }} size={56} />
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
                {profile.fullName || user?.username}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user?.role} · @{user?.username}
              </div>
            </div>
          </div>

          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Read-only fields */}
            {[
              { label: 'Username',      value: user?.username, ro: true },
              { label: 'Email address', value: user?.email,    ro: true },
              { label: 'System role',   value: user?.role,     ro: true },
            ].map(f => (
              <div key={f.label} className="form-group">
                <label className="form-label">{f.label}</label>
                <input className="form-input" value={f.value || ''} readOnly
                  style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
            ))}

            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" value={profile.fullName}
                onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Your display name" />
            </div>
            <div className="form-group">
              <label className="form-label">Avatar URL <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input className="form-input" type="url" value={profile.avatarUrl}
                onChange={e => setProfile(p => ({ ...p, avatarUrl: e.target.value }))}
                placeholder="https://…" />
            </div>

            <Button type="submit" loading={pLoading} icon={<Save size={15} />}
              style={{ alignSelf: 'flex-start' }}>
              Save profile
            </Button>
          </form>
        </div>
      )}

      {/* SECURITY */}
      {tab === 'security' && (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>
            Change password
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>
            Use a strong password with at least 8 characters including uppercase letters and numbers.
          </p>

          <form onSubmit={savePw} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              { key: 'currentPassword', label: 'Current password',  show: showPw.cur,  toggle: () => setShowPw(s=>({...s,cur:!s.cur})) },
              { key: 'newPassword',     label: 'New password',       show: showPw.new,  toggle: () => setShowPw(s=>({...s,new:!s.new})) },
              { key: 'confirm',         label: 'Confirm new password', show: showPw.conf, toggle: () => setShowPw(s=>({...s,conf:!s.conf})) },
            ].map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                <div style={{ position: 'relative' }}>
                  <input type={f.show ? 'text' : 'password'}
                    className={`form-input${pwErrors[f.key] ? ' error' : ''}`}
                    value={pwForm[f.key]} placeholder="••••••••"
                    onChange={e => { setPwForm(p => ({ ...p, [f.key]: e.target.value })); setPwErrors(v => ({ ...v, [f.key]: '' })); }}
                    style={{ paddingRight: 42 }} />
                  <button type="button" onClick={f.toggle}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', padding: 2 }}>
                    {f.show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwErrors[f.key] && <span className="form-error">{pwErrors[f.key]}</span>}
              </div>
            ))}

            <Button type="submit" loading={pwLoading} icon={<Lock size={15} />}
              style={{ alignSelf: 'flex-start' }}>
              Change password
            </Button>
          </form>

          {/* Security info */}
          <div style={{ marginTop: 28, padding: '14px 18px', background: 'var(--bg-elevated)',
            borderRadius: 12, border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)',
            lineHeight: 1.6 }}>
            🔒 Passwords are hashed with bcrypt (10 salt rounds). They are never stored in plaintext.
            Your session uses a signed JWT token with a 7-day expiry.
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

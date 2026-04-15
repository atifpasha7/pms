// src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, UserPlus } from 'lucide-react';
import { authApi } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/common/index.jsx';
import { getApiError } from '../utils/helpers.js';
import toast from 'react-hot-toast';

const Field = ({ name, label, type = 'text', placeholder, value, error, onChange }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input type={type} className={`form-input${error ? ' error' : ''}`}
      placeholder={placeholder} value={value}
      onChange={onChange} />
    {error && <span className="form-error">{error}</span>}
  </div>
);

const Register = () => {
  const [form, setForm]       = useState({ fullName: '', username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const { login }             = useAuth();
  const navigate              = useNavigate();

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required.';
    if (!form.username.trim() || form.username.length < 3) e.username = 'Username must be 3-50 characters and contain only letters, numbers, and underscores.';
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) e.username = 'Username may only contain letters, numbers, and underscores.';
    if (!form.email) e.email = 'Email is required.';
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Password must contain at least one uppercase letter.';
    else if (!/[0-9]/.test(form.password)) e.password = 'Password must contain at least one number.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      localStorage.setItem('pms_token', data.token);
      toast.success('Account created! Welcome aboard.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div style={{ width: '100%', maxWidth: 440, animation: 'fadeInUp 0.4s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, justifyContent: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="#0A0E1A" fill="#0A0E1A" />
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.5rem' }}>PMS</span>
        </div>
        <div className="card" style={{ padding: 36 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.4rem', marginBottom: 4 }}>
            Create account
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 28 }}>
            Join your team's workspace today.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field name="fullName" label="Full name" placeholder="Sarah Mitchell" value={form.fullName} error={errors.fullName} onChange={e => set('fullName', e.target.value)} />
            <Field name="username" label="Username" placeholder="sarah_m" value={form.username} error={errors.username} onChange={e => set('username', e.target.value)} />
            <Field name="email" label="Email address" type="email" placeholder="you@company.com" value={form.email} error={errors.email} onChange={e => set('email', e.target.value)} />
            <Field name="password" label="Password" type="password" placeholder="Min. 8 chars, 1 uppercase, 1 number" value={form.password} error={errors.password} onChange={e => set('password', e.target.value)} />
            <Button type="submit" size="lg" loading={loading}
              style={{ width: '100%', marginTop: 4 }} icon={<UserPlus size={16} />}>
              Create account
            </Button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

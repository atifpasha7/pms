// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Zap, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/common/index.jsx';
import { getApiError } from '../utils/helpers.js';
import toast from 'react-hot-toast';

const Login = () => {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [searchParams]        = useSearchParams();

  const expired = searchParams.get('session') === 'expired';

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeInUp 0.4s ease-out' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, justifyContent: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)' }}>
            <Zap size={22} color="#0A0E1A" fill="#0A0E1A" />
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.5rem' }}>
            PMS
          </span>
        </div>

        {expired && (
          <div style={{ background: 'var(--warning-dim)', border: '1px solid var(--warning)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 24,
            fontSize: '0.875rem', color: 'var(--warning)' }}>
            Your session expired. Please log in again.
          </div>
        )}

        <div className="card" style={{ padding: 36 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.4rem',
            marginBottom: 4 }}>Sign in</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 28 }}>
            Enter your credentials to access your workspace.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" className={`form-input${errors.email ? ' error' : ''}`}
                placeholder="you@company.com"
                value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(v => ({ ...v, email: '' })); }} />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'}
                  className={`form-input${errors.password ? ' error' : ''}`}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(v => ({ ...v, password: '' })); }}
                  style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', padding: 2 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <Button type="submit" size="lg" loading={loading}
              style={{ width: '100%', marginTop: 4 }} icon={<LogIn size={16} />}>
              Sign in
            </Button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create one</Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div style={{ marginTop: 20, padding: '14px 18px', background: 'var(--bg-surface)',
          border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.8rem',
          color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Demo:</span>{' '}
          admin@pms.dev / Password123!
        </div>
      </div>
    </div>
  );
};

export default Login;

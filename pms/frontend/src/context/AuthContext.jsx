// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/index.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,      setUser]      = useState(null);
  const [token,     setToken]     = useState(() => localStorage.getItem('pms_token'));
  const [isLoading, setIsLoading] = useState(true);

  /* ── Bootstrap: verify token on mount ─────────────────────── */
  useEffect(() => {
    const boot = async () => {
      const stored = localStorage.getItem('pms_token');
      if (!stored) { setIsLoading(false); return; }
      try {
        const { data } = await authApi.getMe();
        setUser(data.user);
      } catch {
        localStorage.removeItem('pms_token');
        localStorage.removeItem('pms_user');
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    boot();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('pms_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pms_token');
    localStorage.removeItem('pms_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

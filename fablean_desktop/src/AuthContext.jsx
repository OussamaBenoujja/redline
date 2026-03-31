import React, { createContext, useEffect, useMemo, useState, useContext } from 'react';
import { API_BASE_URL } from './config/api';

const AuthContext = createContext();
const AUTH_TOKEN_KEY = 'fablean_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Session expired');
        const data = await res.json();
        setUser(data.user || null);
      } catch (_) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  const persistAuth = (nextToken, nextUser) => {
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const signup = async ({ fullName, email, password }) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sign up failed');
    persistAuth(data.token, data.user);
    return data.user;
  };

  const login = async ({ email, password }) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    persistAuth(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const authFetch = async (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
  };

  const updateProfileContext = (updates) => {
    setUser(prev => (prev ? { ...prev, ...updates } : prev));
  };

  const value = useMemo(() => ({
    user,
    token,
    authLoading,
    signup,
    login,
    logout,
    authFetch,
    updateProfileContext
  }), [user, token, authLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

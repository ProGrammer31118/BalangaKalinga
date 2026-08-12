import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { authApi, notificationApi } from '../api.js';

const defaultAuthValue = {
  user: null,
  token: null,
  isAdmin: false,
  unread: 0,
  refreshUser: async () => null,
  refreshNotifications: async () => {},
  login: async () => null,
  register: async () => null,
  logout: () => {},
};

function readStoredUser() {
  try {
    const raw = localStorage.getItem('kalinga_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('kalinga_user');
    return null;
  }
}

function readStoredToken() {
  try {
    return localStorage.getItem('kalinga_token') || null;
  } catch {
    return null;
  }
}

const AuthContext = createContext(defaultAuthValue);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(readStoredToken);
  const [unread, setUnread] = useState(0);

  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const d = await notificationApi(token).list();
      setUnread(d.unread || 0);
    } catch {
      /* ignore */
    }
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    const d = await authApi.me(token);
    setUser(d.user);
    return d.user;
  }, [token]);

  const login = async (email, student_id, password) => {
    const data = await authApi.login({ email, student_id, password });
    localStorage.setItem('kalinga_token', data.token);
    localStorage.setItem('kalinga_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const data = await authApi.register(payload);
    localStorage.setItem('kalinga_token', data.token);
    localStorage.setItem('kalinga_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('kalinga_token');
    localStorage.removeItem('kalinga_user');
    setToken(null);
    setUser(null);
    setUnread(0);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAdmin: user?.role === 'admin',
      unread,
      refreshUser,
      refreshNotifications,
      login,
      register,
      logout,
    }),
    [user, token, unread, refreshUser, refreshNotifications]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
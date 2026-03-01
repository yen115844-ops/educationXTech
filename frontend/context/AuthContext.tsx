'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getStoredUser, getToken, removeToken, setStoredUser, setToken } from '@/lib/auth';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: { email: string; password: string; name: string; role?: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setTokenState(null);
      setLoading(false);
      return;
    }
    setTokenState(t);
    const res = await apiGet<{ user: User }>('/api/auth/me');
    if (res.success && res.data?.user) {
      setUser(res.data.user);
      setStoredUser(res.data.user);
    } else {
      removeToken();
      setUser(null);
      setTokenState(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const t = getToken();
    if (t) {
      setTokenState(t);
      apiGet<{ user: User }>('/api/auth/me').then((res) => {
        if (res.success && res.data?.user) {
          setUser(res.data.user);
          setStoredUser(res.data.user);
        } else {
          removeToken();
          setUser(null);
          setTokenState(null);
        }
        setLoading(false);
      });
    } else {
      setUser(getStoredUser());
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const postRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }
    );
    const json = await postRes.json();
    if (json.success && json.data?.token && json.data?.user) {
      setToken(json.data.token);
      setTokenState(json.data.token);
      setUser(json.data.user);
      setStoredUser(json.data.user);
      return { success: true };
    }
    return { success: false, message: json.message || 'Đăng nhập thất bại' };
  };

  const register = async (data: { email: string; password: string; name: string; role?: string }) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const res = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success && json.data?.token && json.data?.user) {
      setToken(json.data.token);
      setTokenState(json.data.token);
      setUser(json.data.user);
      setStoredUser(json.data.user);
      return { success: true };
    }
    return { success: false, message: json.message || 'Đăng ký thất bại' };
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setTokenState(null);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

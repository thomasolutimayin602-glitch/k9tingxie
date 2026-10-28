'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: string | null;
  isAuthenticated: boolean;
  login: (username: string, pass: string) => { success: boolean; error?: string };
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_USER = 'gamer';
const VALID_PASS = 'Diffraction1';
const AUTH_KEY = 'cw2_current_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored === VALID_USER) {
        setUser(VALID_USER);
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (usernameInput: string, passInput: string) => {
    const trimmedUser = usernameInput.trim();
    if (trimmedUser !== VALID_USER || passInput !== VALID_PASS) {
      return {
        success: false,
        error: '用户名或密码错误。如需体验请使用指定测试账号。',
      };
    }
    setUser(VALID_USER);
    try {
      localStorage.setItem(AUTH_KEY, VALID_USER);
    } catch {}
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as authService from '../../services/authService.js';
import { ensureCsrfToken } from '../../services/apiClient.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize session on mount
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      // Pre-fetch CSRF token and verify session
      await ensureCsrfToken();
      const data = await authService.getMe();
      if (data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      // 401 Unauthorized or network issue on guest visit is expected
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (credentials) => {
    setAuthError(null);
    const data = await authService.login(credentials);
    if (data?.user) {
      setUser(data.user);
    }
    return data?.user;
  }, []);

  const register = useCallback(async (payload) => {
    setAuthError(null);
    const data = await authService.register(payload);
    if (data?.user) {
      setUser(data.user);
    }
    return data?.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      authError,
      setAuthError,
      login,
      register,
      logout,
      refreshUser: checkSession
    }),
    [user, isLoading, authError, login, register, logout, checkSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


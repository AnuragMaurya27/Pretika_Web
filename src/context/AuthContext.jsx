import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, usersAPI } from '../api/index';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await usersAPI.getMe();
      setUser(res.data.data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('hvu_token');
    if (token) {
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (email_or_username, password) => {
    const res = await authAPI.login({ email_or_username, password });
    // AuthResponse (snake_case): access_token, refresh_token, user: { id, username, display_name, role, ... }
    const data = res.data?.data;
    const access_token = data?.access_token;
    const refresh_token = data?.refresh_token;
    const userData = data?.user;
    if (!access_token) throw new Error('Invalid response from server');
    localStorage.setItem('hvu_token', access_token);
    localStorage.setItem('hvu_refresh', refresh_token || '');
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    return res.data;
  };

  const logout = async () => {
    try { 
      const refresh = localStorage.getItem('hvu_refresh');
      await authAPI.logout(refresh); 
    } catch { /* ignore */ }
    localStorage.removeItem('hvu_token');
    localStorage.removeItem('hvu_refresh');
    setUser(null);
  };

  const updateUser = (data) => setUser((prev) => ({ ...prev, ...data }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

const normalizeUser = (u) => ({
  ...u,
  roles: (u?.roles ?? []).map(r => (typeof r === 'string' ? { name: r } : r)),
  permissions: (u?.permissions ?? []).map(p => (typeof p === 'string' ? { name: p } : p)),
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión si hay token
  useEffect(() => {
    (async () => {
      const t = localStorage.getItem('auth_token');
      if (!t) { setLoading(false); return; }
      try {
        const { data } = await authApi.getMe();
        setUser(normalizeUser(data)); // 👈 normaliza
      } catch {
        localStorage.removeItem('auth_token');
        setUser(null);
      } finally { setLoading(false); }
    })();
  }, []);

  // Login
  const login = async ({ email, password }) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('auth_token', data.token);
    setUser(normalizeUser(data.user)); // 👈 normaliza
  };

  // Logout
  const logout = async () => {
    await authApi.logout();  
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  // Helpers
  const hasRole = (role) =>
    !!user?.roles?.some(r => (r?.name ?? r) === role);

  const hasPermission = (perm) =>
    hasRole('superadministrador') ||
    !!user?.permissions?.some(p => (p?.name ?? p) === perm);

  const value = { user, loading, login, logout, hasRole, hasPermission };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

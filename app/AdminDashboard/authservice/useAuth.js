'use client';

import { useCallback, useEffect, useState } from 'react';
import { clearStoredAuth, normalizeRole, readStoredAuth, sanitizePermissions } from './auth';

const CURRENT_USER_STORAGE_KEY = 'currentUser';
const REMEMBERED_LOGIN_STORAGE_KEY = 'rememberedLogin';

function readUserFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const storedUser = sessionStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState(() => readUserFromStorage());
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  const syncAuth = useCallback(() => {
    const nextUser = readUserFromStorage();
    const auth = readStoredAuth();
    const normalizedRole = normalizeRole(auth.role || nextUser?.role);
    setUser(nextUser);
    setRole(normalizedRole);
    setPermissions(sanitizePermissions(auth.permissions));
    setIsAdmin(normalizedRole === 'ADMIN');
    setLoading(false);
  }, []);

  useEffect(() => {
    syncAuth();
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, [syncAuth]);

  const logout = useCallback(() => {
    if (typeof window === 'undefined') return;
    const rememberedLogin = {
      email: String(user?.email || '').trim(),
      role: normalizeRole(role || user?.role),
    };

    clearStoredAuth();
    sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    localStorage.setItem(REMEMBERED_LOGIN_STORAGE_KEY, JSON.stringify(rememberedLogin));
    setUser(null);
    setRole("");
    setPermissions([]);
    setIsAdmin(false);
  }, [role, user]);

  return { user, role, permissions, isAdmin, loading, logout };
}

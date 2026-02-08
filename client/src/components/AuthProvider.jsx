import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, setToken } from '../utils/api.js';

const AuthCtx = createContext(null);

// Persisting the user object prevents the sidebar name from reverting to "User"
// after a hard refresh (token is persisted, but in-memory user state is not).
const USER_STORAGE_KEY = 'inventory_auth_user';

function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readStoredUser() {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  const parsed = raw ? safeParseJSON(raw) : null;
  return parsed && typeof parsed === 'object' ? parsed : null;
}

function writeStoredUser(user) {
  if (!user) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }) {
  const [token, setTok] = useState(() => getToken());
  const [user, setUser] = useState(() => readStoredUser());

  const loginWithToken = (t, u) => {
    setToken(t);
    setTok(t);
    setUser(u || null);
    writeStoredUser(u || null);
  };

  const logout = () => {
    setToken('');
    setTok('');
    setUser(null);
    writeStoredUser(null);
  };

  // If a token exists but user is missing (e.g., refreshed page), hydrate from storage.
  useEffect(() => {
    if (token && !user) {
      const stored = readStoredUser();
      if (stored) setUser(stored);
    }
  }, [token, user]);

  // Keep storage in sync if user is updated from anywhere else.
  useEffect(() => {
    writeStoredUser(user);
  }, [user]);

  const value = useMemo(
    () => ({ token, user, setUser, loginWithToken, logout }),
    [token, user]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}

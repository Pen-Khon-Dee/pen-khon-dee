import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as api from '../api';

const AuthContext = createContext(null);
const STORAGE_KEY = 'nero_auth';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(load);

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setAuth(data);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }, []);

  const value = useMemo(
    () => ({ user: auth?.user ?? null, token: auth?.token ?? null, login, logout }),
    [auth, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

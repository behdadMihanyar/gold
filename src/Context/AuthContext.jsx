import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth";
import { UNAUTHORIZED_EVENT } from "../api/client";
import { disconnectRealtime } from "../api/realtime";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the httpOnly cookie on first load.
  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Any 401 from the API (e.g. expired session) logs the user out locally.
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      disconnectRealtime();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (identifier, password) => {
    const u = await authApi.login(identifier, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      disconnectRealtime();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import {
  refreshSessionSingleFlight,
  registerUnauthorizedHandler,
  tokenStore
} from '../api/httpClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const hydrateCurrentUser = useCallback(async () => {
    const profile = await authApi.getMe();
    setUser(profile);
    return profile;
  }, []);

  // Bootstrap existing session on initial load using single-flight refresh token exchange
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const storedRefresh = tokenStore.getRefreshToken();
        if (!storedRefresh) {
          return;
        }

        const refreshed = await refreshSessionSingleFlight();
        if (!active || !refreshed?.accessToken) {
          tokenStore.clear();
          return;
        }

        const profile = await authApi.getMe();
        if (active) {
          setUser(profile);
        }
      } catch {
        if (active) {
          tokenStore.clear();
          setUser(null);
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  // Route unrecoverable authenticated 401 responses to /unauthorized
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setUser(null);
      navigate('/unauthorized', { replace: true });
    });

    return () => {
      registerUnauthorizedHandler(null);
    };
  }, [navigate]);

  // Synchronize logout across browser tabs if refresh token is removed elsewhere
  useEffect(() => {
    function handleStorage(event) {
      if (event.key === 'abes_tracker_refresh_token' && !event.newValue) {
        tokenStore.setAccessToken(null);
        setUser(null);
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login(email, password);
      tokenStore.setTokens(data.accessToken, data.refreshToken);
      try {
        // Hydrate full enriched profile (including department metadata) via /auth/me
        return await hydrateCurrentUser();
      } catch {
        setUser(data.user);
        return data.user;
      }
    },
    [hydrateCurrentUser]
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    try {
      if (tokenStore.getAccessToken()) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Proceed with local session termination even if server revocation request fails
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  }, [clearSession, navigate]);

  const value = useMemo(
    () => ({
      user,
      initializing,
      isAuthenticated: Boolean(user),
      login,
      logout,
      clearSession,
      refreshProfile: hydrateCurrentUser
    }),
    [user, initializing, login, logout, clearSession, hydrateCurrentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return ctx;
}

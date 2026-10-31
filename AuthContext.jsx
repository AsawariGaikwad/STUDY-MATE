// Auth state. The session itself is an HttpOnly cookie managed by the server;
// this context only holds the user object in memory.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../api/client';

const AuthContext = createContext(null);

const IDLE_LIMIT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
const THEME_KEY = 'sm-theme'; // the only value kept in localStorage

function applyThemeClass(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function readInitialTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState(readInitialTheme);
  const userRef = useRef(null);
  const [photoVersion, setPhotoVersion] = useState(() => Date.now());
  const bumpPhoto = useCallback(() => setPhotoVersion(Date.now()), []);

  const setUser = useCallback((u) => {
    userRef.current = u;
    setUserState(u);
  }, []);

  const applyTheme = useCallback((t) => {
    if (t !== 'light' && t !== 'dark') return;
    applyThemeClass(t);
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* storage may be unavailable */
    }
  }, []);

  // Persist the theme locally and, when signed in, on the server.
  const setTheme = useCallback(
    (t) => {
      applyTheme(t);
      if (userRef.current) {
        const u = userRef.current;
        const body = { theme: t };
        if (u.language) body.language = u.language;
        if (u.notification_prefs) body.notification_prefs = u.notification_prefs;
        api
          .patch('/profile/preferences', body)
          .then((res) => {
            if (res?.data && userRef.current) setUser({ ...userRef.current, ...res.data, theme: t });
          })
          .catch(() => {
            /* local preference still applies */
          });
      }
    },
    [applyTheme, setUser]
  );

  const clearSession = useCallback(() => {
    setUser(null);
    qc.clear();
  }, [qc, setUser]);

  // Restore the session on first load.
  useEffect(() => {
    let alive = true;
    api
      .get('/auth/me')
      .then((res) => {
        if (!alive) return;
        setUser(res.data);
        if (res.data?.theme) applyTheme(res.data.theme);
      })
      .catch(() => {
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [applyTheme, setUser]);

  const login = useCallback(
    async ({ username, password, role }) => {
      const res = await api.post('/auth/login', { username, password, role });
      qc.clear();
      setUser(res.data);
      if (res.data?.theme) applyTheme(res.data.theme);
      return res.data;
    },
    [applyTheme, qc, setUser]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* clear locally regardless */
    }
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const res = await api.get('/auth/me');
    setUser(res.data);
    return res.data;
  }, [setUser]);

  // Refresh failed or session ended elsewhere.
  useEffect(() => {
    const onExpired = () => {
      if (!userRef.current) return;
      clearSession();
      toast.error('Your session has ended. Please sign in again.', { id: 'session-expired' });
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [clearSession]);

  // Server says the password must be changed first: re-read the user so the
  // route guards send them to /change-password.
  useEffect(() => {
    const onRequired = () => {
      if (userRef.current) refreshUser().catch(() => {});
    };
    window.addEventListener('auth:password-required', onRequired);
    return () => window.removeEventListener('auth:password-required', onRequired);
  }, [refreshUser]);

  // 30 minutes of inactivity -> sign out.
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    if (!user) return undefined;
    lastActivity.current = Date.now();
    let timer;

    const expireIfIdle = () => {
      if (Date.now() - lastActivity.current >= IDLE_LIMIT_MS) {
        toast('You were signed out after 30 minutes of inactivity.', { id: 'idle-logout' });
        logout();
        return true;
      }
      return false;
    };

    const schedule = () => {
      clearTimeout(timer);
      const remaining = IDLE_LIMIT_MS - (Date.now() - lastActivity.current);
      timer = setTimeout(() => {
        if (!expireIfIdle()) schedule();
      }, Math.max(remaining, 1000));
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivity.current < 5000) return; // throttle
      lastActivity.current = now;
      schedule();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') expireIfIdle();
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    schedule();

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, logout]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role || null,
      isAdmin: user?.role === 'ADMIN',
      isFaculty: user?.role === 'FACULTY',
      isStudent: user?.role === 'STUDENT',
      loading,
      login,
      logout,
      refreshUser,
      setUser,
      endSession: clearSession,
      theme,
      setTheme,
      photoVersion,
      bumpPhoto,
    }),
    [user, loading, login, logout, refreshUser, setUser, clearSession, theme, setTheme, photoVersion, bumpPhoto]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

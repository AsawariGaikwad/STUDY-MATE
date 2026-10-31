import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bell,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Menu,
  Moon,
  Settings as SettingsIcon,
  Sun,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGet } from '../hooks/useApi';
import Avatar from '../components/Avatar';
import Brand from '../components/Brand';
import ErrorBoundary from '../components/ErrorBoundary';
import { Badge, Card, Skeleton, SkeletonText, cx } from '../components/ui';
import { ROLE_LABEL, ROLE_TONE, navFor } from './nav';

function SidebarNav({ items, collapsed, onNavigate }) {
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              onClick={onNavigate}
              title={collapsed ? it.label : undefined}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-accent-light focus-visible:ring-offset-brand-900',
                  collapsed && 'justify-center',
                  isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <it.icon
                    className={cx('h-5 w-5 shrink-0', isActive && 'text-accent-light')}
                    aria-hidden="true"
                  />
                  <span className={collapsed ? 'sr-only' : 'truncate'}>{it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function UserMenu() {
  const { user, logout, photoVersion } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    wrapRef.current?.querySelector('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onMenuKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...wrapRef.current.querySelectorAll('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl p-1.5 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Avatar name={user.full_name} src={user.photo_url} version={photoVersion} size={34} />
        <span className="hidden min-w-0 text-left leading-tight sm:block">
          <span className="block max-w-[10rem] truncate text-sm font-medium">{user.full_name}</span>
          <Badge tone={ROLE_TONE[user.role]} className="mt-0.5 !px-2 !py-0 !text-[11px]">
            {ROLE_LABEL[user.role]}
          </Badge>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKey}
          className="absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-lift dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 px-3 pb-2 pt-1 dark:border-slate-800">
            <p className="truncate text-sm font-semibold">{user.full_name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
          <div className="pt-1">
            <Link to="/settings" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <SettingsIcon className="h-4 w-4" aria-hidden="true" />
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              className={cx(itemClass, 'text-red-600 dark:text-red-400')}
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationBell() {
  // Polls every 60 s. Notification actions invalidate the "unread-count" key.
  const q = useGet('unread-count', '/notifications/unread-count', undefined, {
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
  const count = Number(q.data?.data?.count) || 0;
  return (
    <Link
      to="/notifications"
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 grid min-w-[1.1rem] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-[1.1rem] text-brand-950"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

function PageFallback() {
  return (
    <div role="status" aria-label="Loading page">
      <Skeleton className="mb-2 h-7 w-56" />
      <Skeleton className="mb-6 h-4 w-80 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <SkeletonText lines={2} />
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, theme, setTheme } = useAuth();
  const location = useLocation();
  const reduce = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false); // in-memory only
  const [drawer, setDrawer] = useState(false);
  const menuButtonRef = useRef(null);
  const closeRef = useRef(null);
  const items = navFor(user.role);

  useEffect(() => setDrawer(false), [location.pathname]);

  // Mobile drawer: Esc closes, scroll locked, focus handed over and back.
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const btn = menuButtonRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      btn?.focus();
    };
  }, [drawer]);

  const iconBtn =
    'inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';

  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-brand-800"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cx(
          'sticky top-0 hidden h-screen shrink-0 flex-col bg-gradient-to-b from-brand-900 to-brand-950 transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[76px]' : 'w-64'
        )}
      >
        <div className={cx('flex h-16 items-center border-b border-white/10 px-4', collapsed && 'justify-center px-0')}>
          <Brand collapsed={collapsed} onDark />
        </div>
        <SidebarNav items={items} collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
          >
            <div className="absolute inset-0 bg-slate-900/60" onClick={() => setDrawer(false)} aria-hidden="true" />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="relative flex h-full w-72 max-w-[85vw] flex-col bg-gradient-to-b from-brand-900 to-brand-950"
              initial={reduce ? false : { x: -288 }}
              animate={{ x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: -288 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
            >
              <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
                <Brand onDark />
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setDrawer(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-2 text-brand-100 hover:bg-white/10"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <SidebarNav items={items} collapsed={false} onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200 bg-white/85 px-3 backdrop-blur sm:px-5 dark:border-slate-800 dark:bg-slate-950/85">
          <button
            ref={menuButtonRef}
            type="button"
            className={cx(iconBtn, 'lg:hidden')}
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            aria-expanded={drawer}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={cx(iconBtn, 'hidden lg:inline-flex')}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
          >
            {collapsed ? (
              <ChevronsRight className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronsLeft className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              className={iconBtn}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8">
          <motion.div
            key={location.pathname}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

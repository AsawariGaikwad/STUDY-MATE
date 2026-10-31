// Route guards. These are UX only; the server enforces real security.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';

export function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-label="Loading">
      <Spinner className="h-8 w-8 text-brand-700 dark:text-accent-light" />
    </div>
  );
}

// Signed-in users only; users with a temporary password are held at /change-password.
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

// Any signed-in session, even before the password has been changed.
export function RequireSession({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

// Sign-in page: signed-in users are sent on to the app.
export function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to={user.must_change_password ? '/change-password' : '/dashboard'} replace />;
  return children;
}

// <Route element={<RoleRoute roles={['ADMIN']} />}> ... </Route>
export function RoleRoute({ roles }) {
  const { role } = useAuth();
  return roles.includes(role) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

// Same URL, different page per role.
export function ByRole({ STUDENT, FACULTY, ADMIN }) {
  const { role } = useAuth();
  const element = { STUDENT, FACULTY, ADMIN }[role];
  return element || <Navigate to="/dashboard" replace />;
}

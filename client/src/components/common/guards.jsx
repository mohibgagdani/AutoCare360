import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PageLoader } from '@/components/ui';

/** Requires a signed-in user; remembers where they were heading. */
export function RequireAuth({ children }) {
  const { status, initialized } = useSelector((s) => s.auth);
  const location = useLocation();
  if (!initialized) return <PageLoader />;
  if (status !== 'authenticated') {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return children;
}

/** Admin-only routes. Non-admins are sent back to their dashboard. */
export function RequireAdmin({ children }) {
  const user = useSelector((s) => s.auth.user);
  if (user?.role !== 'admin') return <Navigate to="/app" replace state={{ forbidden: true }} />;
  return children;
}

/** Login/register pages redirect away when already signed in. */
export function GuestOnly({ children }) {
  const { status, initialized, user } = useSelector((s) => s.auth);
  const location = useLocation();
  if (!initialized) return <PageLoader />;
  if (status === 'authenticated') {
    const redirect = new URLSearchParams(location.search).get('redirect');
    const safe = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : user?.role === 'admin' ? '/admin' : '/app';
    return <Navigate to={safe} replace />;
  }
  return children;
}

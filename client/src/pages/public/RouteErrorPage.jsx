import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertOctagon, RefreshCw } from 'lucide-react';

/** Router-level error boundary — also recovers from stale chunk loads after a deploy. */
export default function RouteErrorPage() {
  const error = useRouteError();
  const chunkError = /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(String(error?.message || ''));
  const status = isRouteErrorResponse(error) ? error.status : null;

  if (import.meta.env.DEV) console.error(error);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">
        <AlertOctagon size={26} aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold text-ink">
        {chunkError ? 'A new version is available' : status === 404 ? 'Page not found' : 'Something went wrong'}
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-3">
        {chunkError
          ? 'AutoCare360 was updated while you were using it. Reload to get the latest version.'
          : 'An unexpected error occurred. Our team has been notified — please try again.'}
      </p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          <RefreshCw size={16} aria-hidden /> Reload
        </button>
        <Link to="/app" className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

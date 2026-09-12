import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { fetchUnreadCount } from '@/store/notificationSlice';
import { fetchMeta } from '@/store/metaSlice';
import { setMobileNav } from '@/store/uiSlice';
import { maintenanceApi } from '@/services';
import { onChange } from '@/utils/events';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/ui';
import { useReducedMotionPref } from '@/hooks/useMotion';

function ContentFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-brand-600">
      <Spinner size={28} />
    </div>
  );
}

/** Shell for signed-in pages (user app + admin panel). */
export function AppLayout({ variant = 'app' }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const collapsed = useSelector((s) => s.ui.sidebarCollapsed);
  const unread = useSelector((s) => s.notifications.unread);
  const [overdue, setOverdue] = useState(0);
  const reduced = useReducedMotionPref();
  const pageEntrance = reduced ? false : { opacity: 0, y: 6 };

  useEffect(() => {
    dispatch(fetchMeta());
    dispatch(fetchUnreadCount());
    const interval = setInterval(() => dispatch(fetchUnreadCount()), 60000);
    const onFocus = () => dispatch(fetchUnreadCount());
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [dispatch]);

  useEffect(() => {
    if (variant !== 'app') return undefined;
    const load = () => maintenanceApi.summary().then((r) => setOverdue(r.data.overdue)).catch(() => {});
    load();
    return onChange(['maintenance', 'vehicles', 'services'], () => {
      load();
      dispatch(fetchUnreadCount());
    });
  }, [variant, dispatch]);

  useEffect(() => {
    dispatch(setMobileNav(false));
    window.scrollTo({ top: 0 });
  }, [location.pathname, dispatch]);

  useEffect(() => {
    if (location.state?.forbidden) toast.error('That area is restricted to administrators.');
  }, [location.state]);

  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Sidebar variant={variant} badges={{ overdue, unread }} />
      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-300 print:pl-0', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <Header variant={variant} />
        <main id="main" className="mx-auto w-full max-w-[1480px] flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12 lg:px-8 print:max-w-none print:p-0">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={pageEntrance} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0 }} transition={{ duration: 0.18 }}>
              <Suspense fallback={<ContentFallback />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {variant === 'app' && <MobileNav />}
      <CommandPalette />
    </div>
  );
}

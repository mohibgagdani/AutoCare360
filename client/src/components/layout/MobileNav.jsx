import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useState } from 'react';
import { Plus, Car, History, Wallet, BellRing, FileText, MoreHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { setMobileNav } from '@/store/uiSlice';
import { MOBILE_TABS } from './navigation';
import { cn } from '@/utils/cn';
import { useOverlayMotion } from '@/hooks/useMotion';

const QUICK = [
  { label: 'Vehicle', icon: Car, to: '/app/vehicles/new' },
  { label: 'Service', icon: History, to: '/app/service-history?new=1' },
  { label: 'Expense', icon: Wallet, to: '/app/expenses?new=1' },
  { label: 'Reminder', icon: BellRing, to: '/app/reminders?new=1' },
  { label: 'Document', icon: FileText, to: '/app/documents?new=1' },
];

/** Bottom tab bar for phones with a centre quick-add button. */
export function MobileNav() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [quickOpen, setQuickOpen] = useState(false);
  const fade = useOverlayMotion({ opacity: 0 });
  const rise = useOverlayMotion({ opacity: 0, y: 20 });
  const tabs = [...MOBILE_TABS.slice(0, 2), null, ...MOBILE_TABS.slice(2)];

  return (
    <>
      <AnimatePresence>
        {quickOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-[2px] md:hidden" {...fade} animate={{ opacity: 1 }} onClick={() => setQuickOpen(false)} />
            <motion.div
              {...rise}
              animate={{ opacity: 1, y: 0 }}
              className="fixed inset-x-4 bottom-24 z-50 grid grid-cols-5 gap-2 rounded-2xl border border-line bg-surface p-3 shadow-pop md:hidden"
            >
              {QUICK.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => {
                    setQuickOpen(false);
                    navigate(q.to);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-2 text-[11px] font-medium text-ink-2 active:bg-surface-3"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    <q.icon size={18} aria-hidden />
                  </span>
                  {q.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="grid h-16 grid-cols-6 items-center">
          {tabs.map((tab, i) =>
            tab ? (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn('flex flex-col items-center gap-1 text-[10.5px] font-medium transition', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-ink-3')
                }
              >
                <tab.icon size={20} aria-hidden />
                {tab.label}
              </NavLink>
            ) : (
              <div key={`add-${i}`} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setQuickOpen((o) => !o)}
                  aria-label="Quick add"
                  aria-expanded={quickOpen}
                  className={cn(
                    '-mt-6 flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow transition-transform',
                    quickOpen && 'rotate-45'
                  )}
                >
                  <Plus size={24} />
                </button>
              </div>
            )
          )}
          <button type="button" onClick={() => dispatch(setMobileNav(true))} className="flex flex-col items-center gap-1 text-[10.5px] font-medium text-ink-3">
            <MoreHorizontal size={20} aria-hidden />
            More
          </button>
        </div>
      </nav>
    </>
  );
}

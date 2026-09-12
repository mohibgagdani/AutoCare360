import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Car,
  Wrench,
  History,
  Wallet,
  FileText,
  BellRing,
  LayoutDashboard,
  Plus,
  Moon,
  Sun,
  CornerDownLeft,
  Loader2,
  Settings,
} from 'lucide-react';
import { setCommandOpen } from '@/store/uiSlice';
import { searchApi } from '@/services';
import { useDebounce, useHotkey } from '@/hooks/common';
import { useTheme } from '@/hooks/useTheme';
import { StatusBadge, Kbd } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';
import { useOverlayMotion } from '@/hooks/useMotion';

const GROUP_ICONS = { vehicles: Car, maintenance: Wrench, services: History, expenses: Wallet, documents: FileText, reminders: BellRing };

/** Global search + quick actions (⌘K / Ctrl+K). */
export function CommandPalette() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const open = useSelector((s) => s.ui.commandOpen);
  const { resolved, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebounce(query, 220);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const close = () => dispatch(setCommandOpen(false));
  const fade = useOverlayMotion({ opacity: 0 });
  const pop = useOverlayMotion({ opacity: 0, scale: 0.97, y: -8 }, { opacity: 0, scale: 0.97 });
  useHotkey('k', () => dispatch(setCommandOpen(!open)), { meta: true });
  useHotkey('/', () => dispatch(setCommandOpen(true)));

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults(null);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    searchApi
      .search(debounced.trim(), { signal: controller.signal })
      .then((res) => {
        setResults(res.data);
        setActive(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debounced]);

  const actions = useMemo(
    () => [
      { id: 'a-dash', title: 'Go to dashboard', icon: LayoutDashboard, run: () => navigate('/app') },
      { id: 'a-vehicle', title: 'Add a vehicle', icon: Plus, run: () => navigate('/app/vehicles/new') },
      { id: 'a-service', title: 'Log a service record', icon: History, run: () => navigate('/app/service-history?new=1') },
      { id: 'a-expense', title: 'Add an expense', icon: Wallet, run: () => navigate('/app/expenses?new=1') },
      { id: 'a-reminder', title: 'Create a reminder', icon: BellRing, run: () => navigate('/app/reminders?new=1') },
      { id: 'a-maint', title: 'View overdue maintenance', icon: Wrench, run: () => navigate('/app/maintenance?status=overdue') },
      { id: 'a-settings', title: 'Open settings', icon: Settings, run: () => navigate('/app/settings') },
      {
        id: 'a-theme',
        title: `Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`,
        icon: resolved === 'dark' ? Sun : Moon,
        run: () => setTheme(resolved === 'dark' ? 'light' : 'dark'),
      },
    ],
    [navigate, resolved, setTheme]
  );

  const flat = useMemo(() => {
    if (results?.groups?.length) {
      return results.groups.flatMap((g) =>
        g.items.map((item) => ({ ...item, group: g.key, groupLabel: g.label, run: () => navigate(item.link) }))
      );
    }
    const q = query.trim().toLowerCase();
    return actions.filter((a) => !q || a.title.toLowerCase().includes(q)).map((a) => ({ ...a, groupLabel: 'Quick actions' }));
  }, [results, actions, query, navigate]);

  const execute = (item) => {
    close();
    item?.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute(flat[active]);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let lastGroup = null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75] flex items-start justify-center px-3 pt-[10vh]">
          <motion.div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" {...fade} animate={{ opacity: 1 }} onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            {...pop}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              {loading ? <Loader2 size={18} className="animate-spin text-ink-3" /> : <Search size={18} className="text-ink-3" aria-hidden />}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vehicles, maintenance, service centres, expenses…"
                className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-results"
                aria-activedescendant={flat[active] ? `cmd-${active}` : undefined}
              />
              <Kbd>Esc</Kbd>
            </div>
            <div ref={listRef} id="command-results" role="listbox" className="scrollbar-thin max-h-[55vh] overflow-y-auto p-2">
              {query.trim().length >= 2 && results && !results.total && !loading && (
                <p className="px-3 py-10 text-center text-sm text-ink-3">No results for “{query}”.</p>
              )}
              {flat.map((item, index) => {
                const header = item.groupLabel !== lastGroup ? item.groupLabel : null;
                lastGroup = item.groupLabel;
                const Icon = item.icon || GROUP_ICONS[item.group] || Search;
                return (
                  <div key={`${item.group || 'a'}-${item.id}`}>
                    {header && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{header}</p>}
                    <button
                      id={`cmd-${index}`}
                      data-index={index}
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      onMouseMove={() => setActive(index)}
                      onClick={() => execute(item)}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', index === active ? 'bg-surface-3' : '')}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2 ring-1 ring-line">
                        <Icon size={16} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                        {item.subtitle && <span className="block truncate text-xs text-ink-3">{item.subtitle}</span>}
                      </span>
                      {item.meta?.status && <StatusBadge status={item.meta.status} size="xs" />}
                      {item.meta?.amount !== undefined && <span className="text-xs font-semibold text-ink-2 tabular">{formatCurrency(item.meta.amount)}</span>}
                      {index === active && <CornerDownLeft size={14} className="text-ink-3" aria-hidden />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-line bg-surface-2 px-4 py-2 text-[11px] text-ink-3">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate <Kbd>↵</Kbd> open
              </span>
              <span>
                <Kbd>Ctrl</Kbd> <Kbd>K</Kbd> to toggle
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Menu as MenuIcon, Search, Plus, Sun, Moon, Monitor, Car, History, Wallet, BellRing, FileText, LogOut, Settings, User } from 'lucide-react';
import { setCommandOpen, setMobileNav } from '@/store/uiSlice';
import { logout } from '@/store/authSlice';
import { useTheme } from '@/hooks/useTheme';
import { Menu, Kbd, Avatar, Button } from '@/components/ui';
import { NotificationBell } from './NotificationPanel';
import { LogoMark } from '@/components/brand/Logo';

export function ThemeMenu() {
  const { theme, resolved, setTheme } = useTheme();
  const Icon = resolved === 'dark' ? Moon : Sun;
  return (
    <Menu
      label="Change theme"
      triggerClassName="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 transition hover:bg-surface-3 hover:text-ink"
      trigger={<Icon size={19} aria-hidden />}
      items={[
        { label: 'Light', icon: Sun, onClick: () => setTheme('light'), hint: theme === 'light' ? '✓' : '' },
        { label: 'Dark', icon: Moon, onClick: () => setTheme('dark'), hint: theme === 'dark' ? '✓' : '' },
        { label: 'System', icon: Monitor, onClick: () => setTheme('system'), hint: theme === 'system' ? '✓' : '' },
      ]}
    />
  );
}

export function QuickAddMenu({ compact = false }) {
  const navigate = useNavigate();
  return (
    <Menu
      label="Quick add"
      triggerClassName={
        compact
          ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700'
          : 'inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600'
      }
      trigger={
        <>
          <Plus size={17} aria-hidden />
          {!compact && <span>Quick add</span>}
        </>
      }
      items={[
        { label: 'Vehicle', icon: Car, onClick: () => navigate('/app/vehicles/new') },
        { label: 'Service record', icon: History, onClick: () => navigate('/app/service-history?new=1') },
        { label: 'Expense', icon: Wallet, onClick: () => navigate('/app/expenses?new=1') },
        { label: 'Reminder', icon: BellRing, onClick: () => navigate('/app/reminders?new=1') },
        { label: 'Document', icon: FileText, onClick: () => navigate('/app/documents?new=1') },
      ]}
    />
  );
}

/** Sticky top bar: search trigger, quick add, theme, notifications, account. */
export function Header({ variant = 'app' }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/70">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => dispatch(setMobileNav(true))}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-3 lg:hidden"
          aria-label="Open navigation"
        >
          <MenuIcon size={20} />
        </button>
        <LogoMark size={28} className="lg:hidden" />

        <button
          type="button"
          onClick={() => dispatch(setCommandOpen(true))}
          className="group hidden h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 text-sm text-ink-3 transition hover:border-line-strong hover:bg-surface sm:flex"
        >
          <Search size={16} aria-hidden />
          <span className="flex-1 text-left">Search vehicles, services, expenses…</span>
          <span className="flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => dispatch(setCommandOpen(true))}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-3 sm:hidden"
            aria-label="Search"
          >
            <Search size={19} />
          </button>
          {variant === 'app' && (
            <div className="hidden sm:block">
              <QuickAddMenu />
            </div>
          )}
          {variant === 'admin' && (
            <Button variant="secondary" size="sm" to="/app" className="hidden sm:inline-flex">
              Open app
            </Button>
          )}
          <ThemeMenu />
          <NotificationBell />
          <Menu
            label="Account"
            triggerClassName="ml-1 flex items-center rounded-full ring-offset-2 ring-offset-surface transition hover:ring-2 hover:ring-brand-500/40"
            trigger={<Avatar name={user?.name} src={user?.avatar?.url} size={34} />}
            items={[
              { label: user?.name || 'Account', icon: User, disabled: true },
              { divider: true },
              { label: 'Settings', icon: Settings, onClick: () => navigate('/app/settings') },
              { label: 'Sign out', icon: LogOut, danger: true, onClick: async () => { await dispatch(logout()); navigate('/login'); } },
            ]}
          />
        </div>
      </div>
    </header>
  );
}

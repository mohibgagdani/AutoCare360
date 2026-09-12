import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, LogOut, Shield, ArrowLeft, Plus, Settings } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Avatar, Tooltip, Menu } from '@/components/ui';
import { toggleSidebar, setMobileNav } from '@/store/uiSlice';
import { logout } from '@/store/authSlice';
import { cn } from '@/utils/cn';
import { useOverlayMotion } from '@/hooks/useMotion';
import { APP_NAV, ADMIN_NAV } from './navigation';

function NavItem({ item, collapsed, badges, onNavigate }) {
  const Icon = item.icon;
  const count = item.badge ? badges[item.badge] : 0;
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span layoutId="sidebar-active" className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand-400" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
          )}
          <Icon size={18} className={cn('shrink-0', isActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300')} aria-hidden />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {count > 0 && (
            <span
              className={cn(
                'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold tabular',
                item.badge === 'overdue' ? 'bg-red-500/90 text-white' : 'bg-brand-500 text-white',
                collapsed && 'absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[9px]'
              )}
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right" className="w-full">
      <div className="w-full">{link}</div>
    </Tooltip>
  ) : (
    link
  );
}

/** Dark navy sidebar (desktop fixed, mobile drawer). */
export function SidebarContent({ variant = 'app', collapsed = false, badges = {}, onNavigate, showCollapse = true }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const sections = variant === 'admin' ? ADMIN_NAV : APP_NAV;

  const signOut = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex h-full flex-col bg-navy-900 text-slate-300 dark:bg-navy-950">
      <div className={cn('flex h-16 items-center border-b border-white/[0.06] px-4', collapsed && 'justify-center px-2')}>
        <Logo to={variant === 'admin' ? '/admin' : '/app'} collapsed={collapsed} light />
        {variant === 'admin' && !collapsed && (
          <span className="ml-2 rounded-md bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-300">Admin</span>
        )}
      </div>

      {variant === 'app' && (
        <div className={cn('px-3 pt-4', collapsed && 'px-2')}>
          <NavLink
            to="/app/vehicles/new"
            onClick={onNavigate}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-110',
              collapsed && 'px-0'
            )}
            aria-label="Add vehicle"
          >
            <Plus size={17} aria-hidden />
            {!collapsed && 'Add vehicle'}
          </NavLink>
        </div>
      )}

      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label={variant === 'admin' ? 'Admin navigation' : 'Main navigation'}>
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed ? (
              <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">{section.label}</p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-white/10" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} badges={badges} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}

        {user?.role === 'admin' && (
          <div>
            {!collapsed && <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">Switch</p>}
            <NavItem
              item={variant === 'admin' ? { to: '/app', label: 'Back to app', icon: ArrowLeft, end: true } : { to: '/admin', label: 'Admin panel', icon: Shield }}
              collapsed={collapsed}
              badges={{}}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </nav>

      <div className={cn('border-t border-white/[0.06] p-3', collapsed && 'px-2')}>
        <div className={cn('flex items-center gap-3 rounded-xl p-2', collapsed && 'justify-center p-0')}>
          <Avatar name={user?.name} src={user?.avatar?.url} size={34} className="ring-navy-900" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <Menu
              align="end"
              triggerClassName="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
              label="Account menu"
              items={[
                { label: 'Settings', icon: Settings, onClick: () => navigate('/app/settings') },
                { divider: true },
                { label: 'Sign out', icon: LogOut, danger: true, onClick: signOut },
              ]}
            />
          )}
        </div>
        {showCollapse && (
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="mt-2 hidden w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white/5 hover:text-slate-200 lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ variant = 'app', badges }) {
  const dispatch = useDispatch();
  const collapsed = useSelector((s) => s.ui.sidebarCollapsed);
  const mobileOpen = useSelector((s) => s.ui.mobileNavOpen);
  const fade = useOverlayMotion({ opacity: 0 });
  const slide = useOverlayMotion({ x: '-100%' });

  return (
    <>
      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.04] transition-[width] duration-300 lg:block',
          collapsed ? 'w-[76px]' : 'w-[264px]'
        )}
      >
        <SidebarContent variant={variant} collapsed={collapsed} badges={badges} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div
              className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
              {...fade}
              animate={{ opacity: 1 }}
              onClick={() => dispatch(setMobileNav(false))}
            />
            <motion.aside
              {...slide}
              animate={{ x: 0 }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="absolute inset-y-0 left-0 w-[284px] max-w-[85vw] shadow-2xl"
            >
              <SidebarContent variant={variant} badges={badges} onNavigate={() => dispatch(setMobileNav(false))} showCollapse={false} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

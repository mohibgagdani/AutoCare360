import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export function LogoMark({ size = 32, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cn('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id="ac360-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#2550e6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0b1220" />
      <circle cx="32" cy="32" r="19" fill="none" stroke="url(#ac360-g)" strokeWidth="6" strokeLinecap="round" strokeDasharray="90 30" transform="rotate(-40 32 32)" />
      <path d="M24 34.5l5.5 5.5L41 27" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ to = '/', collapsed = false, className, light = false }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2.5', className)} aria-label="AutoCare360 home">
      <LogoMark size={32} />
      {!collapsed && (
        <span className={cn('font-display text-[17px] font-bold tracking-tight', light ? 'text-white' : 'text-ink')}>
          AutoCare<span className="text-brand-500">360</span>
        </span>
      )}
    </Link>
  );
}

import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-600/60 dark:bg-brand-500 dark:hover:bg-brand-600',
  secondary:
    'bg-surface text-ink border border-line shadow-sm hover:bg-surface-2 hover:border-line-strong active:bg-surface-3',
  outline: 'border border-line-strong text-ink hover:bg-surface-2 active:bg-surface-3',
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink active:bg-surface-3',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25',
  danger: 'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 active:bg-red-800 disabled:bg-red-600/60',
  'danger-ghost': 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10',
  dark: 'bg-navy-900 text-white hover:bg-navy-800 dark:bg-white dark:text-navy-900 dark:hover:bg-slate-100',
};

const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
  'icon-xs': 'h-7 w-7 rounded-md',
};

/**
 * Button — renders a <Link> when `to` is set, an <a> when `href` is set.
 */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, leftIcon: LeftIcon, rightIcon: RightIcon, className, children, to, href, type = 'button', ...props },
  ref
) {
  const classes = cn(
    'inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap transition-all duration-150 focus-visible:outline-2 disabled:opacity-60 disabled:shadow-none',
    VARIANTS[variant],
    SIZES[size],
    className
  );
  const iconSize = size === 'lg' ? 18 : size === 'xs' ? 13 : 16;
  const content = (
    <>
      {loading ? <Loader2 size={iconSize} className="animate-spin" aria-hidden /> : LeftIcon && <LeftIcon size={iconSize} aria-hidden />}
      {children}
      {!loading && RightIcon && <RightIcon size={iconSize} aria-hidden />}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
});

/** Square icon-only button with an accessible label. */
export const IconButton = forwardRef(function IconButton({ icon: Icon, label, size = 'icon-sm', variant = 'ghost', className, iconSize, ...props }, ref) {
  return (
    <Button ref={ref} variant={variant} size={size} className={className} aria-label={label} title={label} {...props}>
      <Icon size={iconSize || (size === 'icon' ? 18 : 16)} aria-hidden />
    </Button>
  );
});

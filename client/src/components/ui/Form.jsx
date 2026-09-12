import { forwardRef, useId } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export const inputBase =
  'w-full rounded-xl border bg-surface text-sm text-ink placeholder:text-ink-3 shadow-[inset_0_1px_1px_rgb(15_23_42/0.02)] transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3';
const stateClasses = (invalid) =>
  invalid
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500/70'
    : 'border-line-strong/80 hover:border-line-strong focus:border-brand-500 focus:ring-brand-500/15';

/** Label + control + hint/error wrapper. Pass the control as children. */
export function Field({ label, htmlFor, error, hint, required, className, children, labelAction }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(label || labelAction) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
              {label}
              {required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
            </label>
          )}
          {labelAction}
        </div>
      )}
      {children}
      {error ? (
        <p role="alert" className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <AlertCircle size={12} aria-hidden />
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-ink-3">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { invalid, leftIcon: LeftIcon, suffix, prefix, className, containerClassName, size = 'md', ...props },
  ref
) {
  const height = size === 'sm' ? 'h-9' : size === 'lg' ? 'h-12' : 'h-10';
  return (
    <div className={cn('relative flex items-center', containerClassName)}>
      {LeftIcon && <LeftIcon size={16} className="pointer-events-none absolute left-3 text-ink-3" aria-hidden />}
      {prefix && <span className="pointer-events-none absolute left-3 text-sm text-ink-3">{prefix}</span>}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          inputBase,
          stateClasses(invalid),
          height,
          'px-3.5',
          (LeftIcon || prefix) && 'pl-9',
          suffix && 'pr-12',
          className
        )}
        {...props}
      />
      {suffix && <span className="pointer-events-none absolute right-3 text-xs font-medium text-ink-3">{suffix}</span>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ invalid, className, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, stateClasses(invalid), 'resize-y px-3.5 py-2.5 leading-relaxed', className)}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ invalid, className, children, placeholder, size = 'md', ...props }, ref) {
  const height = size === 'sm' ? 'h-9' : 'h-10';
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(inputBase, stateClasses(invalid), height, 'appearance-none pl-3.5 pr-9', className)}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
    </div>
  );
});

/** Native date input styled like the rest of the form. */
export const DatePicker = forwardRef(function DatePicker(props, ref) {
  return <Input ref={ref} type="date" {...props} />;
});

export const Checkbox = forwardRef(function Checkbox({ label, description, className, ...props }, ref) {
  const id = useId();
  return (
    <label htmlFor={props.id || id} className={cn('flex cursor-pointer items-start gap-3', className)}>
      <input
        ref={ref}
        id={props.id || id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong accent-brand-600"
        {...props}
      />
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-medium text-ink">{label}</span>}
          {description && <span className="text-xs text-ink-3">{description}</span>}
        </span>
      )}
    </label>
  );
});

export function Switch({ checked, onChange, label, description, disabled, id }) {
  const generated = useId();
  const switchId = id || generated;
  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <label htmlFor={switchId} className="flex cursor-pointer flex-col">
          {label && <span className="text-sm font-medium text-ink">{label}</span>}
          {description && <span className="text-xs text-ink-3">{description}</span>}
        </label>
      )}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-brand-600' : 'bg-surface-3 ring-1 ring-inset ring-line-strong'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

/** Radio-card group for small option sets (e.g. reminder timing). */
export function OptionCards({ options, value, onChange, columns = 3, className }) {
  return (
    <div className={cn('grid gap-2', className)} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} role="radiogroup">
      {options.map((o) => {
        const active = String(o.value) === String(value);
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-col items-start rounded-xl border px-3 py-2.5 text-left text-sm transition',
              active
                ? 'border-brand-500 bg-brand-50 text-brand-700 ring-4 ring-brand-500/10 dark:bg-brand-500/10 dark:text-brand-300'
                : 'border-line text-ink-2 hover:border-line-strong hover:bg-surface-2'
            )}
          >
            <span className="font-medium">{o.label}</span>
            {o.description && <span className="text-xs text-ink-3">{o.description}</span>}
          </button>
        );
      })}
    </div>
  );
}

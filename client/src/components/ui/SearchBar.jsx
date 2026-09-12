import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { inputBase } from './Form';

/** Debounced search input that syncs with an external value (e.g. URL param). */
export function SearchBar({ value = '', onChange, placeholder = 'Search…', delay = 350, className, autoFocus, size = 'md' }) {
  const [text, setText] = useState(value);
  const first = useRef(true);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    if (text === value) return undefined;
    const t = setTimeout(() => onChange(text.trim()), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className={cn('relative', className)}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onChange(text.trim())}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          inputBase,
          'border-line-strong/80 pl-9 pr-9 focus:border-brand-500 focus:ring-brand-500/15 [&::-webkit-search-cancel-button]:hidden',
          size === 'sm' ? 'h-9' : 'h-10'
        )}
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText('');
            onChange('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 hover:bg-surface-3 hover:text-ink"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

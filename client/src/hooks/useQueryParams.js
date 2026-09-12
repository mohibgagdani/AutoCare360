import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Filter state stored in the URL (shareable, survives refresh, back button works).
 * Changing any key other than `page` resets pagination to page 1.
 */
export function useQueryParams(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => {
    const out = { ...defaults };
    searchParams.forEach((value, key) => {
      out[key] = value;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setParams = useCallback(
    (updates, { replace = true } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const entries = typeof updates === 'function' ? Object.entries(updates(Object.fromEntries(prev))) : Object.entries(updates);
          let resetPage = false;
          for (const [key, value] of entries) {
            if (key !== 'page') resetPage = true;
            if (value === undefined || value === null || value === '' || value === defaults[key]) next.delete(key);
            else next.set(key, String(value));
          }
          if (resetPage && !('page' in Object.fromEntries(entries))) next.delete('page');
          return next;
        },
        { replace }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setSearchParams]
  );

  const clear = useCallback(
    (keep = []) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams();
        keep.forEach((k) => prev.get(k) && next.set(k, prev.get(k)));
        return next;
      });
    },
    [setSearchParams]
  );

  return [params, setParams, clear];
}

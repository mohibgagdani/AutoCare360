import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { fetchMeta, selectCategoryMap, selectFuelTypeMap, selectVehicleTypeMap } from '@/store/metaSlice';
import { getErrorMessage } from '@/utils/errors';

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export const useIsMobile = () => !useMediaQuery('(min-width: 768px)');

export function useDisclosure(initial = false) {
  const [isOpen, setOpen] = useState(initial);
  const [payload, setPayload] = useState(null);
  const open = useCallback((data = null) => {
    setPayload(data);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  return { isOpen, open, close, payload, setPayload };
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · AutoCare360` : 'AutoCare360 — Complete vehicle maintenance, simplified.';
  }, [title]);
}

export function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, active]);
}

/** Global keyboard shortcut, e.g. useHotkey('k', open, { meta: true }). */
export function useHotkey(key, handler, { meta = false } = {}) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const listener = (e) => {
      if (meta && !(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      const tag = e.target?.tagName;
      if (!meta && (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable)) return;
      e.preventDefault();
      ref.current(e);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [key, meta]);
}

/**
 * Wraps a mutation: loading flag, success toast, friendly error toast.
 *   const [save, saving] = useAction(api.update, { success: 'Saved' });
 */
export function useAction(fn, { success, error: errorMessage, onSuccess, onError, silent = false } = {}) {
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async (...args) => {
      setPending(true);
      try {
        const res = await fn(...args);
        const message = typeof success === 'function' ? success(res) : success ?? res?.message;
        if (message && !silent) toast.success(message);
        await onSuccess?.(res, ...args);
        return res;
      } catch (err) {
        const message = errorMessage || getErrorMessage(err);
        if (message && !onError?.(err)) toast.error(message);
        throw err;
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, success, errorMessage, onSuccess, onError, silent]
  );
  return [run, pending];
}

/** Catalog data (vehicle types, fuels, categories) — loads once. */
export function useMeta() {
  const dispatch = useDispatch();
  const meta = useSelector((s) => s.meta);
  const vehicleTypeMap = useSelector(selectVehicleTypeMap);
  const fuelTypeMap = useSelector(selectFuelTypeMap);
  const categoryMap = useSelector(selectCategoryMap);
  useEffect(() => {
    if (meta.status === 'idle') dispatch(fetchMeta());
  }, [dispatch, meta.status]);
  return { ...meta, vehicleTypeMap, fuelTypeMap, categoryMap, ready: meta.status === 'ready' };
}

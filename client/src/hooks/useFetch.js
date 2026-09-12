import { useCallback, useEffect, useRef, useState } from 'react';
import { onChange } from '@/utils/events';

/**
 * Data fetching with cancellation, refetch, and cross-component invalidation.
 *
 *   const { data, meta, loading, error, refetch } = useFetch(
 *     (signal) => vehicleApi.list(params, { signal }),
 *     [JSON.stringify(params)],
 *     { refreshOn: ['vehicles'] }
 *   );
 *
 * Previous data is kept while refetching so pages don't flash skeletons.
 */
export function useFetch(fetcher, deps = [], { enabled = true, refreshOn = [], initialData = null } = {}) {
  const [state, setState] = useState({ data: initialData, meta: null, loading: enabled, error: null, loaded: false });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const controllerRef = useRef(null);

  const run = useCallback(async ({ silent = false } = {}) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetcherRef.current(controller.signal);
      if (controller.signal.aborted) return;
      setState({ data: res?.data ?? res, meta: res?.meta ?? null, loading: false, error: null, loaded: true });
    } catch (error) {
      if (controller.signal.aborted || error.code === 'ERR_CANCELED') return;
      setState((s) => ({ ...s, loading: false, error, loaded: true }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return undefined;
    }
    run();
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const topics = refreshOn.join(',');
  useEffect(() => {
    if (!topics) return undefined;
    return onChange(topics.split(','), () => run({ silent: true }));
  }, [topics, run]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return {
    ...state,
    // First load (skeleton) vs background refresh (dimmed content).
    initialLoading: state.loading && !state.loaded,
    refreshing: state.loading && state.loaded,
    refetch: run,
    setData,
  };
}

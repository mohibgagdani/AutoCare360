import { useEffect, useState } from 'react';
import { vehicleApi } from '@/services';
import { onChange } from '@/utils/events';

let cache = null;
let inflight = null;

const load = () => {
  if (!inflight) {
    inflight = vehicleApi
      .list({ limit: 100, status: 'active', sort: 'make' })
      .then((res) => {
        cache = res.data;
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

/** The signed-in user's active vehicles for pickers and filters (shared cache). */
export function useVehicles() {
  const [vehicles, setVehicles] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let mounted = true;
    load()
      .then((list) => mounted && setVehicles(list))
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    const off = onChange('vehicles', () => {
      cache = null;
      load().then((list) => mounted && setVehicles(list)).catch(() => {});
    });
    return () => {
      mounted = false;
      off();
    };
  }, []);

  return { vehicles, loading };
}

export const clearVehicleCache = () => {
  cache = null;
};

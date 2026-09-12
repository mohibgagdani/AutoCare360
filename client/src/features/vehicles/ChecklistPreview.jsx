import { useEffect, useMemo, useState } from 'react';
import { ListChecks, Sparkles, Loader2 } from 'lucide-react';
import { metaApi } from '@/services';
import { useDebounce } from '@/hooks/common';
import { CategoryIcon } from '@/components/maintenance/MaintenanceBits';
import { Badge } from '@/components/ui';
import { formatNumber } from '@/utils/format';

/**
 * Live preview of the maintenance checklist the vehicle will receive — proves
 * the schedule is vehicle-specific (EVs get no oil changes, bikes get chain care…).
 */
export function ChecklistPreview({ spec, unit = 'km', compact = false }) {
  const debounced = useDebounce(spec, 400);
  const key = JSON.stringify(debounced);
  const [state, setState] = useState({ loading: false, data: null });

  useEffect(() => {
    if (!debounced.vehicleType || !debounced.fuelType) {
      setState({ loading: false, data: null });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    metaApi
      .preview(debounced)
      .then((res) => !cancelled && setState({ loading: false, data: res.data }))
      .catch(() => !cancelled && setState({ loading: false, data: null }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const item of state.data?.items || []) {
      const k = item.category?._id || 'other';
      if (!map.has(k)) map.set(k, { category: item.category, items: [] });
      map.get(k).items.push(item);
    }
    return [...map.values()];
  }, [state.data]);

  const u = unit === 'hours' ? 'hrs' : 'km';

  if (!spec.vehicleType || !spec.fuelType) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong p-5 text-center text-sm text-ink-3">
        <ListChecks size={20} className="mx-auto mb-2 text-ink-3" aria-hidden />
        Choose a vehicle type and fuel to preview its maintenance plan.
      </div>
    );
  }

  const manufacturerItems = (state.data?.items || []).filter((i) => i.manufacturerSpecific);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Maintenance plan preview</p>
        {state.loading ? (
          <Loader2 size={16} className="animate-spin text-ink-3" aria-label="Updating preview" />
        ) : (
          <Badge tone="brand">{state.data?.total || 0} items</Badge>
        )}
      </div>
      {manufacturerItems.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-teal-700 dark:text-teal-300">
          <Sparkles size={13} className="mt-0.5 shrink-0" aria-hidden />
          Includes {manufacturerItems.length} {spec.make}-specific interval{manufacturerItems.length > 1 ? 's' : ''}: {manufacturerItems.map((i) => i.name).join(', ')}
        </p>
      )}
      <div className={`scrollbar-thin mt-3 space-y-3 overflow-y-auto pr-1 ${compact ? 'max-h-72' : 'max-h-[420px]'}`}>
        {groups.map((g) => (
          <div key={g.category?._id || 'other'}>
            <div className="mb-1.5 flex items-center gap-2">
              <CategoryIcon category={g.category} size={22} />
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">{g.category?.name}</p>
              <span className="text-xs text-ink-3">{g.items.length}</span>
            </div>
            <ul className="space-y-1 pl-8">
              {g.items.map((item) => (
                <li key={item.code} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="truncate text-ink-2">{item.name}</span>
                  <span className="shrink-0 text-xs text-ink-3 tabular">
                    {[item.intervalKm && `${formatNumber(item.intervalKm)} ${u}`, item.intervalMonths && `${item.intervalMonths}mo`].filter(Boolean).join(' / ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!state.loading && !groups.length && <p className="text-sm text-ink-3">No templates match this combination yet.</p>}
      </div>
    </div>
  );
}

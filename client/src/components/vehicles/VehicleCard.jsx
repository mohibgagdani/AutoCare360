import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gauge, Fuel, Zap, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import { VehicleVisual, RegPlate } from './VehicleVisual';
import { HealthRing, StatusBadge, Badge } from '@/components/ui';
import { formatDate, formatNumber } from '@/utils/format';
import { unitLabel, vehicleName } from '@/utils/vehicle';
import { cn } from '@/utils/cn';
import { useEntrance } from '@/hooks/useMotion';

/** Premium vehicle card for the garage grid. */
export function VehicleCard({ vehicle, type, fuel, index = 0, onOdometer }) {
  const unit = unitLabel(type?.usageUnit);
  const counts = vehicle.openTaskCounts || {};
  const next = vehicle.nextService;
  const FuelIcon = fuel?.powertrain === 'ev' ? Zap : Fuel;
  const initial = useEntrance({ opacity: 0, y: 14 });

  return (
    <motion.article
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.3 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-line-strong hover:shadow-card-hover"
    >
      <Link to={`/app/vehicles/${vehicle._id}`} className="absolute inset-0 z-10" aria-label={`Open ${vehicleName(vehicle)}`} />
      <div className="relative">
        <VehicleVisual
          vehicle={vehicle}
          illustration={type?.illustration}
          rounded="rounded-none"
          className="aspect-[16/9] w-full px-8 pt-6 pb-2"
          artClassName="w-full max-w-[280px] transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge tone="gray" className="bg-white/85 text-slate-700 ring-white/60 backdrop-blur dark:bg-navy-900/70 dark:text-slate-200 dark:ring-white/10">
            {type?.name || vehicle.vehicleType}
          </Badge>
          {vehicle.status !== 'active' && <Badge tone="yellow">{vehicle.status}</Badge>}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-white/90 p-0.5 shadow-sm backdrop-blur dark:bg-navy-900/80">
          <HealthRing score={vehicle.healthScore ?? 100} size={48} stroke={5} showLabel={false} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-ink">{vehicleName(vehicle)}</h3>
            <p className="truncate text-[13px] text-ink-3">
              {vehicle.nickname ? `${vehicle.make} ${vehicle.model}` : vehicle.variant || vehicle.make}
              {vehicle.year ? ` · ${vehicle.year}` : ''}
            </p>
          </div>
          <RegPlate number={vehicle.registrationNumber} fuelType={vehicle.fuelType} group={type?.group} />
        </div>

        <div className="flex items-center gap-4 text-[13px] text-ink-2">
          <span className="inline-flex items-center gap-1.5 tabular">
            <Gauge size={14} className="text-ink-3" aria-hidden />
            {formatNumber(vehicle.odometer)} {unit}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FuelIcon size={14} className="text-ink-3" aria-hidden />
            {fuel?.name || vehicle.fuelType}
          </span>
        </div>

        <div className="mt-auto rounded-xl border border-line bg-surface-2 p-3">
          {next?.name ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">Next maintenance</p>
                <p className="truncate text-sm font-medium text-ink">{next.name}</p>
                <p className="text-xs text-ink-3">
                  {[next.date && formatDate(next.date), next.odometer && `${formatNumber(next.odometer)} ${unit}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <StatusBadge status={next.status} />
            </div>
          ) : (
            <p className="text-sm text-ink-3">No maintenance scheduled</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {counts.overdue > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
                <AlertTriangle size={13} aria-hidden /> {counts.overdue} overdue
              </span>
            )}
            {counts.dueSoon + counts.due > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                <Clock size={13} aria-hidden /> {counts.dueSoon + counts.due} upcoming
              </span>
            )}
            {!counts.overdue && !(counts.dueSoon + counts.due) && <span className="font-medium text-emerald-600 dark:text-emerald-400">All maintenance up to date</span>}
          </div>
          <div className="flex items-center gap-1">
            {onOdometer && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onOdometer(vehicle);
                }}
                className={cn('relative z-20 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10')}
              >
                Update {unit === 'hrs' ? 'hours' : 'odometer'}
              </button>
            )}
            <ChevronRight size={16} className="text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

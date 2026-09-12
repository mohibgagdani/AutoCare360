import { VehicleArt } from './VehicleArt';
import { shade } from '@/utils/vehicle';
import { fileUrl } from '@/utils/files';
import { cn } from '@/utils/cn';

export const artTint = (color = '#2563eb') => ({
  '--art-light-1': shade(color, 0.9),
  '--art-light-2': shade(color, 0.75),
  '--art-dark-1': shade(color, -0.72),
  '--art-dark-2': shade(color, -0.55),
});

/** Photo if uploaded, otherwise a tinted illustration. */
export function VehicleVisual({ vehicle, illustration, className, artClassName, rounded = 'rounded-xl', style }) {
  if (vehicle?.image?.url) {
    return (
      <div className={cn('overflow-hidden bg-surface-3', rounded, className)} style={style}>
        <img src={fileUrl(vehicle.image.url)} alt={`${vehicle.make} ${vehicle.model}`} className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }
  return (
    <div className={cn('vehicle-art-bg flex items-center justify-center overflow-hidden', rounded, className)} style={{ ...artTint(vehicle?.color), ...style }}>
      <VehicleArt illustration={illustration} color={vehicle?.color} className={artClassName} title={vehicle ? `${vehicle.make} ${vehicle.model}` : undefined} />
    </div>
  );
}

/** Small square thumbnail for lists and tables. */
export function VehicleThumb({ vehicle, illustration, size = 40, className }) {
  return (
    <VehicleVisual
      vehicle={vehicle}
      illustration={illustration}
      rounded="rounded-xl"
      className={cn('shrink-0 p-1', className)}
      artClassName="w-full"
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Indian-style number plate: green for EVs, yellow for commercial vehicles,
 * white otherwise.
 */
export function RegPlate({ number, fuelType, group, size = 'sm', className }) {
  const ev = fuelType === 'electric';
  const commercial = group === 'light_commercial' || group === 'heavy_commercial';
  const tone = ev
    ? 'bg-emerald-600 text-white border-emerald-700'
    : commercial
      ? 'bg-amber-300 text-slate-900 border-amber-500'
      : 'bg-white text-slate-900 border-slate-300 dark:border-slate-500';
  return (
    <span
      className={cn(
        'inline-flex items-stretch overflow-hidden rounded-md border font-mono font-semibold uppercase tracking-wider shadow-sm',
        size === 'lg' ? 'text-sm' : 'text-[11px]',
        tone,
        className
      )}
    >
      <span className={cn('flex items-center bg-blue-700 px-1 text-[7px] leading-none text-white', size === 'lg' && 'px-1.5 text-[8px]')}>IND</span>
      <span className={cn('px-1.5 py-0.5', size === 'lg' && 'px-2 py-1')}>{number}</span>
    </span>
  );
}

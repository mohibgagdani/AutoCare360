/** Display helpers for vehicles. */
export const vehicleName = (v) => (v ? v.nickname || `${v.make} ${v.model}`.trim() : 'Vehicle');
export const vehicleFullName = (v) => (v ? `${v.make} ${v.model}${v.variant ? ` ${v.variant}` : ''}`.trim() : '');

/** Usage unit of a vehicle type ('km' or 'hours'). */
export const usageUnitOf = (vehicle, typeMap) => typeMap?.[vehicle?.vehicleType]?.usageUnit || 'km';
export const unitLabel = (unit) => (unit === 'hours' ? 'hrs' : 'km');

/** Picks black or white text for a given background colour. */
export function readableOn(hex = '#2563eb') {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0b1220' : '#ffffff';
}

/** Lighten/darken a hex colour by a factor (-1..1). */
export function shade(hex = '#2563eb', amount = 0) {
  const c = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  const out = channels.map((v) => {
    const target = amount < 0 ? 0 : 255;
    return Math.round(v + (target - v) * Math.abs(amount));
  });
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

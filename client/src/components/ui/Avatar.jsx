import { cn } from '@/utils/cn';
import { initials } from '@/utils/format';
import { fileUrl } from '@/utils/files';

const GRADIENTS = [
  'from-sky-500 to-blue-600',
  'from-violet-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
];

const hash = (s = '') => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function Avatar({ name, src, size = 36, className }) {
  const gradient = GRADIENTS[hash(name) % GRADIENTS.length];
  return src ? (
    <img
      src={fileUrl(src)}
      alt={name || ''}
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full object-cover ring-2 ring-surface', className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden={!name}
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-surface', gradient, className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name) || '?'}
    </span>
  );
}

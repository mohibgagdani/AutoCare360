import { useId } from 'react';
import { shade } from '@/utils/vehicle';
import { cn } from '@/utils/cn';

/*
 * Side-profile vehicle illustrations (viewBox 240×120, facing right).
 * Body colour comes from the vehicle's colour; glass, tyres and trim are shared.
 */

function Wheel({ cx, cy, r, spokes = false }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#111827" />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="#cbd5e1" />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke="#94a3b8" strokeWidth="1.2" />
      {spokes &&
        [0, 60, 120].map((a) => (
          <line
            key={a}
            x1={cx + Math.cos((a * Math.PI) / 180) * r * 0.55}
            y1={cy + Math.sin((a * Math.PI) / 180) * r * 0.55}
            x2={cx - Math.cos((a * Math.PI) / 180) * r * 0.55}
            y2={cy - Math.sin((a * Math.PI) / 180) * r * 0.55}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
        ))}
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#475569" />
    </g>
  );
}

function BikeWheel({ cx, cy, r }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111827" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r - 6} fill="none" stroke="#cbd5e1" strokeWidth="1.6" />
      {[0, 45, 90, 135].map((a) => (
        <line
          key={a}
          x1={cx + Math.cos((a * Math.PI) / 180) * (r - 6)}
          y1={cy + Math.sin((a * Math.PI) / 180) * (r - 6)}
          x2={cx - Math.cos((a * Math.PI) / 180) * (r - 6)}
          y2={cy - Math.sin((a * Math.PI) / 180) * (r - 6)}
          stroke="#94a3b8"
          strokeWidth="0.9"
        />
      ))}
      <circle cx={cx} cy={cy} r="4" fill="#475569" />
    </g>
  );
}

const Headlight = ({ d }) => <path d={d} fill="#fde68a" stroke="#f59e0b" strokeWidth="0.6" />;
const Taillight = ({ d }) => <path d={d} fill="#ef4444" />;

const SHAPES = {
  sedan: ({ body, glass, trim }) => (
    <>
      <path d="M18 84 C18 76 22 71 32 69 L70 64 L96 45 C101 41 107 40 114 40 L150 40 C158 40 164 42 170 47 L192 64 L214 68 C222 70 226 75 226 82 L226 88 C226 91 224 92 221 92 L204 92 A21 21 0 0 0 162 92 L86 92 A21 21 0 0 0 44 92 L22 92 C19 92 18 90 18 88 Z" {...body} />
      <path d="M88 62 L104 49 C106 47 108 46 111 46 L124 46 L124 62 Z" fill={glass} />
      <path d="M130 46 L151 46 C156 46 159 47 162 50 L176 62 L130 62 Z" fill={glass} />
      <path d="M44 80 L204 80" stroke={trim} strokeWidth="1.2" opacity="0.5" />
      <path d="M127 64 L127 86" stroke={trim} strokeWidth="1" opacity="0.45" />
      <rect x="110" y="67" width="9" height="2.4" rx="1.2" fill={trim} opacity="0.6" />
      <rect x="150" y="67" width="9" height="2.4" rx="1.2" fill={trim} opacity="0.6" />
      <Headlight d="M213 70 L223 72.5 L223 77 L211 75.5 Z" />
      <Taillight d="M18 74 L27 72 L27 78 L18 79 Z" />
      <Wheel cx={65} cy={92} r={17} spokes />
      <Wheel cx={183} cy={92} r={17} spokes />
    </>
  ),
  hatchback: ({ body, glass, trim }) => (
    <>
      <path d="M20 86 C20 70 22 57 29 49 C33 44 40 42 48 41 L148 40 C157 40 163 43 168 48 L190 65 L212 69 C220 71 224 76 224 83 L224 88 C224 91 222 92 219 92 L202 92 A21 21 0 0 0 160 92 L84 92 A21 21 0 0 0 42 92 L24 92 C21 92 20 90 20 88 Z" {...body} />
      <path d="M31 62 C32 55 35 50 42 48 L68 47 L68 62 Z" fill={glass} />
      <path d="M74 47 L112 47 L112 62 L74 62 Z" fill={glass} />
      <path d="M118 47 L148 47 C153 47 157 48 160 51 L173 62 L118 62 Z" fill={glass} />
      <path d="M42 80 L202 80" stroke={trim} strokeWidth="1.2" opacity="0.5" />
      <path d="M115 64 L115 86" stroke={trim} strokeWidth="1" opacity="0.45" />
      <Headlight d="M211 71 L221 73.5 L221 78 L209 76.5 Z" />
      <Taillight d="M20 66 L27 64 L27 72 L20 73 Z" />
      <Wheel cx={63} cy={92} r={17} spokes />
      <Wheel cx={181} cy={92} r={17} spokes />
    </>
  ),
  suv: ({ body, glass, trim }) => (
    <>
      <path d="M40 15 L150 13" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 86 L16 36 C16 26 22 21 32 20 L166 18 C175 18 181 21 186 27 L203 50 L217 54 C225 56 228 61 228 69 L228 88 C228 91 226 92 223 92 L206 92 A23 23 0 0 0 160 92 L86 92 A23 23 0 0 0 40 92 L20 92 C17 92 16 90 16 88 Z" {...body} />
      <path d="M26 46 L26 34 C26 29 29 27 34 27 L62 26 L62 46 Z" fill={glass} />
      <path d="M68 26 L112 25 L112 46 L68 46 Z" fill={glass} />
      <path d="M118 25 L162 24 C167 24 171 26 174 30 L187 46 L118 46 Z" fill={glass} />
      <path d="M16 78 L228 78" stroke={trim} strokeWidth="1.3" opacity="0.45" />
      <path d="M115 48 L115 86" stroke={trim} strokeWidth="1" opacity="0.4" />
      <path d="M40 92 A23 23 0 0 1 86 92" fill="none" stroke="#1f2937" strokeWidth="3" />
      <path d="M160 92 A23 23 0 0 1 206 92" fill="none" stroke="#1f2937" strokeWidth="3" />
      <Headlight d="M214 56 L226 59 L226 64 L212 62 Z" />
      <Taillight d="M16 44 L23 44 L23 56 L16 56 Z" />
      <Wheel cx={63} cy={92} r={19} spokes />
      <Wheel cx={183} cy={92} r={19} spokes />
    </>
  ),
  mpv: ({ body, glass, trim }) => (
    <>
      <path d="M14 86 L14 38 C14 28 20 23 30 22 L150 20 C160 20 167 23 173 30 L198 56 L216 60 C224 62 227 67 227 74 L227 88 C227 91 225 92 222 92 L206 92 A22 22 0 0 0 162 92 L82 92 A22 22 0 0 0 38 92 L18 92 C15 92 14 90 14 88 Z" {...body} />
      <path d="M22 48 L22 36 C22 32 25 30 29 30 L56 29 L56 48 Z" fill={glass} />
      <path d="M62 29 L100 28 L100 48 L62 48 Z" fill={glass} />
      <path d="M106 28 L140 27 L140 48 L106 48 Z" fill={glass} />
      <path d="M146 27 L152 27 C158 27 162 29 166 33 L181 48 L146 48 Z" fill={glass} />
      <path d="M14 80 L227 80" stroke={trim} strokeWidth="1.2" opacity="0.45" />
      <Headlight d="M214 62 L225 65 L225 70 L212 68 Z" />
      <Taillight d="M14 44 L20 44 L20 56 L14 56 Z" />
      <Wheel cx={60} cy={92} r={18} spokes />
      <Wheel cx={184} cy={92} r={18} spokes />
    </>
  ),
  pickup: ({ body, glass, trim }) => (
    <>
      <path d="M14 86 L14 54 L100 54 L100 30 C100 25 104 22 110 22 L150 22 C158 22 163 25 168 31 L186 54 L214 58 C222 60 226 65 226 73 L226 88 C226 91 224 92 221 92 L204 92 A21 21 0 0 0 162 92 L84 92 A21 21 0 0 0 42 92 L18 92 C15 92 14 90 14 88 Z" {...body} />
      <path d="M14 54 L100 54" stroke={trim} strokeWidth="2.5" opacity="0.55" />
      <path d="M108 50 L108 32 C108 30 110 28 112 28 L128 28 L128 50 Z" fill={glass} />
      <path d="M134 28 L148 28 C154 28 158 30 162 34 L176 50 L134 50 Z" fill={glass} />
      <path d="M14 78 L226 78" stroke={trim} strokeWidth="1.2" opacity="0.45" />
      <Headlight d="M213 60 L224 63 L224 68 L211 66 Z" />
      <Taillight d="M14 58 L20 58 L20 68 L14 68 Z" />
      <Wheel cx={63} cy={92} r={18} spokes />
      <Wheel cx={183} cy={92} r={18} spokes />
    </>
  ),
  van: ({ body, glass, trim }) => (
    <>
      <path d="M12 86 L12 28 C12 20 18 16 26 16 L166 16 C176 16 183 20 188 28 L208 58 C220 60 226 66 226 76 L226 88 C226 91 224 92 221 92 L204 92 A22 22 0 0 0 160 92 L80 92 A22 22 0 0 0 36 92 L16 92 C13 92 12 90 12 88 Z" {...body} />
      <path d="M112 26 L152 26 L152 50 L112 50 Z" fill={glass} />
      <path d="M158 26 L166 26 C172 26 176 29 180 34 L193 50 L158 50 Z" fill={glass} />
      <path d="M20 26 L100 26 L100 44 L20 44 Z" fill={glass} opacity="0.55" />
      <path d="M106 24 L106 86" stroke={trim} strokeWidth="1.2" opacity="0.5" />
      <path d="M12 76 L226 76" stroke={trim} strokeWidth="1.2" opacity="0.45" />
      <Headlight d="M212 62 L224 65 L224 70 L210 68 Z" />
      <Taillight d="M12 50 L18 50 L18 62 L12 62 Z" />
      <Wheel cx={58} cy={92} r={18} spokes />
      <Wheel cx={182} cy={92} r={18} spokes />
    </>
  ),
  minitruck: ({ body, glass, trim, color }) => (
    <>
      <rect x="10" y="86" width="214" height="5" rx="2" fill="#1f2937" />
      <path d="M12 38 L140 38 L140 84 L12 84 Z" fill={shade(color, 0.35)} stroke={shade(color, -0.25)} strokeWidth="1" />
      {[42, 74, 106].map((x) => (
        <path key={x} d={`M${x} 40 L${x} 82`} stroke={shade(color, -0.2)} strokeWidth="1.2" opacity="0.6" />
      ))}
      <path d="M12 38 L140 38" stroke={shade(color, -0.3)} strokeWidth="2.5" />
      <path d="M144 88 L144 40 C144 34 148 30 154 30 L186 30 C193 30 198 34 201 40 L212 62 C219 64 224 68 224 76 L224 88 Z" {...body} />
      <path d="M152 58 L152 40 C152 38 154 36 156 36 L184 36 C189 36 192 39 194 43 L200 58 Z" fill={glass} />
      <Headlight d="M214 66 L224 68 L224 73 L212 71 Z" />
      <Wheel cx={52} cy={94} r={15} />
      <Wheel cx={184} cy={94} r={15} />
    </>
  ),
  truck: ({ body, glass, trim, color }) => (
    <>
      <rect x="6" y="84" width="222" height="6" rx="2" fill="#1f2937" />
      <path d="M8 18 C8 15 10 13 13 13 L148 13 C150 13 150 15 150 18 L150 82 L8 82 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      {[36, 64, 92, 120].map((x) => (
        <path key={x} d={`M${x} 16 L${x} 80`} stroke="#cbd5e1" strokeWidth="1.2" />
      ))}
      <path d="M8 70 L150 70" stroke={color} strokeWidth="6" />
      <path d="M154 88 L154 30 C154 22 160 18 168 18 L200 18 C208 18 213 23 215 30 L222 56 C226 58 228 62 228 68 L228 88 Z" {...body} />
      <path d="M164 50 L164 28 L204 28 C207 28 209 30 210 33 L214 50 Z" fill={glass} />
      <path d="M154 64 L228 64" stroke={trim} strokeWidth="1.2" opacity="0.45" />
      <Headlight d="M218 70 L228 72 L228 78 L216 76 Z" />
      <Wheel cx={40} cy={94} r={15} />
      <Wheel cx={74} cy={94} r={15} />
      <Wheel cx={196} cy={94} r={15} />
    </>
  ),
  bus: ({ body, glass, trim, color }) => (
    <>
      <path d="M8 84 L8 22 C8 14 14 10 22 10 L212 10 C222 10 228 16 229 26 L232 78 C232 84 229 88 224 88 L12 88 C9 88 8 86 8 84 Z" {...body} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={18 + i * 29} y={20} width={24} height={24} rx={3} fill={glass} />
      ))}
      <path d="M200 20 L220 20 C224 20 226 22 226 26 L228 50 L200 50 Z" fill={glass} />
      <path d="M190 22 L190 84" stroke={trim} strokeWidth="1.2" opacity="0.5" />
      <path d="M8 58 L232 58" stroke={shade(color, 0.5)} strokeWidth="5" opacity="0.8" />
      <circle cx="50" cy="90" r="19" fill="#1f2937" />
      <circle cx="188" cy="90" r="19" fill="#1f2937" />
      <Headlight d="M222 64 L231 64 L231 70 L221 70 Z" />
      <Wheel cx={50} cy={92} r={15} />
      <Wheel cx={188} cy={92} r={15} />
    </>
  ),
  motorcycle: ({ color }) => (
    <>
      <path d="M100 78 L56 88" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
      <path d="M72 82 L128 86" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <path d="M160 34 L186 88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <BikeWheel cx={56} cy={88} r={24} />
      <BikeWheel cx={186} cy={88} r={24} />
      <path d="M34 66 C40 52 56 49 72 54 L68 59 C56 57 46 60 40 68 Z" fill={color} />
      <path d="M100 60 L136 58 L132 82 L104 84 Z" fill="#475569" />
      {[66, 71, 76].map((y) => (
        <path key={y} d={`M106 ${y} L132 ${y - 1}`} stroke="#94a3b8" strokeWidth="1.2" />
      ))}
      <path d="M60 53 C62 47 70 45 80 46 L102 49 L99 57 L64 58 Z" fill="#1f2937" />
      <path d="M92 51 C96 40 108 36 122 37 L146 40 C153 41 156 45 152 50 L136 59 L99 60 Z" fill={color} stroke={shade(color, -0.3)} strokeWidth="0.8" />
      <path d="M104 44 C112 40 126 40 138 43" stroke="#ffffff" strokeWidth="2" opacity="0.35" fill="none" strokeLinecap="round" />
      <path d="M166 70 C172 60 192 58 204 67" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M148 30 L168 25" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
      <circle cx="170" cy="40" r="7" fill="#fde68a" stroke="#1f2937" strokeWidth="2" />
    </>
  ),
  scooter: ({ color }) => (
    <>
      <path d="M170 60 L182 90" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      <Wheel cx={58} cy={90} r={17} />
      <Wheel cx={182} cy={90} r={17} />
      <path d="M96 82 L150 82 L152 88 L100 88 Z" fill="#334155" />
      <path d="M30 70 C30 58 42 52 58 52 L118 52 C126 52 130 56 132 62 L136 78 L96 82 L52 82 C38 82 30 78 30 70 Z" fill={color} stroke={shade(color, -0.3)} strokeWidth="0.8" />
      <path d="M40 60 C50 56 80 55 110 56" stroke="#ffffff" strokeWidth="2" opacity="0.35" fill="none" strokeLinecap="round" />
      <path d="M146 86 L158 36 C160 30 164 28 170 28 L176 28 L178 34 L166 84 Z" fill={color} stroke={shade(color, -0.3)} strokeWidth="0.8" />
      <path d="M50 50 C52 42 60 40 70 40 L112 40 C120 40 124 44 122 50 Z" fill="#1f2937" />
      <path d="M162 22 L186 19" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
      <path d="M170 24 L172 30" stroke="#334155" strokeWidth="3" />
      <ellipse cx="174" cy="36" rx="5" ry="4" fill="#fde68a" stroke="#1f2937" strokeWidth="1.5" />
      <Taillight d="M30 64 L36 62 L36 70 L30 70 Z" />
    </>
  ),
  tractor: ({ body, glass, color }) => (
    <>
      <rect x="96" y="80" width="118" height="6" rx="2" fill="#1f2937" />
      <path d="M100 58 L210 58 C216 58 220 62 220 68 L220 82 L100 82 Z" {...body} />
      <path d="M212 62 L220 62 L220 80 L212 80 Z" fill="#1f2937" opacity="0.8" />
      {[120, 140, 160, 180].map((x) => (
        <path key={x} d={`M${x} 62 L${x} 78`} stroke={shade(color, -0.3)} strokeWidth="1.5" opacity="0.6" />
      ))}
      <rect x="176" y="28" width="6" height="30" rx="2" fill="#1f2937" />
      <path d="M110 22 L124 36" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="112" cy="22" rx="9" ry="3" fill="none" stroke="#1f2937" strokeWidth="2.5" />
      <path d="M74 30 L98 30 L96 38 L76 38 Z" fill="#1f2937" />
      <path d="M86 38 L86 58" stroke="#1f2937" strokeWidth="3" />
      <circle cx="70" cy="78" r="31" fill="#111827" />
      <circle cx="70" cy="78" r="31" fill="none" stroke="#374151" strokeWidth="5" strokeDasharray="5 5" />
      <circle cx="70" cy="78" r="17" fill={color} />
      <circle cx="70" cy="78" r="6" fill="#374151" />
      <path d="M32 62 C36 40 56 30 76 30 C94 30 108 40 112 54 L112 62 Z" fill={color} stroke={shade(color, -0.3)} strokeWidth="0.8" />
      <Wheel cx={192} cy={93} r={14} />
      <Headlight d="M206 60 L214 60 L214 64 L206 64 Z" />
    </>
  ),
  excavator: ({ body, glass, color }) => (
    <>
      <path d="M20 84 C20 78 25 74 31 74 L149 74 C155 74 160 78 160 84 L160 92 C160 98 155 102 149 102 L31 102 C25 102 20 98 20 92 Z" fill="#1f2937" />
      {[36, 60, 84, 108, 132].map((x) => (
        <circle key={x} cx={x + 6} cy="88" r="6" fill="#64748b" />
      ))}
      <path d="M118 50 L168 12 L180 16 L128 60 Z" {...body} />
      <path d="M168 12 L210 58 L202 64 L162 22 Z" {...body} />
      <path d="M126 40 L160 18" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <path d="M200 58 L224 64 L216 88 L196 78 Z" fill="#475569" />
      <path d="M24 72 L24 54 L36 54 L36 72 Z" fill={shade(color, -0.35)} />
      <path d="M34 72 L34 50 L78 50 L78 34 C78 30 81 28 85 28 L112 28 C117 28 120 31 121 35 L126 72 Z" {...body} />
      <path d="M86 34 L110 34 L114 58 L86 58 Z" fill={glass} />
    </>
  ),
  trailer: ({ body, glass, color }) => (
    <>
      <path d="M186 74 L230 84" stroke="#1f2937" strokeWidth="5" strokeLinecap="round" />
      <path d="M212 80 L212 100" stroke="#475569" strokeWidth="3" />
      <path d="M18 34 C18 28 22 24 28 24 L178 24 C184 24 188 28 188 34 L188 80 L18 80 Z" {...body} />
      <path d="M30 36 L176 36 L176 48 L30 48 Z" fill={glass} opacity="0.35" />
      <path d="M18 62 L188 62" stroke={shade(color, 0.45)} strokeWidth="4" />
      <path d="M80 80 C80 70 90 66 110 66 C130 66 142 70 142 80" fill="#1f2937" />
      <Wheel cx={96} cy={90} r={13} />
      <Wheel cx={126} cy={90} r={13} />
      <Taillight d="M18 70 L24 70 L24 76 L18 76 Z" />
    </>
  ),
};

/**
 * @param {{ illustration?: string, color?: string, className?: string, ground?: boolean }} props
 */
export function VehicleArt({ illustration = 'sedan', color = '#2563eb', className, ground = true, title }) {
  const gid = useId().replace(/:/g, '');
  const Shape = SHAPES[illustration] || SHAPES.sedan;
  const base = color || '#2563eb';
  const body = {
    fill: `url(#body-${gid})`,
    stroke: shade(base, -0.35),
    strokeWidth: 0.9,
  };
  const glass = `url(#glass-${gid})`;
  const trim = shade(base, -0.45);

  return (
    <svg viewBox="0 0 240 120" className={cn('h-auto w-full', className)} role="img" aria-label={title || `${illustration} illustration`}>
      <defs>
        <linearGradient id={`body-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(base, 0.28)} />
          <stop offset="0.45" stopColor={base} />
          <stop offset="1" stopColor={shade(base, -0.22)} />
        </linearGradient>
        <linearGradient id={`glass-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#334155" />
          <stop offset="0.5" stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      {ground && <ellipse cx="120" cy="110" rx="104" ry="5" fill="#0f172a" opacity="0.14" />}
      <Shape body={body} glass={glass} trim={trim} color={base} />
    </svg>
  );
}

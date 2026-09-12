import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, BellRing, LineChart, Star } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { VehicleArt } from '@/components/vehicles/VehicleArt';
import { ThemeMenu } from '@/components/layout/Header';
import { useEntrance } from '@/hooks/useMotion';

const POINTS = [
  { icon: ShieldCheck, text: 'Vehicle-specific schedules for cars, bikes, EVs, trucks & tractors' },
  { icon: BellRing, text: 'Smart reminders before services, insurance & PUC expire' },
  { icon: LineChart, text: 'Every rupee tracked — fuel, charging, repairs & running cost per km' },
];

/** Split-screen layout for sign in / sign up / password flows. */
export function AuthLayout() {
  const rise = useEntrance({ opacity: 0, y: 20 });
  const enter = useEntrance({ opacity: 0, y: 12 });
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col">
        <div className="bg-grid absolute inset-0 opacity-40" aria-hidden />
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-3xl" aria-hidden />
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative my-auto max-w-lg">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Complete vehicle maintenance, <span className="text-gradient">simplified.</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-slate-300">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300">
                  <p.icon size={16} aria-hidden />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
          <motion.div initial={rise} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative mt-12">
            <div className="grid grid-cols-3 gap-3">
              {[
                ['suv', '#2563eb'],
                ['motorcycle', '#f97316'],
                ['minitruck', '#eab308'],
              ].map(([kind, color], i) => (
                <div key={kind} className="animate-float rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur" style={{ animationDelay: `${i * 0.8}s` }}>
                  <VehicleArt illustration={kind} color={color} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        <figure className="relative mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex gap-0.5 text-amber-400" aria-label="5 out of 5 stars">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={14} fill="currentColor" aria-hidden />
            ))}
          </div>
          <blockquote className="mt-2 text-sm leading-relaxed text-slate-300">
            “We run eleven delivery vehicles. AutoCare360 replaced three spreadsheets and we haven’t missed a PUC renewal since.”
          </blockquote>
          <figcaption className="mt-3 text-xs text-slate-400">Fleet manager, Pune</figcaption>
        </figure>
      </aside>

      <div className="relative flex flex-col bg-canvas">
        <div className="flex items-center justify-between p-5 sm:p-6">
          <div className="lg:invisible">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-sm font-medium text-ink-3 hover:text-ink">
              Back to home
            </Link>
            <ThemeMenu />
          </div>
        </div>
        <main className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <motion.div initial={enter} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-[420px]">
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

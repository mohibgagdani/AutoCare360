import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarClock,
  BellRing,
  Wallet,
  FileText,
  HeartPulse,
  History,
  Car,
  Sparkles,
  CheckCircle2,
  Zap,
  Gauge,
  ShieldCheck,
  Star,
  Menu as MenuIcon,
  X,
  LineChart,
  Wrench,
  Leaf,
  Mail,
  Globe,
  MessageCircle,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { VehicleArt } from '@/components/vehicles/VehicleArt';
import { artTint } from '@/components/vehicles/VehicleVisual';
import { Button, HealthRing, StatusBadge, Badge } from '@/components/ui';
import { ThemeMenu } from '@/components/layout/Header';
import { useDocumentTitle } from '@/hooks/common';
import { useEntrance } from '@/hooks/useMotion';
import { cn } from '@/utils/cn';

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#vehicles', label: 'Vehicles' },
  { href: '#analytics', label: 'Analytics' },
  { href: '#testimonials', label: 'Reviews' },
];

const FEATURES = [
  { icon: CalendarClock, title: 'Vehicle-specific schedules', text: 'Maintenance plans built from 180+ templates matched to type, fuel, powertrain, transmission and even make — EVs never get oil changes.' },
  { icon: BellRing, title: 'Smart reminders', text: 'Due by date or odometer, whichever comes first. Alerts 7, 15 or 30 days ahead for services, insurance, PUC and licences.' },
  { icon: Wallet, title: 'Every rupee tracked', text: 'Fuel, charging, tolls, repairs and insurance with monthly trends, cost per km and total cost of ownership.' },
  { icon: FileText, title: 'Document vault', text: 'RC, insurance, PUC and warranties in one place with automatic expiry warnings before they lapse.' },
  { icon: HeartPulse, title: 'Vehicle health score', text: 'A 0–100 score for every vehicle so you see what needs attention across your whole garage at a glance.' },
  { icon: History, title: 'Service history & reports', text: 'Log workshop visits with parts, invoices and photos. Export CSV or printable PDF maintenance reports.' },
];

const STEPS = [
  { title: 'Add your vehicle', text: 'Car, bike, EV, truck or tractor — tell us the type, fuel and last service.', icon: Car },
  { title: 'Get a tailored plan', text: 'AutoCare360 instantly builds a maintenance schedule specific to that vehicle.', icon: Sparkles },
  { title: 'Stay ahead', text: 'Log services and odometer readings; we remind you before anything is due.', icon: CheckCircle2 },
];

const VEHICLES = [
  ['Hatchback', 'hatchback', '#dc2626'],
  ['Sedan', 'sedan', '#2563eb'],
  ['SUV', 'suv', '#0f766e'],
  ['MPV / MUV', 'mpv', '#7c3aed'],
  ['Electric car', 'hatchback', '#10b981'],
  ['Motorcycle', 'motorcycle', '#f97316'],
  ['Scooter & e-scooter', 'scooter', '#0ea5e9'],
  ['Pickup', 'pickup', '#475569'],
  ['Van', 'van', '#e11d48'],
  ['Mini truck', 'minitruck', '#eab308'],
  ['Truck', 'truck', '#1d4ed8'],
  ['Bus', 'bus', '#f59e0b'],
  ['Tractor', 'tractor', '#b91c1c'],
  ['Construction', 'excavator', '#ca8a04'],
  ['Trailer', 'trailer', '#64748b'],
];

const TESTIMONIALS = [
  { quote: 'My Nexon EV and my dad’s Innova have completely different needs. AutoCare360 just knows — battery checks for one, oil changes for the other.', name: 'Riya S.', role: 'EV owner, Bengaluru' },
  { quote: 'We run eleven delivery vehicles. It replaced three spreadsheets and we haven’t missed a PUC or permit renewal since.', name: 'Harpreet G.', role: 'Fleet manager, Ludhiana' },
  { quote: 'Tractor service by engine hours instead of kilometres — finally an app that understands farm equipment.', name: 'Sandeep P.', role: 'Farmer, Baramati' },
];

function SectionHeading({ eyebrow, title, text, className }) {
  return (
    <div className={cn('mx-auto max-w-2xl text-center', className)}>
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-base leading-relaxed text-ink-3">{text}</p>}
    </div>
  );
}

/** Product mock composed from real UI components. */
function HeroMock() {
  const rise = useEntrance({ opacity: 0, y: 30 });
  return (
    <motion.div initial={rise} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }} className="relative mx-auto mt-16 max-w-5xl">
      <div className="absolute -inset-x-10 -top-10 bottom-0 rounded-[3rem] bg-gradient-to-b from-brand-500/25 via-cyan-400/10 to-transparent blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface/90 p-3 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-1.5 px-2 pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 rounded-md bg-surface-2 px-3 py-1 text-[11px] text-ink-3">app.autocare360.in/dashboard</span>
        </div>
        <div className="grid gap-3 rounded-2xl bg-surface-2 p-4 md:grid-cols-3">
          <div className="grid grid-cols-2 gap-3 md:col-span-3 md:grid-cols-4">
            {[
              ['Vehicles', '8', Car, 'text-brand-600 bg-brand-500/15 dark:text-brand-300'],
              ['Due soon', '5', CalendarClock, 'text-amber-600 bg-amber-500/15 dark:text-amber-300'],
              ['This month', '₹18,430', Wallet, 'text-teal-600 bg-teal-500/15 dark:text-teal-300'],
              ['Avg health', '86', HeartPulse, 'text-emerald-600 bg-emerald-500/15 dark:text-emerald-300'],
            ].map(([label, value, Icon, cls]) => (
              <div key={label} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-3">{label}</span>
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', cls)}>
                    <Icon size={14} />
                  </span>
                </div>
                <p className="mt-1.5 text-lg font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Monthly expenses</p>
              <span className="text-[11px] text-ink-3">Last 12 months</span>
            </div>
            <div className="mt-4 flex h-36 items-end gap-2">
              {[58, 64, 40, 46, 72, 60, 84, 48, 55, 66, 52, 38].map((h, i) => (
                <div key={i} className="flex h-full flex-1 flex-col-reverse gap-[2px]">
                  <div className="rounded-b-[3px] bg-[var(--chart-1)]" style={{ height: `${h * 0.6}%` }} />
                  <div className="bg-[var(--chart-2)]" style={{ height: `${(i % 4 === 1 ? 26 : 8)}%` }} />
                  <div className="rounded-t-[4px] bg-[var(--chart-3)]" style={{ height: `${h * 0.18}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4">
            <HealthRing score={92} size={86} stroke={8} />
            <div>
              <p className="text-sm font-semibold text-ink">Nexon EV</p>
              <p className="text-xs text-ink-3">Battery SOH report due in 12 days</p>
              <Badge tone="green" className="mt-2">Excellent</Badge>
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-line bg-surface p-4 md:col-span-3">
            {[
              ['Engine oil change', 'Family Creta · 850 km over', 'overdue'],
              ['Chain lubrication', 'Classic 350 · in 6 days', 'due'],
              ['Insurance renewal', 'Daily Glanza · in 24 days', 'due_soon'],
            ].map(([name, sub, status]) => (
              <div key={name} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{name}</p>
                  <p className="truncate text-xs text-ink-3">{sub}</p>
                </div>
                <StatusBadge status={status} size="xs" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-16 -left-24 hidden w-44 animate-float rounded-2xl border border-line bg-surface/95 p-3 shadow-2xl backdrop-blur lg:block">
        <VehicleArt illustration="suv" color="#2563eb" />
        <p className="mt-1 text-center text-xs font-medium text-ink-2">SUV · 51 items tracked</p>
      </div>
      <div className="absolute -right-14 -top-8 hidden w-48 animate-float rounded-2xl border border-line bg-surface/95 p-3 shadow-2xl backdrop-blur lg:block" style={{ animationDelay: '1.5s' }}>
        <div className="flex items-center gap-2 text-xs font-semibold text-ink">
          <BellRing size={14} className="text-amber-500 dark:text-amber-300" /> PUC expires in 7 days
        </div>
        <p className="mt-1 text-[11px] text-ink-3">Delivery Ace · MH 14 GU 8876</p>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  useDocumentTitle();
  const signedIn = useSelector((s) => s.auth.status === 'authenticated');
  const [menuOpen, setMenuOpen] = useState(false);
  const rise = useEntrance({ opacity: 0, y: 16 });

  // Secondary call-to-action: existing users sign in with their own credentials.
  const signIn = signedIn ? { to: '/app', label: 'Open app' } : { to: '/login', label: 'Sign in' };

  return (
    <div className="min-h-dvh bg-canvas">
      {/* ─── Navigation ─── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-canvas/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8" aria-label="Main">
          <Logo />
          <div className="hidden flex-1 items-center justify-center gap-7 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-sm font-medium text-ink-3 transition hover:text-ink">
                {n.label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <div className="text-ink-3 [&_button]:text-ink-3 [&_button:hover]:bg-surface-2">
              <ThemeMenu />
            </div>
            {signedIn ? (
              <Button size="sm" to="/app" rightIcon={ArrowRight}>
                Open app
              </Button>
            ) : (
              <>
                <Link to="/login" className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2 sm:block">
                  Sign in
                </Link>
                <Button size="sm" to="/register" className="hidden sm:inline-flex">
                  Start Tracking
                </Button>
              </>
            )}
            <button type="button" className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 md:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={menuOpen}>
              {menuOpen ? <X size={20} /> : <MenuIcon size={20} />}
            </button>
          </div>
        </nav>
        {menuOpen && (
          <div className="border-t border-line bg-canvas px-5 py-4 md:hidden">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2">
                {n.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" to="/login">
                Sign in
              </Button>
              <Button to="/register">Start Tracking</Button>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-canvas px-5 pb-24 pt-32 text-ink sm:px-8 sm:pt-40">
        <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px]" aria-hidden />
        <motion.div initial={rise} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative mx-auto max-w-4xl text-center">
          <a href="#vehicles" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2 backdrop-blur transition hover:bg-surface-2">
            <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">New</span>
            EV, hybrid, CNG & tractor schedules built in
            <ArrowRight size={13} aria-hidden />
          </a>
          <h1 className="mt-7 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-6xl">
            Never Miss Your Vehicle’s <span className="text-gradient">Next Service.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
            Track maintenance, expenses, documents and reminders for every vehicle you own — all in one place.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" to="/register" rightIcon={ArrowRight} className="w-full shadow-glow sm:w-auto">
              Start Tracking
            </Button>
            <Button size="lg" variant="outline" to={signIn.to} className="w-full border-line text-ink hover:bg-surface-2 sm:w-auto">
              {signIn.label}
            </Button>
          </div>
          <p className="mt-4 text-xs text-ink-3">Free forever for personal use · No credit card required</p>
        </motion.div>
        <HeroMock />
        <div className="relative mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-6 text-center sm:grid-cols-4">
          {[
            ['20+', 'vehicle types'],
            ['180+', 'maintenance templates'],
            ['14', 'expense categories'],
            ['0–100', 'health score'],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="font-display text-3xl font-bold text-ink">{value}</p>
              <p className="mt-1 text-sm text-ink-3">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="scroll-mt-20 px-5 py-24 sm:px-8">
        <SectionHeading eyebrow="Features" title="Everything your garage needs" text="From a single scooter to a fleet of trucks, AutoCare360 keeps every vehicle healthy, legal and cost-efficient." />
        <div className="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={entranceFor({ opacity: 0, y: 16 })}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-2xl border border-line bg-surface p-6 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
                <f.icon size={20} aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="how" className="scroll-mt-20 bg-surface-2 px-5 py-24 sm:px-8">
        <SectionHeading eyebrow="How it works" title="Up and running in two minutes" />
        <ol className="relative mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-3">
          <span className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-brand-500/0 via-brand-500/60 to-brand-500/0 md:block" aria-hidden />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative text-center">
              <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-brand-600 shadow-card dark:text-brand-300">
                <s.icon size={24} aria-hidden />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-ink-3">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── Supported vehicles ─── */}
      <section id="vehicles" className="scroll-mt-20 px-5 py-24 sm:px-8">
        <SectionHeading eyebrow="Supported vehicles" title="Not just cars. Everything with an engine — or a battery." text="Each type gets its own maintenance plan: chain care for motorcycles, CVT belts for scooters, air brakes for trucks, hydraulics for tractors and battery health for EVs." />
        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {VEHICLES.map(([name, kind, color]) => (
            <div key={name} className="vehicle-art-bg group rounded-2xl border border-line p-4 transition hover:-translate-y-1 hover:shadow-card-hover" style={artTint(color)}>
              <VehicleArt illustration={kind} color={color} className="transition-transform duration-500 group-hover:scale-105" />
              <p className="mt-2 text-center text-sm font-semibold text-ink">{name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Maintenance tracking ─── */}
      <section className="bg-surface-2 px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">Maintenance tracking</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">Due by date or distance — whichever comes first.</h2>
            <p className="mt-4 text-ink-3">
              Every item has a kilometre (or engine-hour) interval and a time interval. AutoCare360 watches both, shows exactly what’s left, and escalates from
              <em> due soon</em> to <em>due</em> to <em>overdue</em> automatically.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-ink-2">
              {['Manufacturer-specific overrides (e.g. Royal Enfield 10,000 km oil interval)', 'Complete, reschedule or skip in one tap — the next occurrence schedules itself', 'Log a service once and every item it covered is completed'].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Badge tone="gray">Petrol SUV</Badge>
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                {[['Engine oil change', 'overdue'], ['Spark plugs', 'up_to_date'], ['CVT fluid', 'due_soon'], ['Air filter', 'up_to_date']].map(([n, s]) => (
                  <li key={n} className="flex items-center justify-between gap-2">
                    <span className="text-ink-2">{n}</span>
                    <StatusBadge status={s} size="xs" />
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-300 bg-surface p-5 shadow-card dark:border-emerald-500/30">
              <div className="flex items-center gap-2">
                <Badge tone="green" icon={Zap}>Electric SUV</Badge>
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                {[['HV battery health', 'due'], ['Battery coolant', 'up_to_date'], ['Firmware update', 'due_soon'], ['Regen braking', 'up_to_date']].map(([n, s]) => (
                  <li key={n} className="flex items-center justify-between gap-2">
                    <span className="text-ink-2">{n}</span>
                    <StatusBadge status={s} size="xs" />
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-emerald-700 dark:text-emerald-300">No oil changes. No spark plugs. Ever.</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:col-span-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">Engine oil change</span>
                <span className="text-ink-3">every 10,000 km or 12 months</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-500/15">
                <div className="h-full w-[88%] rounded-full bg-orange-500" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-ink-3">
                <span>Last: 40,000 km · 1 Jan 2026</span>
                <span className="font-semibold text-ink">Next: 50,000 km or 1 Jan 2027</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Expenses + reminders ─── */}
      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-line bg-surface p-7 shadow-card">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300">
              <Wallet size={20} aria-hidden />
            </span>
            <h3 className="mt-5 font-display text-2xl font-bold text-ink">Expense tracking that tells a story</h3>
            <p className="mt-2 text-sm text-ink-3">Fuel, CNG, charging sessions, tolls, parking, insurance, repairs — see where the money goes and what each kilometre really costs.</p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ['₹4.45', 'per km · Creta'],
                ['₹0.92', 'per km · Nexon EV'],
                ['₹11.8L', 'tracked'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-surface-2 p-3">
                  <p className="text-lg font-semibold text-ink">{v}</p>
                  <p className="text-[11px] text-ink-3">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2.5">
              {[['Fuel & charging', 62], ['Insurance', 18], ['Maintenance', 12], ['Tolls & parking', 8]].map(([l, v]) => (
                <div key={l}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-ink-2">{l}</span>
                    <span className="font-semibold text-ink">{v}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-7 shadow-card">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
              <BellRing size={20} aria-hidden />
            </span>
            <h3 className="mt-5 font-display text-2xl font-bold text-ink">Reminders before it’s a problem</h3>
            <p className="mt-2 text-sm text-ink-3">In-app notifications and email alerts — timed 7, 15 or 30 days ahead, or whenever you choose.</p>
            <ul className="mt-6 space-y-3">
              {[
                [ShieldCheck, 'Insurance expires in 24 days', 'Daily Glanza · Tata AIG', 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'],
                [Leaf, 'PUC certificate expired', 'Delivery Ace · renew today', 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300'],
                [Wrench, '3 maintenance items due soon', 'Honda Activa 6G', 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'],
                [Gauge, 'Tractor service at 3,250 hrs', 'Mahindra 575 DI · 65 hrs left', 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'],
              ].map(([Icon, title, sub, cls]) => (
                <li key={title} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', cls)}>
                    <Icon size={16} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{title}</span>
                    <span className="block truncate text-xs text-ink-3">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Analytics ─── */}
      <section id="analytics" className="scroll-mt-20 bg-surface-2 px-5 py-24 text-ink sm:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">Analytics</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">See your whole garage at a glance</h2>
            <p className="mt-4 text-ink-2">Monthly spend, cost trends, maintenance completion, usage per vehicle and a health score for every vehicle — with printable reports when you sell or insure.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" to={signedIn ? '/app' : '/register'} rightIcon={ArrowRight}>
                {signedIn ? 'Open your dashboard' : 'Start Tracking'}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 rounded-2xl border border-line bg-surface p-5 shadow-card">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <LineChart size={16} className="text-brand-600 dark:text-brand-300" /> Cumulative spend
              </p>
              <svg viewBox="0 0 300 90" className="mt-3 h-24 w-full" aria-hidden>
                <defs>
                  <linearGradient id="landing-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--chart-1)" stopOpacity="0.35" />
                    <stop offset="1" stopColor="var(--chart-1)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 82 C30 76 50 70 75 62 S120 52 150 42 S210 26 240 18 S285 8 300 6 L300 90 L0 90 Z" fill="url(#landing-area)" />
                <path d="M0 82 C30 76 50 70 75 62 S120 52 150 42 S210 26 240 18 S285 8 300 6" fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <p className="text-xs text-ink-3">On-time maintenance</p>
              <p className="mt-1 text-3xl font-bold text-ink">87%</p>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">▲ 12% vs last quarter</p>
            </div>
            <div className="flex items-center justify-center rounded-2xl border border-line bg-surface p-4 shadow-card">
              <HealthRing score={78} size={96} stroke={8} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="scroll-mt-20 px-5 py-24 sm:px-8">
        <SectionHeading eyebrow="Loved by owners & fleets" title="Peace of mind for every kind of garage" />
        <div className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-card">
              <div className="flex gap-0.5 text-amber-400" aria-label="5 out of 5 stars">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={15} fill="currentColor" aria-hidden />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-ink-2">“{t.quote}”</blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold text-ink">{t.name}</span>
                <span className="block text-ink-3">{t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-navy-900 px-8 py-16 text-center text-white shadow-2xl">
          <div className="bg-grid absolute inset-0 opacity-25" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Your vehicles deserve better than a spreadsheet.</h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-100">Add your first vehicle and get a tailored maintenance plan in under two minutes.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="dark" to="/register" rightIcon={ArrowRight} className="bg-white text-navy-900 hover:bg-slate-100 dark:bg-white dark:text-navy-900">
                Start Tracking — it’s free
              </Button>
              <Button size="lg" variant="outline" to={signIn.to} className="border-white/30 text-white hover:bg-white/10">
                {signIn.label}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-line bg-surface px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-ink-3">Complete vehicle maintenance, simplified. Built for cars, bikes, EVs, commercial vehicles and farm equipment.</p>
            <div className="mt-4 flex gap-2 text-ink-3">
              {[Mail, Globe, MessageCircle].map((Icon, i) => (
                <span key={i} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line">
                  <Icon size={16} aria-hidden />
                </span>
              ))}
            </div>
          </div>
          {[
            ['Product', [['Features', '#features'], ['How it works', '#how'], ['Vehicles', '#vehicles'], ['Analytics', '#analytics']]],
            ['Account', [['Sign in', '/login'], ['Create account', '/register'], ['Forgot password', '/forgot-password']]],
            ['Resources', [['Maintenance guide', '#features'], ['EV care', '#vehicles'], ['Fleet management', '#testimonials']]],
          ].map(([title, links]) => (
            <div key={title}>
              <p className="text-sm font-semibold text-ink">{title}</p>
              <ul className="mt-3 space-y-2">
                {links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith('/') ? (
                      <Link to={href} className="text-sm text-ink-3 hover:text-ink">
                        {label}
                      </Link>
                    ) : (
                      <a href={href} className="text-sm text-ink-3 hover:text-ink">
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-ink-3 sm:flex-row">
          <p>© {new Date().getFullYear()} AutoCare360. All rights reserved.</p>
          <p>Made By Mohib Gagdani</p>
        </div>
      </footer>
    </div>
  );
}

/** Helper for whileInView entrances inside loops (reads the global reduced-motion class). */
function entranceFor(initial) {
  return document.documentElement.classList.contains('reduce-motion') ? false : initial;
}

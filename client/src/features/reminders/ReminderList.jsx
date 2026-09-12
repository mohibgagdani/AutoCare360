import { Link } from 'react-router-dom';
import { CheckCircle2, Pencil, Trash2, BellOff, RotateCcw, Repeat, Mail, BellRing } from 'lucide-react';
import { Menu, Badge, EmptyState } from '@/components/ui';
import { REMINDER_TYPES } from '@/utils/constants';
import { daysUntil, formatDate } from '@/utils/format';
import { vehicleName } from '@/utils/vehicle';
import { cn } from '@/utils/cn';

function dueTone(r) {
  if (r.status !== 'active') return { tone: 'gray', label: r.status === 'completed' ? 'Completed' : 'Dismissed' };
  const d = daysUntil(r.dueDate);
  if (d < 0) return { tone: 'red', label: `${Math.abs(d)}d overdue` };
  if (d === 0) return { tone: 'orange', label: 'Due today' };
  if (d <= (r.remindBeforeDays || 7)) return { tone: 'yellow', label: `In ${d} day${d === 1 ? '' : 's'}` };
  return { tone: 'blue', label: `In ${d} days` };
}

const ICON_TONE = {
  red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
  yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  blue: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  gray: 'bg-surface-3 text-ink-3',
};

export function ReminderList({ reminders, actions, showVehicle = true, empty }) {
  if (!reminders.length) {
    return empty || <EmptyState icon={BellRing} title="No reminders here" description="Create reminders for licences, insurance renewals, PUC, FASTag and anything else with a deadline." />;
  }
  return (
    <ul className="divide-y divide-line">
      {reminders.map((r) => {
        const meta = REMINDER_TYPES[r.type] || REMINDER_TYPES.custom;
        const Icon = meta.icon;
        const due = dueTone(r);
        const items = [
          { label: 'Mark done', icon: CheckCircle2, hidden: r.status !== 'active' || r.source === 'maintenance', onClick: () => actions.complete(r) },
          { label: 'Edit', icon: Pencil, onClick: () => actions.edit(r) },
          { label: 'Dismiss', icon: BellOff, hidden: r.status !== 'active', onClick: () => actions.dismiss(r) },
          { label: 'Reactivate', icon: RotateCcw, hidden: r.status === 'active', onClick: () => actions.reactivate(r) },
          { divider: true, hidden: r.source === 'document' },
          { label: 'Delete', icon: Trash2, danger: true, hidden: r.source === 'document', onClick: () => actions.remove(r) },
        ];
        return (
          <li key={r._id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
            <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', ICON_TONE[due.tone])}>
              <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className={cn('font-medium text-ink', r.status !== 'active' && 'text-ink-3 line-through')}>{r.title}</p>
                <Badge tone={due.tone} dot>
                  {due.label}
                </Badge>
                {r.repeat !== 'none' && (
                  <Badge tone="violet" icon={Repeat} size="xs">
                    {r.repeat}
                  </Badge>
                )}
              </div>
              {r.description && <p className="mt-0.5 line-clamp-2 text-sm text-ink-3">{r.description}</p>}
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
                <span>{meta.label}</span>
                <span>Due {formatDate(r.dueDate)}</span>
                {r.remindBeforeDays > 0 && <span>Alert {r.remindBeforeDays}d before</span>}
                {showVehicle && r.vehicle && (
                  <Link to={`/app/vehicles/${r.vehicle._id}`} className="hover:text-brand-600">
                    {vehicleName(r.vehicle)}
                  </Link>
                )}
                {r.document && (
                  <Link to="/app/documents" className="hover:text-brand-600">
                    Document: {r.document.name}
                  </Link>
                )}
                {r.notifyByEmail && <Mail size={12} aria-label="Email alerts on" />}
              </p>
            </div>
            <Menu items={items} />
          </li>
        );
      })}
    </ul>
  );
}

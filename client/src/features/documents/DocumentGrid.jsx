import { Link } from 'react-router-dom';
import { Download, Pencil, Trash2, ExternalLink, FileText, Image as ImageIcon, CalendarX } from 'lucide-react';
import { Menu, ExpiryBadge, EmptyState } from '@/components/ui';
import { DOCUMENT_TYPES } from '@/utils/constants';
import { formatDate, formatFileSize } from '@/utils/format';
import { fileUrl, isImage } from '@/utils/files';
import { vehicleName } from '@/utils/vehicle';
import { cn } from '@/utils/cn';

const STRIPE = { expired: 'bg-red-500', expiring_soon: 'bg-amber-400', valid: 'bg-emerald-500', no_expiry: 'bg-slate-300 dark:bg-slate-600' };

export function DocumentGrid({ documents, onEdit, onDelete, showVehicle = true, empty }) {
  if (!documents.length) {
    return empty || <EmptyState icon={FileText} title="No documents yet" description="Store RC, insurance, PUC, warranty and invoices in one secure place with expiry reminders." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {documents.map((d) => {
        const meta = DOCUMENT_TYPES[d.type] || DOCUMENT_TYPES.other;
        const Icon = meta.icon;
        const status = d.expiry?.status || 'no_expiry';
        const url = d.file ? fileUrl(d.file.url) : null;
        return (
          <article key={d._id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
            <span className={cn('absolute inset-x-0 top-0 h-1', STRIPE[status])} aria-hidden />
            <div className="flex items-start gap-3 p-4 pt-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <Icon size={20} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-ink">{d.name}</h3>
                <p className="truncate text-xs text-ink-3">
                  {meta.label}
                  {d.documentNumber ? ` · ${d.documentNumber}` : ''}
                </p>
              </div>
              <Menu
                items={[
                  { label: 'Open file', icon: ExternalLink, hidden: !url, onClick: () => window.open(url, '_blank', 'noopener') },
                  { label: 'Edit', icon: Pencil, onClick: () => onEdit(d) },
                  { divider: true },
                  { label: 'Delete', icon: Trash2, danger: true, onClick: () => onDelete(d) },
                ]}
              />
            </div>
            <div className="mt-auto space-y-3 px-4 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <ExpiryBadge status={status} daysLeft={d.expiry?.daysLeft} />
                {showVehicle && (
                  <span className="truncate text-xs text-ink-3">
                    {d.vehicle ? (
                      <Link to={`/app/vehicles/${d.vehicle._id}`} className="hover:text-brand-600">
                        {vehicleName(d.vehicle)}
                      </Link>
                    ) : (
                      'Personal'
                    )}
                  </span>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-ink-3">Issued</dt>
                  <dd className="font-medium text-ink-2">{formatDate(d.issueDate)}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Expires</dt>
                  <dd className={cn('font-medium', status === 'expired' ? 'text-red-600 dark:text-red-400' : 'text-ink-2')}>
                    {d.expiryDate ? formatDate(d.expiryDate) : <span className="inline-flex items-center gap-1"><CalendarX size={12} /> Never</span>}
                  </dd>
                </div>
              </dl>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs transition hover:border-line-strong"
                >
                  {isImage(d.file) ? <ImageIcon size={15} className="text-ink-3" /> : <FileText size={15} className="text-red-500" />}
                  <span className="flex-1 truncate text-ink-2">{d.file.originalName || 'Document file'}</span>
                  <span className="text-ink-3">{formatFileSize(d.file.size)}</span>
                  <Download size={14} className="text-ink-3" aria-label="Download" />
                </a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

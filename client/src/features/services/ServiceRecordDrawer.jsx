import { Link } from 'react-router-dom';
import { Pencil, Trash2, FileText, Star, MapPin, User, Gauge, Calendar, ExternalLink, X, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { Drawer, Button, Badge, InfoItem, Skeleton, ErrorState, useConfirm } from '@/components/ui';
import { CategoryIcon } from '@/components/maintenance/MaintenanceBits';
import { serviceRecordApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useMeta } from '@/hooks/common';
import { formatCurrency, formatDate, formatNumber, formatFileSize } from '@/utils/format';
import { fileUrl } from '@/utils/files';
import { SERVICE_TYPES } from '@/utils/constants';
import { unitLabel, vehicleName } from '@/utils/vehicle';
import { emitChange } from '@/utils/events';
import { getErrorMessage } from '@/utils/errors';

export function ServiceRecordDrawer({ recordId, open, onClose, onEdit }) {
  const confirm = useConfirm();
  const { vehicleTypeMap } = useMeta();
  const { data: r, loading, error, refetch, setData } = useFetch((signal) => serviceRecordApi.get(recordId, { signal }), [recordId], {
    enabled: Boolean(open && recordId),
    refreshOn: ['services'],
  });
  const u = unitLabel(vehicleTypeMap[r?.vehicle?.vehicleType]?.usageUnit);

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete this service record?',
      message: 'Its expense entry and attachments are removed too. Maintenance items completed by this visit stay in history.',
      confirmLabel: 'Delete record',
      action: async () => {
        try {
          await serviceRecordApi.remove(r._id);
          toast.success('Service record deleted');
          emitChange('services', 'expenses', 'vehicles', 'maintenance');
        } catch (e) {
          toast.error(getErrorMessage(e));
          throw e;
        }
      },
    });
    if (ok) onClose();
  };

  const removePhoto = async (photoId) => {
    try {
      const res = await serviceRecordApi.removePhoto(r._id, photoId);
      setData((d) => ({ ...d, photos: res.data.photos }));
      toast.success('Photo removed');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={r ? r.serviceCenter || SERVICE_TYPES[r.serviceType] : 'Service record'}
      description={
        r?.vehicle && (
          <Link to={`/app/vehicles/${r.vehicle._id}`} onClick={onClose} className="hover:text-brand-600">
            {vehicleName(r.vehicle)} · {r.vehicle.registrationNumber}
          </Link>
        )
      }
      footer={
        r && (
          <>
            <Button variant="danger-ghost" size="sm" leftIcon={Trash2} onClick={remove}>
              Delete
            </Button>
            <Button variant="secondary" size="sm" leftIcon={Pencil} onClick={() => onEdit(r)}>
              Edit
            </Button>
          </>
        )
      }
    >
      {loading && !r ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} compact />
      ) : r ? (
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-brand-100">{SERVICE_TYPES[r.serviceType]}</p>
                <p className="mt-1 text-3xl font-semibold tabular">{formatCurrency(r.totalCost)}</p>
                <p className="mt-1 text-sm text-brand-100">{formatDate(r.serviceDate, 'EEEE, d MMMM yyyy')}</p>
              </div>
              {r.rating ? (
                <div className="flex gap-0.5" aria-label={`Rated ${r.rating} of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={14} className={n <= r.rating ? 'fill-amber-300 text-amber-300' : 'text-white/30'} aria-hidden />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
            <InfoItem icon={Calendar} label="Date" value={formatDate(r.serviceDate)} />
            <InfoItem icon={Gauge} label="Reading" value={`${formatNumber(r.odometer)} ${u}`} />
            <InfoItem icon={MapPin} label="Location" value={r.serviceCenterLocation || '—'} />
            <InfoItem icon={User} label="Mechanic" value={r.mechanic || '—'} />
          </dl>

          <div>
            <h3 className="text-sm font-semibold text-ink">Work performed</h3>
            {r.maintenanceItems.length ? (
              <ul className="mt-2 space-y-1.5">
                {r.maintenanceItems.map((i, idx) => (
                  <li key={idx} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
                    {i.category ? <CategoryIcon category={i.category} size={26} /> : <Wrench size={16} className="mx-1 text-ink-3" />}
                    <span className="flex-1 text-sm text-ink">{i.name}</span>
                    {i.task && <Badge tone="blue" size="xs">Scheduled item</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-ink-3">No items listed.</p>
            )}
          </div>

          {r.partsReplaced.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink">Parts replaced</h3>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-3">
                    <th className="py-1.5 font-medium">Part</th>
                    <th className="py-1.5 text-right font-medium">Qty</th>
                    <th className="py-1.5 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {r.partsReplaced.map((p, i) => (
                    <tr key={i}>
                      <td className="py-2 text-ink">
                        {p.name}
                        {p.partNumber && <span className="block font-mono text-[11px] text-ink-3">{p.partNumber}</span>}
                      </td>
                      <td className="py-2 text-right text-ink-2 tabular">{p.quantity}</td>
                      <td className="py-2 text-right text-ink-2 tabular">{formatCurrency(p.quantity * p.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-2xl border border-line p-4">
            <h3 className="text-sm font-semibold text-ink">Cost breakdown</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ['Labour', r.laborCost],
                ['Parts', r.partsCost],
                ['Taxes', r.taxes],
                ...(r.discount ? [['Discount', -r.discount]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-ink-3">{label}</dt>
                  <dd className="text-ink-2 tabular">{formatCurrency(value)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <dt className="text-ink">Total</dt>
                <dd className="text-ink tabular">{formatCurrency(r.totalCost)}</dd>
              </div>
            </dl>
          </div>

          {r.notes && (
            <div>
              <h3 className="text-sm font-semibold text-ink">Notes</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{r.notes}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-ink">Attachments</h3>
            {r.invoice ? (
              <a
                href={fileUrl(r.invoice.url)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-line-strong hover:bg-surface-2"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">
                  <FileText size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{r.invoice.originalName || 'Invoice'}</span>
                  <span className="text-xs text-ink-3">{formatFileSize(r.invoice.size)} · Invoice</span>
                </span>
                <ExternalLink size={15} className="text-ink-3" />
              </a>
            ) : (
              <p className="mt-1 text-sm text-ink-3">No invoice attached.</p>
            )}
            {r.photos?.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {r.photos.map((p) => (
                  <div key={p._id} className="group relative aspect-square overflow-hidden rounded-xl bg-surface-3">
                    <a href={fileUrl(p.url)} target="_blank" rel="noreferrer">
                      <img src={fileUrl(p.url)} alt={p.originalName || 'Service photo'} className="h-full w-full object-cover" loading="lazy" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removePhoto(p._id)}
                      className="absolute right-1.5 top-1.5 rounded-lg bg-navy-900/70 p-1 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                      aria-label="Remove photo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

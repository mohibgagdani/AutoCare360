import { Pencil, Trash2, Paperclip, Link2, Wallet } from 'lucide-react';
import { DataTable, EmptyState, Menu, Badge } from '@/components/ui';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/utils/constants';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import { fileUrl } from '@/utils/files';
import { vehicleName } from '@/utils/vehicle';

export function CategoryChip({ category }) {
  const meta = EXPENSE_CATEGORIES[category] || EXPENSE_CATEGORIES.other;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-ink-2">
        <Icon size={15} aria-hidden />
      </span>
      {meta.label}
    </span>
  );
}

export function ExpenseTable({ expenses, loading, refreshing, onEdit, onDelete, showVehicle = true, sort, onSortChange, empty }) {
  const menu = (e) => [
    { label: e.serviceRecord ? 'Edit details' : 'Edit', icon: Pencil, onClick: () => onEdit(e) },
    { label: 'View receipt', icon: Paperclip, hidden: !e.receipt, onClick: () => window.open(fileUrl(e.receipt.url), '_blank', 'noopener') },
    { divider: true, hidden: Boolean(e.serviceRecord) },
    { label: 'Delete', icon: Trash2, danger: true, hidden: Boolean(e.serviceRecord), onClick: () => onDelete(e) },
  ];

  const columns = [
    { key: 'category', header: 'Category', sortKey: 'category', render: (e) => <CategoryChip category={e.category} /> },
    {
      key: 'desc',
      header: 'Description',
      render: (e) => (
        <div className="min-w-0 max-w-xs">
          <p className="truncate font-medium text-ink">{e.description || e.vendor || EXPENSE_CATEGORIES[e.category]?.label}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-ink-3">
            {e.serviceRecord && <Link2 size={11} aria-label="From service record" />}
            {e.vendor || PAYMENT_METHODS[e.paymentMethod]}
            {e.fuelDetails?.quantity ? ` · ${formatNumber(e.fuelDetails.quantity, { decimals: 1 })} ${e.fuelDetails.unit} @ ₹${e.fuelDetails.pricePerUnit}` : ''}
          </p>
        </div>
      ),
      mobileFull: true,
    },
    ...(showVehicle ? [{ key: 'vehicle', header: 'Vehicle', hideBelow: 'lg', render: (e) => <span className="text-ink-2">{vehicleName(e.vehicle)}</span> }] : []),
    { key: 'date', header: 'Date', sortKey: 'date', render: (e) => <span className="text-ink-2">{formatDate(e.date)}</span> },
    { key: 'pay', header: 'Paid via', hideBelow: 'xl', render: (e) => <Badge tone="gray">{PAYMENT_METHODS[e.paymentMethod] || '—'}</Badge> },
    { key: 'amount', header: 'Amount', sortKey: 'amount', align: 'right', render: (e) => <span className="font-semibold text-ink tabular">{formatCurrency(e.amount)}</span> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', mobile: false, render: (e) => <div onClick={(ev) => ev.stopPropagation()}><Menu items={menu(e)} /></div> },
  ];

  return (
    <DataTable
      columns={columns}
      data={expenses}
      loading={loading}
      refreshing={refreshing}
      sort={sort}
      onSortChange={onSortChange}
      onRowClick={onEdit}
      caption="Expenses"
      empty={empty || <EmptyState icon={Wallet} title="No expenses found" description="Log fuel, charging, insurance, tolls and more to see your true cost of ownership." />}
      renderMobile={(e) => {
        const Icon = EXPENSE_CATEGORIES[e.category]?.icon || Wallet;
        return (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-ink-2">
              <Icon size={17} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{e.description || EXPENSE_CATEGORIES[e.category]?.label}</p>
              <p className="truncate text-xs text-ink-3">
                {showVehicle ? `${vehicleName(e.vehicle)} · ` : ''}
                {formatDate(e.date)}
              </p>
            </div>
            <span className="text-sm font-semibold text-ink tabular">{formatCurrency(e.amount)}</span>
          </div>
        );
      }}
    />
  );
}

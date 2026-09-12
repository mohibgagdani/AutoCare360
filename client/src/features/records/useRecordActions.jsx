import { useState } from 'react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui';
import { expenseApi, documentApi } from '@/services';
import { emitChange } from '@/utils/events';
import { getErrorMessage } from '@/utils/errors';
import { ExpenseFormModal } from '@/features/expenses/ExpenseFormModal';
import { DocumentFormModal } from '@/features/documents/DocumentFormModal';
import { ServiceRecordFormModal } from '@/features/services/ServiceRecordFormModal';
import { ServiceRecordDrawer } from '@/features/services/ServiceRecordDrawer';

/**
 * Create/edit/delete flows for service records, expenses and documents,
 * shared by their pages and the vehicle detail tabs.
 */
export function useRecordActions({ vehicles = [], defaultVehicle } = {}) {
  const confirm = useConfirm();
  const [modal, setModal] = useState({ type: null, item: null });
  const [serviceId, setServiceId] = useState(null);
  const close = () => setModal({ type: null, item: null });

  const destroy = (title, message, fn, topics) =>
    confirm({
      title,
      message,
      confirmLabel: 'Delete',
      action: async () => {
        try {
          const res = await fn();
          toast.success(res.message);
          emitChange(...topics);
        } catch (e) {
          toast.error(getErrorMessage(e));
          throw e;
        }
      },
    });

  const actions = {
    createService: () => setModal({ type: 'service', item: null }),
    editService: (record) => {
      setServiceId(null);
      setModal({ type: 'service', item: record });
    },
    openService: (record) => setServiceId(record._id),
    createExpense: () => setModal({ type: 'expense', item: null }),
    editExpense: (expense) => setModal({ type: 'expense', item: expense }),
    deleteExpense: (e) => destroy('Delete expense?', `${e.description || 'This expense'} will be removed permanently.`, () => expenseApi.remove(e._id), ['expenses', 'vehicles']),
    createDocument: () => setModal({ type: 'document', item: null }),
    editDocument: (doc) => setModal({ type: 'document', item: doc }),
    deleteDocument: (d) =>
      destroy('Delete document?', `“${d.name}” and its file will be deleted, along with its expiry reminder.`, () => documentApi.remove(d._id), ['documents', 'reminders', 'vehicles']),
  };

  const element = (
    <>
      <ServiceRecordFormModal open={modal.type === 'service'} record={modal.item} vehicles={vehicles} defaultVehicle={defaultVehicle} onClose={close} />
      <ExpenseFormModal open={modal.type === 'expense'} expense={modal.item} vehicles={vehicles} defaultVehicle={defaultVehicle} onClose={close} />
      <DocumentFormModal open={modal.type === 'document'} document={modal.item} vehicles={vehicles} defaultVehicle={defaultVehicle} onClose={close} />
      <ServiceRecordDrawer recordId={serviceId} open={Boolean(serviceId)} onClose={() => setServiceId(null)} onEdit={actions.editService} />
    </>
  );

  return { actions, element };
}

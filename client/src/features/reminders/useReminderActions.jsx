import { useState } from 'react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui';
import { reminderApi } from '@/services';
import { emitChange } from '@/utils/events';
import { getErrorMessage } from '@/utils/errors';
import { ReminderFormModal } from './ReminderFormModal';

/** Reminder actions + modal, shared by the Reminders page and the vehicle tab. */
export function useReminderActions({ vehicles = [], defaultVehicle } = {}) {
  const confirm = useConfirm();
  const [modal, setModal] = useState({ open: false, reminder: null });

  const run = async (fn, message) => {
    try {
      const res = await fn();
      toast.success(res?.message || message);
      emitChange('reminders', 'notifications');
    } catch (e) {
      toast.error(getErrorMessage(e));
      throw e;
    }
  };

  const actions = {
    create: () => setModal({ open: true, reminder: null }),
    edit: (r) => setModal({ open: true, reminder: r }),
    complete: (r) => run(() => reminderApi.complete(r._id)),
    dismiss: (r) => run(() => reminderApi.dismiss(r._id)),
    reactivate: (r) => run(() => reminderApi.reactivate(r._id)),
    remove: (r) =>
      confirm({
        title: 'Delete reminder?',
        message: `“${r.title}” will be removed permanently.`,
        confirmLabel: 'Delete',
        action: () => run(() => reminderApi.remove(r._id), 'Reminder deleted'),
      }),
  };

  const element = (
    <ReminderFormModal
      open={modal.open}
      reminder={modal.reminder}
      vehicles={vehicles}
      defaultVehicle={defaultVehicle}
      onClose={() => setModal({ open: false, reminder: null })}
    />
  );
  return { actions, element };
}

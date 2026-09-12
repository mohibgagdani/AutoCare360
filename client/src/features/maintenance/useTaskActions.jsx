import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui';
import { maintenanceApi } from '@/services';
import { useMeta } from '@/hooks/common';
import { emitChange } from '@/utils/events';
import { getErrorMessage } from '@/utils/errors';
import { CompleteTaskModal, RescheduleModal, SkipModal, TaskFormModal } from './TaskModals';
import { TaskDetailDrawer } from './TaskDetailDrawer';

/**
 * One place for every maintenance action (complete, reschedule, skip, edit,
 * delete, details). Pages spread `actions` into their UI and render `element`.
 */
export function useTaskActions({ vehicles = [], defaultVehicle } = {}) {
  const confirm = useConfirm();
  const { vehicleTypeMap } = useMeta();
  const [modal, setModal] = useState({ type: null, task: null });
  const [detailId, setDetailId] = useState(null);

  const unitFor = useCallback((vehicle) => vehicleTypeMap[vehicle?.vehicleType]?.usageUnit || 'km', [vehicleTypeMap]);
  const close = () => setModal({ type: null, task: null });

  const remove = useCallback(
    async (task, after) => {
      const scheduled = task.isOpen && !task.isCustom;
      const ok = await confirm({
        title: task.isOpen ? `Remove “${task.name}”?` : 'Delete this history entry?',
        message: scheduled
          ? 'This item will be removed from this vehicle’s schedule and won’t be re-added automatically. You can restore it later with “Re-sync schedule”.'
          : 'This cannot be undone.',
        confirmLabel: task.isOpen ? 'Remove item' : 'Delete',
        action: async () => {
          try {
            await maintenanceApi.remove(task._id);
            toast.success('Maintenance item removed');
            emitChange('maintenance', 'vehicles', 'reminders');
          } catch (e) {
            toast.error(getErrorMessage(e));
            throw e;
          }
        },
      });
      if (ok) after?.();
    },
    [confirm]
  );

  const actions = {
    open: (task) => setDetailId(task._id),
    complete: (task) => setModal({ type: 'complete', task }),
    reschedule: (task) => setModal({ type: 'reschedule', task }),
    skip: (task) => setModal({ type: 'skip', task }),
    edit: (task) => setModal({ type: 'edit', task }),
    create: () => setModal({ type: 'create', task: null }),
    remove,
    unitFor,
  };

  const element = (
    <>
      <TaskDetailDrawer taskId={detailId} open={Boolean(detailId)} onClose={() => setDetailId(null)} unitFor={unitFor} actions={actions} />
      <CompleteTaskModal open={modal.type === 'complete'} task={modal.task} unit={unitFor(modal.task?.vehicle)} onClose={close} />
      <RescheduleModal open={modal.type === 'reschedule'} task={modal.task} unit={unitFor(modal.task?.vehicle)} onClose={close} />
      <SkipModal open={modal.type === 'skip'} task={modal.task} onClose={close} />
      <TaskFormModal
        open={modal.type === 'edit' || modal.type === 'create'}
        task={modal.type === 'edit' ? modal.task : null}
        vehicles={vehicles}
        defaultVehicle={defaultVehicle}
        onClose={close}
      />
    </>
  );

  return { actions, element };
}

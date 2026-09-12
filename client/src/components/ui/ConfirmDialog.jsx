import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '@/utils/cn';

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', loading = false }) {
  const Icon = tone === 'danger' ? AlertTriangle : Info;
  return (
    <Modal open={open} onClose={loading ? undefined : onClose} size="sm">
      <div className="flex flex-col items-center pt-2 text-center">
        <span
          className={cn(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-2xl',
            tone === 'danger' ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
          )}
        >
          <Icon size={22} aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {message && <p className="mt-2 text-sm leading-relaxed text-ink-2">{message}</p>}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} data-autofocus>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

const ConfirmContext = createContext(null);

/**
 * Promise-based confirmation:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: 'Delete vehicle?', message: '…', confirmLabel: 'Delete', action: () => api.remove(id) });
 * When `action` is given the dialog stays open with a spinner until it settles.
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false });
  const [loading, setLoading] = useState(false);
  const resolver = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState({ ...options, open: true });
      }),
    []
  );

  const close = (result) => {
    setState((s) => ({ ...s, open: false }));
    resolver.current?.(result);
    resolver.current = null;
  };

  const handleConfirm = async () => {
    if (!state.action) return close(true);
    setLoading(true);
    try {
      await state.action();
      close(true);
    } catch {
      // The action is responsible for surfacing its own error toast.
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={state.open}
        onClose={() => close(false)}
        onConfirm={handleConfirm}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        tone={state.tone || 'danger'}
        loading={loading}
      />
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

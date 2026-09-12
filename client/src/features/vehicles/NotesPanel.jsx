import { useState } from 'react';
import { Pin, PinOff, Trash2, Pencil, StickyNote, Plus, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Input, Textarea, EmptyState, IconButton, useConfirm } from '@/components/ui';
import { vehicleApi } from '@/services';
import { formatRelative } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';

/** Timestamped notes journal for a vehicle (plus the general notes field). */
export function NotesPanel({ vehicle, onChange }) {
  const confirm = useConfirm();
  const [draft, setDraft] = useState({ title: '', body: '' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const notes = [...(vehicle.noteEntries || [])].sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt) - new Date(a.createdAt));

  const save = async () => {
    if (!draft.body.trim()) return;
    setSaving(true);
    try {
      await vehicleApi.addNote(vehicle._id, { title: draft.title.trim() || undefined, body: draft.body.trim() });
      setDraft({ title: '', body: '' });
      toast.success('Note added');
      onChange();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const update = async (note, body) => {
    try {
      await vehicleApi.updateNote(vehicle._id, note._id, body);
      setEditing(null);
      onChange();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const remove = (note) =>
    confirm({
      title: 'Delete note?',
      confirmLabel: 'Delete',
      action: async () => {
        await vehicleApi.deleteNote(vehicle._id, note._id);
        toast.success('Note deleted');
        onChange();
      },
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card className="p-4">
          <Input placeholder="Title (optional)" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="border-0 px-0 text-base font-semibold shadow-none focus:ring-0" aria-label="Note title" />
          <Textarea
            placeholder="Write a note — tyre pressures, preferred workshop, a rattle to check…"
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            rows={3}
            className="mt-1 border-0 px-0 shadow-none focus:ring-0"
            aria-label="Note"
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" leftIcon={Plus} onClick={save} loading={saving} disabled={!draft.body.trim()}>
              Add note
            </Button>
          </div>
        </Card>
        {notes.length ? (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n._id}>
                <Card className={cn('p-4', n.pinned && 'border-amber-300 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5')}>
                  {editing?._id === n._id ? (
                    <div className="space-y-2">
                      <Input value={editing.title || ''} onChange={(e) => setEditing((x) => ({ ...x, title: e.target.value }))} placeholder="Title" aria-label="Note title" />
                      <Textarea value={editing.body} onChange={(e) => setEditing((x) => ({ ...x, body: e.target.value }))} rows={3} aria-label="Note" />
                      <div className="flex justify-end gap-2">
                        <Button size="xs" variant="ghost" leftIcon={X} onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                        <Button size="xs" leftIcon={Check} onClick={() => update(n, { title: editing.title, body: editing.body })}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        {n.title && <p className="font-semibold text-ink">{n.title}</p>}
                        <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{n.body}</p>
                        <p className="mt-2 text-xs text-ink-3">{formatRelative(n.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <IconButton icon={n.pinned ? PinOff : Pin} label={n.pinned ? 'Unpin' : 'Pin'} onClick={() => update(n, { pinned: !n.pinned })} />
                        <IconButton icon={Pencil} label="Edit note" onClick={() => setEditing({ ...n })} />
                        <IconButton icon={Trash2} label="Delete note" onClick={() => remove(n)} />
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card>
            <EmptyState compact icon={StickyNote} title="No notes yet" description="Keep track of observations and reminders that don’t fit elsewhere." />
          </Card>
        )}
      </div>
      <Card className="h-fit p-5">
        <h3 className="text-sm font-semibold text-ink">About this vehicle</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{vehicle.notes || 'No general notes. Add some from “Edit vehicle”.'}</p>
      </Card>
    </div>
  );
}

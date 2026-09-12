import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Button, Field, Input, Select, Textarea, DatePicker, FileDropzone, OptionCards } from '@/components/ui';
import { documentApi } from '@/services';
import { documentSchema, toPayload } from '@/validations';
import { applyServerErrors, getErrorMessage } from '@/utils/errors';
import { emitChange } from '@/utils/events';
import { DOCUMENT_TYPES } from '@/utils/constants';
import { toInputDate, formatFileSize } from '@/utils/format';
import { fileUrl } from '@/utils/files';
import { vehicleName } from '@/utils/vehicle';

const TIMINGS = [
  { value: '7', label: '7 days' },
  { value: '15', label: '15 days' },
  { value: '30', label: '30 days' },
  { value: 'custom', label: 'Custom' },
];

const NAME_SUGGESTION = {
  registration_certificate: 'Registration Certificate',
  insurance: 'Insurance Policy',
  pollution_certificate: 'PUC Certificate',
  warranty: 'Warranty',
  driving_license: 'Driving Licence',
  fitness_certificate: 'Fitness Certificate',
  permit: 'Permit',
  service_invoice: 'Service Invoice',
  purchase_document: 'Purchase Invoice',
};

export function DocumentFormModal({ open, onClose, document: doc, vehicles = [], defaultVehicle }) {
  const editing = Boolean(doc);
  const [file, setFile] = useState([]);
  const [fileError, setFileError] = useState('');
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(documentSchema) });

  useEffect(() => {
    if (!open) return;
    setFile([]);
    setFileError('');
    const days = doc?.reminderDaysBefore ?? 30;
    const preset = [7, 15, 30].includes(days);
    reset({
      name: doc?.name || '',
      type: doc?.type || 'insurance',
      vehicle: doc?.vehicle?._id || doc?.vehicle || defaultVehicle || '',
      documentNumber: doc?.documentNumber || '',
      issuer: doc?.issuer || '',
      issueDate: toInputDate(doc?.issueDate),
      expiryDate: toInputDate(doc?.expiryDate),
      timing: preset ? String(days) : 'custom',
      customDays: preset ? '' : days,
      notes: doc?.notes || '',
    });
  }, [open, doc, defaultVehicle, reset]);

  const [type, timing, expiryDate] = watch(['type', 'timing', 'expiryDate']);

  // Suggest a name from the type until the user types their own.
  useEffect(() => {
    if (editing) return;
    const current = getValues('name');
    if (!current || Object.values(NAME_SUGGESTION).includes(current)) setValue('name', NAME_SUGGESTION[type] || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const onSubmit = async (form) => {
    if (!editing && !file.length) {
      setFileError('Please attach the document file');
      return;
    }
    try {
      const { timing: t, customDays, ...rest } = form;
      const payload = toPayload(
        { ...rest, reminderDaysBefore: t === 'custom' ? Number(customDays || 30) : Number(t) },
        { nullable: ['vehicle', 'issueDate', 'expiryDate'] }
      );
      const res = editing ? await documentApi.update(doc._id, payload, file[0]) : await documentApi.create(payload, file[0]);
      toast.success(res.message);
      emitChange('documents', 'reminders', 'vehicles');
      onClose(res.data);
    } catch (error) {
      applyServerErrors(error, setError);
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      size="lg"
      icon={FileText}
      title={editing ? 'Edit document' : 'Upload document'}
      description="Documents with an expiry date get an automatic renewal reminder."
      footer={
        <>
          <Button variant="secondary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editing ? 'Save changes' : 'Upload document'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Document type" htmlFor="dc-type" required error={errors.type?.message}>
            <Select id="dc-type" {...register('type')}>
              {Object.entries(DOCUMENT_TYPES).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vehicle" htmlFor="dc-vehicle" hint={type === 'driving_license' ? 'Licences are personal documents' : undefined}>
            <Select id="dc-vehicle" placeholder="Personal (no vehicle)" {...register('vehicle')}>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {vehicleName(v)} · {v.registrationNumber}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Document name" htmlFor="dc-name" required error={errors.name?.message} className="sm:col-span-2">
            <Input id="dc-name" invalid={!!errors.name} {...register('name')} />
          </Field>
          <Field label="Document / policy number" htmlFor="dc-number">
            <Input id="dc-number" {...register('documentNumber')} />
          </Field>
          <Field label="Issued by" htmlFor="dc-issuer">
            <Input id="dc-issuer" placeholder="Insurer, RTO, dealer…" {...register('issuer')} />
          </Field>
          <Field label="Issue date" htmlFor="dc-issue">
            <DatePicker id="dc-issue" {...register('issueDate')} />
          </Field>
          <Field label="Expiry date" htmlFor="dc-expiry" error={errors.expiryDate?.message} hint="Leave empty if it never expires">
            <DatePicker id="dc-expiry" invalid={!!errors.expiryDate} {...register('expiryDate')} />
          </Field>
        </div>
        {expiryDate && (
          <>
            <Field label="Remind me before expiry">
              <Controller control={control} name="timing" render={({ field }) => <OptionCards columns={4} options={TIMINGS} value={field.value} onChange={field.onChange} />} />
            </Field>
            {timing === 'custom' && (
              <Field label="Days before expiry" htmlFor="dc-days" error={errors.customDays?.message}>
                <Input id="dc-days" type="number" inputMode="numeric" suffix="days" {...register('customDays')} />
              </Field>
            )}
          </>
        )}
        <Field label={editing ? 'Replace file (optional)' : 'File'} required={!editing}>
          {editing && doc.file && !file.length && (
            <a href={fileUrl(doc.file.url)} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-surface-2">
              <FileText size={16} className="text-ink-3" />
              <span className="flex-1 truncate text-ink">{doc.file.originalName || 'Current file'}</span>
              <span className="text-xs text-ink-3">{formatFileSize(doc.file.size)}</span>
              <ExternalLink size={14} className="text-ink-3" />
            </a>
          )}
          <FileDropzone
            kind="document"
            files={file}
            onChange={(f) => {
              setFile(f);
              setFileError('');
            }}
            error={fileError}
            compact={editing}
          />
        </Field>
        <Field label="Notes" htmlFor="dc-notes">
          <Textarea id="dc-notes" rows={2} {...register('notes')} />
        </Field>
      </form>
    </Modal>
  );
}

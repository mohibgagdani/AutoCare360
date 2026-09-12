import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FileText, ImagePlus, UploadCloud, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatFileSize } from '@/utils/format';

const ACCEPTS = {
  image: { mime: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], label: 'JPG, PNG or WEBP', attr: 'image/jpeg,image/png,image/webp,image/gif' },
  document: { mime: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], label: 'PDF, JPG or PNG', attr: 'application/pdf,image/jpeg,image/png,image/webp' },
};

function Preview({ file, onRemove }) {
  const url = useMemo(() => (file.type?.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2 pr-3">
      {url ? (
        <img src={url} alt="" className="h-10 w-10 rounded-lg object-cover" />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">
          <FileText size={18} aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{file.name}</p>
        <p className="text-xs text-ink-3">{formatFileSize(file.size)}</p>
      </div>
      <button type="button" onClick={onRemove} className="rounded-md p-1 text-ink-3 hover:bg-surface-3 hover:text-ink" aria-label={`Remove ${file.name}`}>
        <X size={16} />
      </button>
    </li>
  );
}

/**
 * Drag & drop file picker with client-side type/size validation.
 * Controlled: `files` array + `onChange(files)`.
 */
export function FileDropzone({ files = [], onChange, kind = 'document', multiple = false, maxFiles = 8, maxSizeMb = 10, hint, error: externalError, compact = false, className }) {
  const inputRef = useRef(null);
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const accept = ACCEPTS[kind] || ACCEPTS.document;

  const addFiles = (list) => {
    setError('');
    const incoming = [...list];
    const valid = [];
    for (const f of incoming) {
      if (!accept.mime.includes(f.type)) {
        setError(`"${f.name}" isn't supported. Use ${accept.label}.`);
        continue;
      }
      if (f.size > maxSizeMb * 1024 * 1024) {
        setError(`"${f.name}" is larger than ${maxSizeMb} MB.`);
        continue;
      }
      valid.push(f);
    }
    if (!valid.length) return;
    onChange(multiple ? [...files, ...valid].slice(0, maxFiles) : [valid[0]]);
  };

  const Icon = kind === 'image' ? ImagePlus : UploadCloud;
  const shownError = externalError || error;

  return (
    <div className={className}>
      {(multiple || !files.length) && (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition',
            compact ? 'gap-1 px-4 py-4' : 'gap-2 px-6 py-7',
            dragging ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : 'border-line-strong hover:border-brand-400 hover:bg-surface-2',
            shownError && 'border-red-300 dark:border-red-500/50'
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Icon size={20} aria-hidden />
          </span>
          <span className="text-sm font-medium text-ink">
            <span className="text-brand-600 dark:text-brand-400">Click to upload</span> or drag and drop
          </span>
          <span className="text-xs text-ink-3">{hint || `${accept.label} · up to ${maxSizeMb} MB${multiple ? ` · max ${maxFiles} files` : ''}`}</span>
          <input
            ref={inputRef}
            id={id}
            type="file"
            className="sr-only"
            accept={accept.attr}
            multiple={multiple}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      )}
      {shownError && <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400" role="alert">{shownError}</p>}
      {files.length > 0 && (
        <ul className={cn('space-y-2', (multiple || !files.length) && 'mt-3')}>
          {files.map((f, i) => (
            <Preview key={`${f.name}-${i}`} file={f} onRemove={() => onChange(files.filter((_, idx) => idx !== i))} />
          ))}
        </ul>
      )}
    </div>
  );
}

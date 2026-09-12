const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');

/** Resolves stored file URLs: absolute (Cloudinary) or relative local uploads. */
export function fileUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const isImage = (file) => (file?.mimeType || file?.type || '').startsWith('image/');
export const isPdf = (file) => (file?.mimeType || file?.type || '') === 'application/pdf';

/** Triggers a browser download for a Blob. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Reads the filename from a Content-Disposition header. */
export function filenameFromDisposition(header, fallback) {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header || '');
  return match ? decodeURIComponent(match[1]) : fallback;
}

/** Builds multipart form data with a JSON `data` field + files. */
export function toFormData(data, files = {}) {
  const form = new FormData();
  form.append('data', JSON.stringify(data));
  for (const [field, value] of Object.entries(files)) {
    if (!value) continue;
    const list = Array.isArray(value) ? value : [value];
    list.forEach((file) => file && form.append(field, file));
  }
  return form;
}

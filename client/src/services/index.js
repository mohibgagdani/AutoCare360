/**
 * Domain API modules. Every function resolves to the response envelope
 * `{ success, data, meta?, message? }`.
 */
import { api, unwrap } from './api';
import { toFormData, saveBlob, filenameFromDisposition } from '@/utils/files';

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const get = (url, params, config = {}) => unwrap(api.get(url, { params: clean(params), ...config }));

// ─── Auth & profile ──────────────────────────────────────────────────────────
export const authApi = {
  login: (body) => unwrap(api.post('/auth/login', body)),
  register: (body) => unwrap(api.post('/auth/register', body)),
  logout: () => unwrap(api.post('/auth/logout')),
  me: () => unwrap(api.get('/auth/me')),
  forgotPassword: (body) => unwrap(api.post('/auth/forgot-password', body)),
  resetPassword: (token, body) => unwrap(api.post(`/auth/reset-password/${token}`, body)),
};

export const profileApi = {
  update: (body) => unwrap(api.patch('/users/me', body)),
  changePassword: (body) => unwrap(api.patch('/users/me/password', body)),
  preferences: (body) => unwrap(api.patch('/users/me/preferences', body)),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return unwrap(api.post('/users/me/avatar', form));
  },
  removeAvatar: () => unwrap(api.delete('/users/me/avatar')),
};

export const metaApi = {
  get: () => get('/meta'),
  preview: (body) => unwrap(api.post('/maintenance/preview', body)),
};

// ─── Vehicles ────────────────────────────────────────────────────────────────
export const vehicleApi = {
  list: (params, config) => get('/vehicles', params, config),
  get: (id, config) => get(`/vehicles/${id}`, undefined, config),
  overview: (id, config) => get(`/vehicles/${id}/overview`, undefined, config),
  create: (data, image) => unwrap(api.post('/vehicles', toFormData(data, { image }))),
  update: (id, data, image) => unwrap(api.patch(`/vehicles/${id}`, toFormData(data, { image }))),
  remove: (id) => unwrap(api.delete(`/vehicles/${id}`)),
  updateOdometer: (id, body) => unwrap(api.patch(`/vehicles/${id}/odometer`, body)),
  uploadImage: (id, file) => {
    const form = new FormData();
    form.append('image', file);
    return unwrap(api.post(`/vehicles/${id}/image`, form));
  },
  removeImage: (id) => unwrap(api.delete(`/vehicles/${id}/image`)),
  syncSchedule: (id, body) => unwrap(api.post(`/vehicles/${id}/sync-schedule`, body || {})),
  addNote: (id, body) => unwrap(api.post(`/vehicles/${id}/notes`, body)),
  updateNote: (id, noteId, body) => unwrap(api.patch(`/vehicles/${id}/notes/${noteId}`, body)),
  deleteNote: (id, noteId) => unwrap(api.delete(`/vehicles/${id}/notes/${noteId}`)),
};

// ─── Maintenance ─────────────────────────────────────────────────────────────
export const maintenanceApi = {
  list: (params, config) => get('/maintenance', params, config),
  summary: (params, config) => get('/maintenance/summary', params, config),
  get: (id, config) => get(`/maintenance/${id}`, undefined, config),
  create: (body) => unwrap(api.post('/maintenance', body)),
  update: (id, body) => unwrap(api.patch(`/maintenance/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/maintenance/${id}`)),
  complete: (id, body) => unwrap(api.post(`/maintenance/${id}/complete`, body)),
  reschedule: (id, body) => unwrap(api.post(`/maintenance/${id}/reschedule`, body)),
  skip: (id, body) => unwrap(api.post(`/maintenance/${id}/skip`, body)),
};

// ─── Service records ─────────────────────────────────────────────────────────
export const serviceRecordApi = {
  list: (params, config) => get('/service-records', params, config),
  get: (id, config) => get(`/service-records/${id}`, undefined, config),
  create: (data, { invoice, photos } = {}) => unwrap(api.post('/service-records', toFormData(data, { invoice, photos }))),
  update: (id, data, { invoice, photos } = {}) =>
    unwrap(api.patch(`/service-records/${id}`, toFormData(data, { invoice, photos }))),
  remove: (id) => unwrap(api.delete(`/service-records/${id}`)),
  removePhoto: (id, photoId) => unwrap(api.delete(`/service-records/${id}/photos/${photoId}`)),
};

// ─── Expenses ────────────────────────────────────────────────────────────────
export const expenseApi = {
  list: (params, config) => get('/expenses', params, config),
  summary: (params, config) => get('/expenses/summary', params, config),
  create: (data, receipt) => unwrap(api.post('/expenses', toFormData(data, { receipt }))),
  update: (id, data, receipt) => unwrap(api.patch(`/expenses/${id}`, toFormData(data, { receipt }))),
  remove: (id) => unwrap(api.delete(`/expenses/${id}`)),
};

// ─── Reminders ───────────────────────────────────────────────────────────────
export const reminderApi = {
  list: (params, config) => get('/reminders', params, config),
  create: (body) => unwrap(api.post('/reminders', body)),
  update: (id, body) => unwrap(api.patch(`/reminders/${id}`, body)),
  complete: (id) => unwrap(api.post(`/reminders/${id}/complete`)),
  dismiss: (id) => unwrap(api.post(`/reminders/${id}/dismiss`)),
  reactivate: (id) => unwrap(api.post(`/reminders/${id}/reactivate`)),
  remove: (id) => unwrap(api.delete(`/reminders/${id}`)),
};

// ─── Documents ───────────────────────────────────────────────────────────────
export const documentApi = {
  list: (params, config) => get('/documents', params, config),
  get: (id, config) => get(`/documents/${id}`, undefined, config),
  create: (data, file) => unwrap(api.post('/documents', toFormData(data, { file }))),
  update: (id, data, file) => unwrap(api.patch(`/documents/${id}`, toFormData(data, { file }))),
  remove: (id) => unwrap(api.delete(`/documents/${id}`)),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationApi = {
  list: (params, config) => get('/notifications', params, config),
  unreadCount: () => get('/notifications/unread-count'),
  markRead: (id) => unwrap(api.patch(`/notifications/${id}/read`)),
  markAllRead: () => unwrap(api.patch('/notifications/read-all')),
  remove: (id) => unwrap(api.delete(`/notifications/${id}`)),
  clearRead: () => unwrap(api.delete('/notifications')),
};

// ─── Insights ────────────────────────────────────────────────────────────────
export const dashboardApi = { get: (config) => get('/dashboard', undefined, config) };
export const searchApi = { search: (q, config) => get('/search', { q }, config) };

/** Downloads a CSV/PDF export as a file. */
async function download(url, params, fallbackName) {
  const res = await api.get(url, { params: clean(params), responseType: 'blob', timeout: 60000 });
  saveBlob(res.data, filenameFromDisposition(res.headers['content-disposition'], fallbackName));
}
export const exportApi = {
  serviceRecords: (params, format = 'csv') => download('/exports/service-records', { ...params, format }, `service-history.${format}`),
  expenses: (params, format = 'csv') => download('/exports/expenses', { ...params, format }, `expenses.${format}`),
  maintenance: (params, format = 'csv') => download('/exports/maintenance', { ...params, format }, `maintenance.${format}`),
  vehicleReport: (id) => download(`/exports/vehicles/${id}/report`, {}, 'vehicle-report.pdf'),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
const crud = (base) => ({
  list: (params, config) => get(`/admin/${base}`, params, config),
  get: (id, config) => get(`/admin/${base}/${id}`, undefined, config),
  create: (body) => unwrap(api.post(`/admin/${base}`, body)),
  update: (id, body) => unwrap(api.patch(`/admin/${base}/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/admin/${base}/${id}`)),
});

export const adminApi = {
  analytics: (config) => get('/admin/analytics', undefined, config),
  users: { ...crud('users'), setStatus: (id, body) => unwrap(api.patch(`/admin/users/${id}/status`, body)) },
  vehicles: (params, config) => get('/admin/vehicles', params, config),
  maintenance: (params, config) => get('/admin/maintenance', params, config),
  serviceRecords: (params, config) => get('/admin/service-records', params, config),
  categories: crud('categories'),
  templates: {
    ...crud('templates'),
    duplicate: (id) => unwrap(api.post(`/admin/templates/${id}/duplicate`)),
    apply: (id) => unwrap(api.post(`/admin/templates/${id}/apply`)),
  },
  vehicleTypes: crud('vehicle-types'),
  fuelTypes: crud('fuel-types'),
};

import { Router } from 'express';
import { z } from 'zod';
import * as services from '../controllers/serviceRecordController.js';
import * as expenses from '../controllers/expenseController.js';
import * as reminders from '../controllers/reminderController.js';
import * as documents from '../controllers/documentController.js';
import * as notifications from '../controllers/notificationController.js';
import { validate } from '../middleware/validate.js';
import { documentUpload } from '../middleware/upload.js';
import { idParams, objectId } from '../validators/common.js';
import {
  createServiceRecordSchema,
  updateServiceRecordSchema,
  createExpenseSchema,
  updateExpenseSchema,
  createReminderSchema,
  updateReminderSchema,
  createDocumentSchema,
  updateDocumentSchema,
} from '../validators/recordValidators.js';

const serviceFiles = documentUpload.fields([
  { name: 'invoice', maxCount: 1 },
  { name: 'photos', maxCount: 8 },
]);

// ─── Service records ─────────────────────────────────────────────────────────
export const serviceRecordRouter = Router();
serviceRecordRouter
  .route('/')
  .get(services.listServiceRecords)
  .post(serviceFiles, validate({ body: createServiceRecordSchema }), services.createServiceRecordHandler);
serviceRecordRouter
  .route('/:id')
  .get(validate({ params: idParams }), services.getServiceRecord)
  .patch(serviceFiles, validate({ params: idParams, body: updateServiceRecordSchema }), services.updateServiceRecordHandler)
  .delete(validate({ params: idParams }), services.deleteServiceRecordHandler);
serviceRecordRouter.delete(
  '/:id/photos/:photoId',
  validate({ params: z.object({ id: objectId, photoId: objectId }) }),
  services.deletePhoto
);

// ─── Expenses ────────────────────────────────────────────────────────────────
export const expenseRouter = Router();
expenseRouter.get('/summary', expenses.expenseSummary);
expenseRouter
  .route('/')
  .get(expenses.listExpenses)
  .post(documentUpload.single('receipt'), validate({ body: createExpenseSchema }), expenses.createExpense);
expenseRouter
  .route('/:id')
  .patch(documentUpload.single('receipt'), validate({ params: idParams, body: updateExpenseSchema }), expenses.updateExpense)
  .delete(validate({ params: idParams }), expenses.deleteExpense);

// ─── Reminders ───────────────────────────────────────────────────────────────
export const reminderRouter = Router();
reminderRouter.route('/').get(reminders.listReminders).post(validate({ body: createReminderSchema }), reminders.createReminder);
reminderRouter
  .route('/:id')
  .patch(validate({ params: idParams, body: updateReminderSchema }), reminders.updateReminder)
  .delete(validate({ params: idParams }), reminders.deleteReminder);
reminderRouter.post('/:id/complete', validate({ params: idParams }), reminders.completeReminderHandler);
reminderRouter.post('/:id/dismiss', validate({ params: idParams }), reminders.dismissReminder);
reminderRouter.post('/:id/reactivate', validate({ params: idParams }), reminders.reactivateReminder);

// ─── Documents ───────────────────────────────────────────────────────────────
export const documentRouter = Router();
documentRouter
  .route('/')
  .get(documents.listDocuments)
  .post(documentUpload.single('file'), validate({ body: createDocumentSchema }), documents.createDocument);
documentRouter
  .route('/:id')
  .get(validate({ params: idParams }), documents.getDocument)
  .patch(documentUpload.single('file'), validate({ params: idParams, body: updateDocumentSchema }), documents.updateDocument)
  .delete(validate({ params: idParams }), documents.deleteDocument);

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationRouter = Router();
notificationRouter.route('/').get(notifications.listNotifications).delete(notifications.clearRead);
notificationRouter.get('/unread-count', notifications.unreadCount);
notificationRouter.patch('/read-all', notifications.markAllRead);
notificationRouter.patch('/:id/read', validate({ params: idParams }), notifications.markRead);
notificationRouter.delete('/:id', validate({ params: idParams }), notifications.deleteNotification);

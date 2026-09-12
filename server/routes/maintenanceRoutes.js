import { Router } from 'express';
import * as maintenance from '../controllers/maintenanceController.js';
import { previewMaintenance } from '../controllers/metaController.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { previewSchema } from '../validators/vehicleValidators.js';
import {
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
  rescheduleTaskSchema,
  skipTaskSchema,
} from '../validators/maintenanceValidators.js';

const router = Router();

router.get('/summary', maintenance.getSummary);
router.post('/preview', validate({ body: previewSchema }), previewMaintenance);
router.route('/').get(maintenance.listTasks).post(validate({ body: createTaskSchema }), maintenance.createTask);
router
  .route('/:id')
  .get(validate({ params: idParams }), maintenance.getTask)
  .patch(validate({ params: idParams, body: updateTaskSchema }), maintenance.updateTask)
  .delete(validate({ params: idParams }), maintenance.deleteTask);
router.post('/:id/complete', validate({ params: idParams, body: completeTaskSchema }), maintenance.completeTask);
router.post('/:id/reschedule', validate({ params: idParams, body: rescheduleTaskSchema }), maintenance.rescheduleTask);
router.post('/:id/skip', validate({ params: idParams, body: skipTaskSchema }), maintenance.skipTask);

export default router;

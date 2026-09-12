import { Router } from 'express';
import * as vehicles from '../controllers/vehicleController.js';
import { vehicleReport } from '../controllers/insightsController.js';
import { validate } from '../middleware/validate.js';
import { imageUpload } from '../middleware/upload.js';
import { idParams, objectId } from '../validators/common.js';
import { createVehicleSchema, updateVehicleSchema, odometerSchema, noteSchema } from '../validators/vehicleValidators.js';
import { z } from 'zod';

const router = Router();
const noteParams = z.object({ id: objectId, noteId: objectId });

router
  .route('/')
  .get(vehicles.listVehicles)
  .post(imageUpload.single('image'), validate({ body: createVehicleSchema }), vehicles.createVehicle);

router
  .route('/:id')
  .get(validate({ params: idParams }), vehicles.getVehicle)
  .patch(imageUpload.single('image'), validate({ params: idParams, body: updateVehicleSchema }), vehicles.updateVehicle)
  .delete(validate({ params: idParams }), vehicles.deleteVehicle);

router.get('/:id/overview', validate({ params: idParams }), vehicles.getVehicleOverviewHandler);
router.get('/:id/report', validate({ params: idParams }), vehicleReport);
router.patch('/:id/odometer', validate({ params: idParams, body: odometerSchema }), vehicles.updateOdometer);
router.post('/:id/sync-schedule', validate({ params: idParams }), vehicles.resyncSchedule);
router
  .route('/:id/image')
  .post(validate({ params: idParams }), imageUpload.single('image'), vehicles.uploadVehicleImage)
  .delete(validate({ params: idParams }), vehicles.removeVehicleImage);

router.post('/:id/notes', validate({ params: idParams, body: noteSchema }), vehicles.addNote);
router
  .route('/:id/notes/:noteId')
  .patch(validate({ params: noteParams, body: noteSchema.partial() }), vehicles.updateNote)
  .delete(validate({ params: noteParams }), vehicles.deleteNote);

export default router;

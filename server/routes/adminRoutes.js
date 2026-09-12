import { Router } from 'express';
import * as admin from '../controllers/adminController.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  userStatusSchema,
  categorySchema,
  createTemplateSchema,
  updateTemplateSchema,
  vehicleTypeSchema,
  fuelTypeSchema,
} from '../validators/adminValidators.js';

const router = Router();

router.get('/analytics', admin.analytics);

// Users
router.route('/users').get(admin.listUsers).post(validate({ body: adminCreateUserSchema }), admin.createUser);
router
  .route('/users/:id')
  .get(validate({ params: idParams }), admin.getUser)
  .patch(validate({ params: idParams, body: adminUpdateUserSchema }), admin.updateUser)
  .delete(validate({ params: idParams }), admin.deleteUser);
router.patch('/users/:id/status', validate({ params: idParams, body: userStatusSchema }), admin.setUserStatus);

// Platform data
router.get('/vehicles', admin.listAllVehicles);
router.get('/maintenance', admin.listAllTasks);
router.get('/service-records', admin.listAllServiceRecords);

// Catalog CRUD
const mountCatalog = (path, handlers, createSchema, updateSchema = createSchema.partial ? createSchema.partial() : createSchema) => {
  router.route(`/${path}`).get(handlers.list).post(validate({ body: createSchema }), handlers.create);
  router
    .route(`/${path}/:id`)
    .get(validate({ params: idParams }), handlers.get)
    .patch(validate({ params: idParams, body: updateSchema }), handlers.update)
    .delete(validate({ params: idParams }), handlers.remove);
};

mountCatalog('categories', admin.categories, categorySchema);
mountCatalog('templates', admin.templates, createTemplateSchema, updateTemplateSchema);
mountCatalog('vehicle-types', admin.vehicleTypes, vehicleTypeSchema);
mountCatalog('fuel-types', admin.fuelTypes, fuelTypeSchema);

router.post('/templates/:id/duplicate', validate({ params: idParams }), admin.duplicateTemplate);
router.post('/templates/:id/apply', validate({ params: idParams }), admin.applyTemplate);

export default router;

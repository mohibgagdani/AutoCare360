import { Router } from 'express';
import * as users from '../controllers/userController.js';
import { validate } from '../middleware/validate.js';
import { imageUpload } from '../middleware/upload.js';
import { updateProfileSchema, changePasswordSchema, preferencesSchema } from '../validators/authValidators.js';

const router = Router();

router.patch('/me', validate({ body: updateProfileSchema }), users.updateProfile);
router.patch('/me/password', validate({ body: changePasswordSchema }), users.changePassword);
router.patch('/me/preferences', validate({ body: preferencesSchema }), users.updatePreferences);
router.post('/me/avatar', imageUpload.single('avatar'), users.uploadAvatar);
router.delete('/me/avatar', users.removeAvatar);

export default router;

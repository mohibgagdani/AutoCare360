import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, passwordResetLimiter } from '../middleware/security.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetTokenParams,
} from '../validators/authValidators.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), auth.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', protect, auth.me);
router.post('/forgot-password', passwordResetLimiter, validate({ body: forgotPasswordSchema }), auth.forgotPassword);
router.post(
  '/reset-password/:token',
  passwordResetLimiter,
  validate({ params: resetTokenParams, body: resetPasswordSchema }),
  auth.resetPassword
);

export default router;

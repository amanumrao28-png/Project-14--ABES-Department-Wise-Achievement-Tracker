import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { loginRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordQuerySchema,
  resetPasswordSchema
} from './auth.validators.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/login', loginRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.post('/forgot-password', passwordResetRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.get('/reset-password/verify', validate(resetPasswordQuerySchema, 'query'), authController.verifyResetToken);
router.post('/reset-password', passwordResetRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

export default router;

import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { registerSchema, loginSchema } from './auth.validation.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// CSRF token generation/retrieval
router.get('/csrf-token', authController.getCsrfToken);

// Public authentication routes (rate limited)
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Session lifecycle routes
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;


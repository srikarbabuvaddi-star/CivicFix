import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { ROLES } from '../../config/constants.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import * as userService from './user.service.js';

const router = Router();

// Endpoint demonstrating role-based access for staff & admins
router.get('/staff-portal', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), (req, res) => {
  return sendSuccess(res, { message: 'Access granted to staff portal', role: req.user.role });
});

// Endpoint demonstrating role-based access exclusively for administrators
router.get('/admin-portal', authenticate, authorize(ROLES.ADMIN), (req, res) => {
  return sendSuccess(res, { message: 'Access granted to administrator portal', role: req.user.role });
});

// Notification preferences
router.get('/preferences', authenticate, async (req, res, next) => {
  try {
    const prefs = await userService.getUserPreferences(req.user.id);
    return sendSuccess(res, prefs, 'Notification preferences retrieved', 200);
  } catch (err) {
    next(err);
  }
});

router.patch('/preferences', authenticate, async (req, res, next) => {
  try {
    const updated = await userService.updateUserPreferences(req.user.id, req.body);
    return sendSuccess(res, updated, 'Notification preferences updated', 200);
  } catch (err) {
    next(err);
  }
});

export default router;


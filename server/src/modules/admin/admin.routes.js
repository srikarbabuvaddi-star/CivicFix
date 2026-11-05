import { Router } from 'express';
import * as adminController from './admin.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  assignStaffDepartmentSchema,
  updateStaffStatusSchema,
  queryStaffSchema
} from './admin.validation.js';
import { ROLES } from '../../config/constants.js';

const router = Router();

// All admin routes require authentication and ADMIN role authorization
router.use(authenticate, authorize(ROLES.ADMIN));

router.get(
  '/staff',
  validate(queryStaffSchema, 'query'),
  adminController.getStaffDirectory
);

router.patch(
  '/staff/:id/department',
  validate(assignStaffDepartmentSchema),
  adminController.assignStaffDepartment
);

router.patch(
  '/staff/:id/status',
  validate(updateStaffStatusSchema),
  adminController.updateStaffStatus
);

export default router;

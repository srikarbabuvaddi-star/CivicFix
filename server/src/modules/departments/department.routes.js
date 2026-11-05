import { Router } from 'express';
import * as departmentController from './department.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  queryDepartmentsSchema
} from './department.validation.js';
import { ROLES } from '../../config/constants.js';

const router = Router();

// Department routes are for authenticated users (Staff, Admin, Citizen)
router.use(authenticate);

// Public/Staff/Citizen department listing and suggestion
router.get('/', validate(queryDepartmentsSchema, 'query'), departmentController.getDepartments);
router.get('/suggest/:category', departmentController.suggestDepartment);
router.get('/:id', departmentController.getDepartmentById);

// Admin-only operations
router.post(
  '/',
  authorize(ROLES.ADMIN),
  validate(createDepartmentSchema),
  departmentController.createDepartment
);

router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(updateDepartmentSchema),
  departmentController.updateDepartment
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  departmentController.deleteDepartment
);

export default router;

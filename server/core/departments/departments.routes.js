import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireSuperAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema
} from './departments.validators.js';
import * as departmentsController from './departments.controller.js';

const router = Router();

router.get('/', authenticate, departmentsController.listDepartments);
router.get('/:id', authenticate, departmentsController.getDepartmentById);
router.post(
  '/',
  authenticate,
  requireSuperAdmin(),
  validate(createDepartmentSchema),
  departmentsController.createDepartment
);
router.patch(
  '/:id',
  authenticate,
  requireSuperAdmin(),
  validate(updateDepartmentSchema),
  departmentsController.updateDepartment
);

export default router;

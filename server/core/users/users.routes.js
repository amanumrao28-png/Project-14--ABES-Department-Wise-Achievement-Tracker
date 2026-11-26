import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  requireHODOrAbove,
  requireDeptUserManagerOrSuperAdmin
} from '../middleware/authorize.js';
import { injectDepartmentScope } from '../middleware/departmentScope.js';
import { validate } from '../middleware/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  resetAccessSchema
} from './users.validators.js';
import * as usersController from './users.controller.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireHODOrAbove(),
  injectDepartmentScope,
  validate(listUsersQuerySchema, 'query'),
  usersController.listUsers
);
router.get('/:id', authenticate, requireHODOrAbove(), usersController.getUserById);
router.post(
  '/',
  authenticate,
  requireDeptUserManagerOrSuperAdmin(),
  validate(createUserSchema),
  usersController.createUser
);
router.patch(
  '/:id',
  authenticate,
  requireDeptUserManagerOrSuperAdmin(),
  validate(updateUserSchema),
  usersController.updateUser
);
router.delete(
  '/:id',
  authenticate,
  requireDeptUserManagerOrSuperAdmin(),
  usersController.deactivateUser
);
router.post(
  '/:id/reset-access',
  authenticate,
  requireDeptUserManagerOrSuperAdmin(),
  validate(resetAccessSchema),
  usersController.resetUserAccess
);

export default router;

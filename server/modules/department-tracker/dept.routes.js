import { Router } from 'express';
import { authenticate } from '../../core/middleware/authenticate.js';
import { requireHODOrAbove, requireSuperAdmin } from '../../core/middleware/authorize.js';
import { injectDepartmentScope } from '../../core/middleware/departmentScope.js';
import {
  requireOwnership,
  requireSelfApprovalBlock
} from '../../core/middleware/ownershipGuard.js';
import { uploadRateLimiter } from '../../core/middleware/rateLimiter.js';
import { validate } from '../../core/middleware/validate.js';
import { evidenceUploadMiddleware } from '../../core/storage/privateStorage.js';
import {
  createDeptAchievementSchema,
  deptAnalyticsQuerySchema,
  listDeptAchievementsQuerySchema,
  reviewDeptAchievementSchema,
  updateDeptAchievementSchema
} from './dept.validators.js';
import * as deptController from './dept.controller.js';

const router = Router();

// Strictly HOD & Super Admin only — Faculty and Students receive 403
router.use(authenticate, requireHODOrAbove());

router.get('/categories', deptController.listDepartmentCategories);
router.get(
  '/analytics',
  injectDepartmentScope,
  validate(deptAnalyticsQuerySchema, 'query'),
  deptController.getDepartmentAnalytics
);
router.get(
  '/',
  injectDepartmentScope,
  validate(listDeptAchievementsQuerySchema, 'query'),
  deptController.listDepartmentAchievements
);
router.get('/:id', deptController.getDepartmentAchievementById);
router.post('/', validate(createDeptAchievementSchema), deptController.createDepartmentAchievement);
router.patch(
  '/:id',
  requireOwnership('dept_achievements', 'created_by_user_id'),
  validate(updateDeptAchievementSchema),
  deptController.updateDepartmentAchievement
);
router.delete(
  '/:id',
  requireOwnership('dept_achievements', 'created_by_user_id'),
  deptController.deleteDepartmentAchievement
);
router.post(
  '/:id/submit',
  requireOwnership('dept_achievements', 'created_by_user_id'),
  deptController.submitDepartmentAchievement
);
router.post(
  '/:id/review',
  requireSuperAdmin(),
  requireOwnership('dept_achievements', 'created_by_user_id'),
  requireSelfApprovalBlock({ ownerColumn: 'created_by_user_id' }),
  validate(reviewDeptAchievementSchema),
  deptController.reviewDepartmentAchievement
);

// Evidence upload & download
router.post(
  '/:id/documents',
  uploadRateLimiter,
  requireOwnership('dept_achievements', 'created_by_user_id'),
  evidenceUploadMiddleware,
  deptController.uploadDepartmentEvidence
);
router.get('/:id/documents/:docId/download', deptController.downloadDepartmentEvidence);
router.delete(
  '/:id/documents/:docId',
  requireOwnership('dept_achievements', 'created_by_user_id'),
  deptController.deleteDepartmentEvidence
);

export default router;

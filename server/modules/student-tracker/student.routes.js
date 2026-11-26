import { Router } from 'express';
import { ROLES } from '../../config/env.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import {
  requireAuthenticated,
  requireHODOrAbove,
  requireRole
} from '../../core/middleware/authorize.js';
import { injectDepartmentScope } from '../../core/middleware/departmentScope.js';
import {
  requireOwnership,
  requireSelfApprovalBlock
} from '../../core/middleware/ownershipGuard.js';
import { uploadRateLimiter } from '../../core/middleware/rateLimiter.js';
import { validate } from '../../core/middleware/validate.js';
import { evidenceUploadMiddleware } from '../../core/storage/privateStorage.js';
import {
  createStudentAchievementSchema,
  listStudentAchievementsQuerySchema,
  reviewStudentAchievementSchema,
  studentAnalyticsQuerySchema,
  studentPortfolioQuerySchema,
  updateStudentAchievementSchema
} from './student.validators.js';
import * as studentController from './student.controller.js';

const router = Router();

router.use(authenticate, requireAuthenticated());

// Read routes (Faculty permitted strictly read-only within own department)
router.get('/categories', studentController.listStudentCategories);
router.get(
  '/analytics',
  injectDepartmentScope,
  validate(studentAnalyticsQuerySchema, 'query'),
  studentController.getStudentAnalytics
);
router.get(
  '/portfolio',
  validate(studentPortfolioQuerySchema, 'query'),
  studentController.getStudentPortfolio
);
router.get(
  '/',
  injectDepartmentScope,
  validate(listStudentAchievementsQuerySchema, 'query'),
  studentController.listStudentAchievements
);
router.get('/:id', studentController.getStudentAchievementById);
router.get('/:id/documents/:docId/download', studentController.downloadStudentEvidence);

// Write routes — Faculty strictly blocked (403)
router.post(
  '/',
  requireRole(ROLES.STUDENT, ROLES.SUPER_ADMIN),
  validate(createStudentAchievementSchema),
  studentController.createStudentAchievement
);
router.patch(
  '/:id',
  requireRole(ROLES.STUDENT, ROLES.SUPER_ADMIN),
  requireOwnership('student_achievements', 'owner_user_id'),
  validate(updateStudentAchievementSchema),
  studentController.updateStudentAchievement
);
router.delete(
  '/:id',
  requireRole(ROLES.STUDENT, ROLES.SUPER_ADMIN),
  requireOwnership('student_achievements', 'owner_user_id'),
  studentController.deleteStudentAchievement
);
router.post(
  '/:id/submit',
  requireRole(ROLES.STUDENT, ROLES.SUPER_ADMIN),
  requireOwnership('student_achievements', 'owner_user_id'),
  studentController.submitStudentAchievement
);
router.post(
  '/:id/documents',
  uploadRateLimiter,
  requireRole(ROLES.STUDENT, ROLES.SUPER_ADMIN),
  requireOwnership('student_achievements', 'owner_user_id'),
  evidenceUploadMiddleware,
  studentController.uploadStudentEvidence
);
router.delete(
  '/:id/documents/:docId',
  requireRole(ROLES.STUDENT, ROLES.SUPER_ADMIN),
  requireOwnership('student_achievements', 'owner_user_id'),
  studentController.deleteStudentEvidence
);

// Review / Approval — Authorized Faculty Coordinator (same dept), HOD (same dept), or Super Admin
// Regular Faculty & Students are blocked inside resolveStudentTransition
router.post(
  '/:id/review',
  validate(reviewStudentAchievementSchema),
  studentController.reviewStudentAchievement
);

export default router;

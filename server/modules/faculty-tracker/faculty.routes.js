import { Router } from 'express';
import { authenticate } from '../../core/middleware/authenticate.js';
import {
  requireFacultyOrAbove,
  requireHODOrAbove
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
  createFacultyAchievementSchema,
  facultyAnalyticsQuerySchema,
  facultyPortfolioQuerySchema,
  listFacultyAchievementsQuerySchema,
  reviewFacultyAchievementSchema,
  updateFacultyAchievementSchema
} from './faculty.validators.js';
import * as facultyController from './faculty.controller.js';

const router = Router();

// Strictly Faculty, HOD, and Super Admin — Students receive 403
router.use(authenticate, requireFacultyOrAbove());

router.get('/categories', facultyController.listFacultyCategories);
router.get(
  '/analytics',
  injectDepartmentScope,
  validate(facultyAnalyticsQuerySchema, 'query'),
  facultyController.getFacultyAnalytics
);
router.get(
  '/portfolio',
  validate(facultyPortfolioQuerySchema, 'query'),
  facultyController.getFacultyPortfolio
);
router.get(
  '/',
  injectDepartmentScope,
  validate(listFacultyAchievementsQuerySchema, 'query'),
  facultyController.listFacultyAchievements
);
router.get(
  '/:id',
  requireOwnership('faculty_achievements', 'owner_user_id'),
  facultyController.getFacultyAchievementById
);
router.post(
  '/',
  validate(createFacultyAchievementSchema),
  facultyController.createFacultyAchievement
);
router.patch(
  '/:id',
  requireOwnership('faculty_achievements', 'owner_user_id'),
  validate(updateFacultyAchievementSchema),
  facultyController.updateFacultyAchievement
);
router.delete(
  '/:id',
  requireOwnership('faculty_achievements', 'owner_user_id'),
  facultyController.deleteFacultyAchievement
);
router.post(
  '/:id/submit',
  requireOwnership('faculty_achievements', 'owner_user_id'),
  facultyController.submitFacultyAchievement
);
router.post(
  '/:id/review',
  requireHODOrAbove(),
  requireOwnership('faculty_achievements', 'owner_user_id'),
  requireSelfApprovalBlock({ ownerColumn: 'owner_user_id' }),
  validate(reviewFacultyAchievementSchema),
  facultyController.reviewFacultyAchievement
);

// Certificate upload & download
router.post(
  '/:id/documents',
  uploadRateLimiter,
  requireOwnership('faculty_achievements', 'owner_user_id'),
  evidenceUploadMiddleware,
  facultyController.uploadFacultyEvidence
);
router.get(
  '/:id/documents/:docId/download',
  requireOwnership('faculty_achievements', 'owner_user_id'),
  facultyController.downloadFacultyEvidence
);
router.delete(
  '/:id/documents/:docId',
  requireOwnership('faculty_achievements', 'owner_user_id'),
  facultyController.deleteFacultyEvidence
);

export default router;

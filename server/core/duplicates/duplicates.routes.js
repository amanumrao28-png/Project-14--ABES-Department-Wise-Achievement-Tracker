import { Router } from 'express';
import Joi from 'joi';
import { ROLES, TRACKER_DOMAINS } from '../../config/env.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAuthenticated } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { checkPotentialDuplicates } from './duplicates.service.js';

const router = Router();

const checkDuplicateSchema = Joi.object({
  tracker_domain: Joi.string()
    .valid(TRACKER_DOMAINS.DEPARTMENT, TRACKER_DOMAINS.FACULTY, TRACKER_DOMAINS.STUDENT)
    .required(),
  title: Joi.string().max(255).allow('', null).optional(),
  organization: Joi.string().max(255).allow('', null).optional(),
  achieved_on: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null).optional(),
  certificate_number: Joi.string().max(100).allow('', null).optional(),
  sha256_hash: Joi.string().max(128).allow('', null).optional(),
  exclude_achievement_id: Joi.string().uuid().allow('', null).optional()
});

/**
 * POST /api/v1/duplicates/check
 * Checks potential duplicate submissions within a single isolated tracker domain
 * and flags them for manual review.
 */
router.post(
  '/check',
  authenticate,
  requireAuthenticated(),
  validate(checkDuplicateSchema),
  async (req, res, next) => {
    try {
      const {
        tracker_domain,
        title,
        organization,
        achieved_on,
        certificate_number,
        sha256_hash,
        exclude_achievement_id
      } = req.body;

      // Enforce strict RBAC boundaries per tracker domain
      if (req.user.role === ROLES.STUDENT && tracker_domain !== TRACKER_DOMAINS.STUDENT) {
        return sendError(res, 403, 'FORBIDDEN_TRACKER', 'Students may only check student achievements.');
      }
      if (req.user.role === ROLES.FACULTY && tracker_domain === TRACKER_DOMAINS.DEPARTMENT) {
        return sendError(res, 403, 'FORBIDDEN_TRACKER', 'Faculty may not access department tracker duplicate checks.');
      }

      const result = await checkPotentialDuplicates({
        trackerDomain: tracker_domain,
        userId: req.user.id,
        title,
        organization,
        achievedOn: achieved_on || null,
        certificateNumber: certificate_number || null,
        sha256Hash: sha256_hash || null,
        excludeAchievementId: exclude_achievement_id || null
      });

      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  }
);

export default router;

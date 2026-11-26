import { Router } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/authenticate.js';
import { requireHODOrAbove } from '../middleware/authorize.js';
import { injectDepartmentScope } from '../middleware/departmentScope.js';
import { validate, commonSchemas } from '../middleware/validate.js';
import { ROLES, TRACKER_DOMAINS } from '../../config/env.js';
import db from '../../config/database.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

const listAuditLogsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  tracker_domain: Joi.string()
    .valid(...Object.values(TRACKER_DOMAINS))
    .optional(),
  action: Joi.string().trim().max(100).optional(),
  entity_type: Joi.string().trim().max(100).optional(),
  departmentId: commonSchemas.uuid.optional(),
  department_id: commonSchemas.uuid.optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  start_date: Joi.string().isoDate().optional(),
  end_date: Joi.string().isoDate().optional()
});

/**
 * Convert a date/ISO string into a Date boundary.
 * For date-only strings (YYYY-MM-DD) used as end boundaries, extend to 23:59:59.999Z.
 */
const parseDateBoundary = (value, isEnd = false) => {
  if (!value) return null;
  if (isEnd && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59.999Z`);
  }
  return new Date(value);
};

/**
 * GET /
 * List immutable audit logs with pagination and filters.
 * HODs are strictly scoped to logs where their department is actor or target.
 * Super Admins may optionally filter by departmentId.
 */
router.get(
  '/',
  authenticate,
  requireHODOrAbove(),
  injectDepartmentScope,
  validate(listAuditLogsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const {
        page,
        limit,
        tracker_domain,
        action,
        entity_type,
        department_id,
        startDate,
        endDate,
        start_date,
        end_date
      } = req.query;

      const baseQuery = db('audit_logs');

      if (req.user.role !== ROLES.SUPER_ADMIN) {
        // HODs can only inspect audit logs involving their own department
        const scopedDeptId = req.departmentScope || req.user.department_id;
        baseQuery.where(function () {
          this.where('audit_logs.actor_department_id', scopedDeptId).orWhere(
            'audit_logs.target_department_id',
            scopedDeptId
          );
        });
      } else {
        const adminDeptFilter = req.departmentScope || department_id;
        if (adminDeptFilter) {
          baseQuery.where(function () {
            this.where('audit_logs.actor_department_id', adminDeptFilter).orWhere(
              'audit_logs.target_department_id',
              adminDeptFilter
            );
          });
        }
      }

      if (tracker_domain) {
        baseQuery.where('audit_logs.tracker_domain', tracker_domain);
      }

      if (action) {
        baseQuery.where('audit_logs.action', action);
      }

      if (entity_type) {
        baseQuery.where('audit_logs.entity_type', entity_type);
      }

      const startBoundary = parseDateBoundary(startDate || start_date, false);
      if (startBoundary) {
        baseQuery.where('audit_logs.created_at', '>=', startBoundary);
      }

      const endBoundary = parseDateBoundary(endDate || end_date, true);
      if (endBoundary) {
        baseQuery.where('audit_logs.created_at', '<=', endBoundary);
      }

      const countResult = await baseQuery.clone().count('audit_logs.id as count').first();
      const total = parseInt(countResult?.count || 0, 10);
      const offset = (page - 1) * limit;

      const logs = await baseQuery
        .clone()
        .leftJoin('users', 'audit_logs.actor_user_id', 'users.id')
        .select(
          'audit_logs.*',
          'users.full_name as actor_name',
          'users.email as actor_email'
        )
        .orderBy('audit_logs.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return sendSuccess(res, logs, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

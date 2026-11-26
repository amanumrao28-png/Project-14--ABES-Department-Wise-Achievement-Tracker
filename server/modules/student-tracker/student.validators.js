import Joi from 'joi';
import { commonSchemas } from '../../core/middleware/validate.js';
import { WORKFLOW_STATUSES } from '../../config/env.js';

export const STUDENT_LEVELS = ['international', 'national', 'state', 'university', 'institutional'];

const collaboratorSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  role: Joi.string().trim().max(100).allow('').optional(),
  identifier: Joi.string().trim().max(100).allow('').optional()
});

export const createStudentAchievementSchema = Joi.object({
  category_id: commonSchemas.uuid.required(),
  title: Joi.string().trim().min(3).max(255).required(),
  description: Joi.string().trim().min(10).max(5000).required(),
  achieved_on: Joi.date().iso().required(),
  achievement_level: Joi.string()
    .valid(...STUDENT_LEVELS)
    .required(),
  organization: Joi.string().trim().min(2).max(255).required(),
  academic_year: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
    .messages({ 'string.pattern.base': 'Academic year must use format YYYY-YY (e.g. 2025-26).' }),
  details_json: Joi.object().default({}),
  collaborators_json: Joi.array().items(collaboratorSchema).max(15).default([])
});

export const updateStudentAchievementSchema = Joi.object({
  category_id: commonSchemas.uuid.optional(),
  title: Joi.string().trim().min(3).max(255).optional(),
  description: Joi.string().trim().min(10).max(5000).optional(),
  achieved_on: Joi.date().iso().optional(),
  achievement_level: Joi.string()
    .valid(...STUDENT_LEVELS)
    .optional(),
  organization: Joi.string().trim().min(2).max(255).optional(),
  academic_year: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}$/)
    .optional(),
  details_json: Joi.object().optional(),
  collaborators_json: Joi.array().items(collaboratorSchema).max(15).optional()
}).min(1);

export const listStudentAchievementsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  departmentId: commonSchemas.uuid.optional(),
  owner_user_id: commonSchemas.uuid.optional(),
  category_id: commonSchemas.uuid.optional(),
  category_group: Joi.string()
    .valid('competitions', 'internships', 'placements')
    .optional(),
  academic_year: Joi.string().trim().max(20).optional(),
  workflow_status: Joi.string()
    .valid(...Object.values(WORKFLOW_STATUSES))
    .optional(),
  achievement_level: Joi.string()
    .valid(...STUDENT_LEVELS)
    .optional(),
  search: Joi.string().trim().max(100).allow('').optional()
});

export const studentPortfolioQuerySchema = Joi.object({
  userId: commonSchemas.uuid.optional(),
  academic_year: Joi.string().trim().max(20).optional()
});

export const reviewStudentAchievementSchema = Joi.object({
  decision: Joi.string()
    .valid('under_review', 'department_approved', 'college_approved', 'rejected', 'changes_requested')
    .required(),
  remarks: Joi.string()
    .trim()
    .max(1500)
    .when('decision', {
      is: Joi.valid('rejected', 'changes_requested'),
      then: Joi.string().trim().min(5).max(1500).required(),
      otherwise: Joi.string().trim().max(1500).allow('').optional()
    }),
  override_self_approval: Joi.boolean().optional()
});

export const studentAnalyticsQuerySchema = Joi.object({
  departmentId: commonSchemas.uuid.optional(),
  category_id: commonSchemas.uuid.optional(),
  academic_year: Joi.string().trim().max(20).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional()
});

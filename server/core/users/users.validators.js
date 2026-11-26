import Joi from 'joi';
import { commonSchemas } from '../middleware/validate.js';
import { ROLES } from '../../config/env.js';

const validRoles = Object.values(ROLES);

export const createUserSchema = Joi.object({
  email: commonSchemas.email.max(255).required(),
  employee_or_roll_no: Joi.string().trim().min(1).max(100).required(),
  full_name: Joi.string().trim().min(2).max(255).required(),
  role: Joi.string()
    .valid(...validRoles)
    .required(),
  department_id: commonSchemas.uuid.required(),
  password: commonSchemas.password.required(),
  can_manage_dept_users: Joi.boolean().optional(),
  can_coordinate_student_approvals: Joi.boolean().optional()
});

export const updateUserSchema = Joi.object({
  email: commonSchemas.email.max(255).optional(),
  employee_or_roll_no: Joi.string().trim().min(1).max(100).optional(),
  full_name: Joi.string().trim().min(2).max(255).optional(),
  role: Joi.string()
    .valid(...validRoles)
    .optional(),
  department_id: commonSchemas.uuid.optional(),
  password: commonSchemas.password.optional(),
  is_active: Joi.boolean().optional(),
  can_manage_dept_users: Joi.boolean().optional(),
  can_coordinate_student_approvals: Joi.boolean().optional()
}).min(1);

export const resetAccessSchema = Joi.object({
  mode: Joi.string().valid('revoke_sessions', 'temporary_password', 'reset_link').required(),
  temporaryPassword: commonSchemas.password.when('mode', {
    is: 'temporary_password',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  activateAccount: Joi.boolean().optional()
});

export const listUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: Joi.string()
    .valid(...validRoles)
    .optional(),
  department_id: commonSchemas.uuid.optional(),
  departmentId: commonSchemas.uuid.optional(),
  search: Joi.string().trim().max(100).allow('').optional(),
  is_active: Joi.boolean().optional(),
  sortBy: Joi.string()
    .valid('created_at', 'full_name', 'email', 'role', 'employee_or_roll_no')
    .default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

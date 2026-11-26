import Joi from 'joi';

export const createDepartmentSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(1).max(10).required(),
  name: Joi.string().trim().min(2).max(255).required(),
  student_requires_college_approval: Joi.boolean().optional()
});

export const updateDepartmentSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(1).max(10).optional(),
  name: Joi.string().trim().min(2).max(255).optional(),
  is_active: Joi.boolean().optional(),
  student_requires_college_approval: Joi.boolean().optional()
}).min(1);

import Joi from 'joi';
import { commonSchemas } from '../middleware/validate.js';

export const loginSchema = Joi.object({
  email: commonSchemas.email.required(),
  password: Joi.string().required()
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: commonSchemas.password.required()
});

export const forgotPasswordSchema = Joi.object({
  email: commonSchemas.email.required()
});

export const resetPasswordQuerySchema = Joi.object({
  token: Joi.string().trim().min(32).max(256).required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(32).max(256).required(),
  newPassword: commonSchemas.password.required()
});

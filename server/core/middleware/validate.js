import Joi from 'joi';

const ALLOWED_SOURCES = new Set(['body', 'query', 'params', 'headers']);

/**
 * Safely assigns sanitized/validated input back to req[source].
 * Uses Object.defineProperty fallback for Express 5 where req.query is getter-only.
 * @param {import('express').Request} req
 * @param {string} source
 * @param {unknown} value
 */
function assignValidatedSource(req, source, value) {
  try {
    req[source] = value;
  } catch {
    Object.defineProperty(req, source, {
      value,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
}

/**
 * Input validation middleware factory using Joi.
 * Strips unknown fields to protect against mass-assignment / field injection.
 *
 * @param {import('joi').Schema} schema - Joi validation schema.
 * @param {'body'|'query'|'params'|'headers'} [source='body'] - Request property to validate.
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, source = 'body') {
  if (!schema || typeof schema.validate !== 'function') {
    throw new Error('A valid Joi schema must be provided to validate().');
  }
  if (!ALLOWED_SOURCES.has(source)) {
    throw new Error(`Invalid validation source "${source}".`);
  }

  return (req, res, next) => {
    const input = req[source] === undefined ? {} : req[source];
    const { error, value } = schema.validate(input, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.') || source,
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details
        }
      });
    }

    assignValidatedSource(req, source, value);
    return next();
  };
}

/**
 * Response output sanitization middleware factory.
 * Filters serialized JSON responses so only explicitly allowed fields are returned.
 * Preserves error responses and standard `{ success, data, ... }` envelopes.
 *
 * @param {string[]} allowedFields - Whitelisted property names to retain on response objects.
 * @returns {import('express').RequestHandler}
 */
export function sanitizeOutput(allowedFields = []) {
  const allowedSet = new Set(allowedFields);

  const pickAllowed = (item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return item;
    }
    const sanitized = {};
    for (const field of allowedSet) {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        sanitized[field] = item[field];
      }
    }
    return sanitized;
  };

  const filterPayload = (data) => (Array.isArray(data) ? data.map(pickAllowed) : pickAllowed(data));

  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (!body || typeof body !== 'object' || body.success === false || res.statusCode >= 400) {
        return originalJson(body);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'data') && body.data !== undefined) {
        return originalJson({
          ...body,
          data: filterPayload(body.data)
        });
      }

      return originalJson(filterPayload(body));
    };

    return next();
  };
}

/**
 * Reusable Joi schemas across routes.
 */
export const commonSchemas = {
  uuid: Joi.string().uuid({ version: 'uuidv4' }),
  email: Joi.string().email().lowercase().trim(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/(?=.*[a-z])/, 'lowercase')
    .pattern(/(?=.*[A-Z])/, 'uppercase')
    .pattern(/(?=.*\d)/, 'digit')
    .pattern(/(?=.*[!@#$%^&*])/, 'special')
    .messages({
      'string.min': 'Password must be at least 8 characters.',
      'string.pattern.name': 'Password must contain at least one {#name} character.'
    }),
  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().trim(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

export default validate;

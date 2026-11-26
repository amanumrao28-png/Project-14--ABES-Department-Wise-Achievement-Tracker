import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';

/**
 * Custom operational error class with HTTP status and machine-readable error code.
 */
export class AppError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} code
   * @param {string} message
   * @param {unknown} [details]
   */
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Maps known error types into standardized HTTP status codes and safe error envelopes.
 * @param {any} err
 * @param {boolean} isProduction
 * @returns {{ statusCode: number, code: string, message: string, details?: unknown }}
 */
function normalizeError(err, isProduction) {
  // Joi validation errors
  if (err?.isJoi || (err?.name === 'ValidationError' && Array.isArray(err?.details))) {
    const details = Array.isArray(err.details)
      ? err.details.map((detail) => ({
          field: Array.isArray(detail.path) ? detail.path.join('.') : undefined,
          message: detail.message,
          type: detail.type
        }))
      : undefined;

    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: err.message || 'Request validation failed.',
      details
    };
  }

  // JWT errors
  if (err?.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired.'
    };
  }

  if (err?.name === 'JsonWebTokenError' || err?.name === 'NotBeforeError') {
    return {
      statusCode: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token.'
    };
  }

  // Malformed JSON body errors from express.json()
  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400 && 'body' in err)) {
    return {
      statusCode: 400,
      code: 'INVALID_JSON',
      message: 'Malformed JSON request payload.'
    };
  }

  // Request payload size limit errors
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return {
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload exceeds allowed size limit.'
    };
  }

  // Multer file upload errors
  if (err?.name === 'MulterError') {
    return {
      statusCode: 400,
      code: err.code || 'UPLOAD_ERROR',
      message: err.message || 'File upload failed.'
    };
  }

  // PostgreSQL invalid UUID / parameter syntax error
  if (err?.code === '22P02') {
    return {
      statusCode: 400,
      code: 'INVALID_ID_FORMAT',
      message: 'Invalid identifier format.'
    };
  }

  // Known operational AppError
  if (err instanceof AppError || err?.isOperational === true) {
    return {
      statusCode: Number(err.statusCode) || 500,
      code: err.code || 'APP_ERROR',
      message: err.message || 'Request failed.',
      ...(err.details !== undefined ? { details: err.details } : {})
    };
  }

  // Unexpected / internal errors: never leak internals in production
  const isDev = !isProduction && env?.NODE_ENV === 'development';
  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: isDev && err?.message ? err.message : 'An internal server error occurred.',
    ...(isDev && err?.stack ? { details: { stack: err.stack } } : {})
  };
}

/**
 * Fallback 404 middleware for unmatched routes.
 */
export function notFoundHandler(req, res, next) {
  if (!req.requestId) {
    req.requestId = randomUUID();
  }
  return next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found.`));
}

/**
 * Global Express error handler middleware.
 * Logs full server-side diagnostics with requestId and emits standardized error envelopes.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const requestId = req.requestId || randomUUID();
  req.requestId = requestId;

  const isProduction = env?.NODE_ENV === 'production';

  console.error(`[${requestId}] Error:`, {
    name: err?.name,
    code: err?.code,
    statusCode: err?.statusCode,
    message: err?.message,
    stack: err?.stack
  });

  const normalized = normalizeError(err, isProduction);

  const errorPayload = {
    code: normalized.code,
    message: normalized.message,
    ...(normalized.details !== undefined ? { details: normalized.details } : {}),
    requestId
  };

  return res.status(normalized.statusCode).json({
    success: false,
    error: errorPayload
  });
}

export default errorHandler;

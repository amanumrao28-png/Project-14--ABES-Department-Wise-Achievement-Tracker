/**
 * Standardized API response helpers.
 */

/**
 * Send a standardized success JSON response.
 *
 * @param {import('express').Response} res - Express response object
 * @param {*} data - Response payload
 * @param {object|null} [meta=null] - Optional pagination or extra metadata
 * @param {number} [statusCode=200] - HTTP status code
 */
export const sendSuccess = (res, data, meta = null, statusCode = 200) => {
  const response = { success: true, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

/**
 * Send a standardized error JSON response.
 *
 * @param {import('express').Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Machine-readable error code
 * @param {string} message - Human-readable error message
 * @param {*|null} [details=null] - Optional validation or diagnostic details
 */
export const sendError = (res, statusCode, code, message, details = null) => {
  const response = { success: false, error: { code, message } };
  if (details) response.error.details = details;
  return res.status(statusCode).json(response);
};

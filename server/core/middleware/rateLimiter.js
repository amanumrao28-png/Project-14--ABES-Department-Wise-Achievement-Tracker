import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';

/**
 * Shared factory to construct standardized JSON rate-limiters.
 * @param {object} config
 * @param {number} config.windowMs
 * @param {number} config.max
 * @param {string} config.errorMessage
 * @param {(req: import('express').Request) => string} [config.keyGenerator]
 */
function createRateLimiter({ windowMs, max, errorMessage, keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip || 'unknown'),
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: errorMessage
      }
    }
  });
}

const loginWindowMs = Number(env?.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const loginMax = Number(env?.LOGIN_RATE_LIMIT_MAX) || 5;

/** Strict brute-force limiter for authentication login endpoints. */
export const loginRateLimiter = createRateLimiter({
  windowMs: loginWindowMs,
  max: loginMax,
  errorMessage: 'Too many login attempts. Please try again after 15 minutes.',
  keyGenerator: (req) => req.ip || 'unknown'
});

/** General API rate limiter (100 requests per minute). */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  errorMessage: 'Too many requests. Please try again later.',
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown'
});

/** File upload rate limiter (10 uploads per minute). */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  errorMessage: 'Too many file uploads. Please try again after 1 minute.',
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown'
});

/** Rate limiter for forgot-password and reset-password endpoints (5 requests per 15 minutes per IP). */
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  errorMessage: 'Too many password reset requests. Please try again after 15 minutes.',
  keyGenerator: (req) => req.ip || 'unknown'
});

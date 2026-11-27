import dotenv from 'dotenv';

dotenv.config();

/**
 * Application role identifiers used across auth, RBAC, and audit logging.
 */
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  HOD: 'hod',
  FACULTY: 'faculty',
  STUDENT: 'student',
});

/**
 * Achievement workflow lifecycle statuses.
 */
export const WORKFLOW_STATUSES = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  CHANGES_REQUESTED: 'changes_requested',
  DEPARTMENT_APPROVED: 'department_approved',
  COLLEGE_APPROVED: 'college_approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
});

/**
 * Tracker domain identifiers for scoped records and audit trails.
 */
export const TRACKER_DOMAINS = Object.freeze({
  DEPARTMENT: 'department',
  FACULTY: 'faculty',
  STUDENT: 'student',
});

/**
 * Parses a positive integer environment variable with fallback validation.
 *
 * @param {string | undefined} rawValue - Raw string value from process.env.
 * @param {number} defaultValue - Fallback integer when rawValue is unset.
 * @param {string} varName - Environment variable name for error reporting.
 * @returns {number} Validated positive integer.
 */
function parsePositiveInt(rawValue, defaultValue, varName) {
  if (rawValue === undefined || rawValue === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid environment variable ${varName}: expected a positive integer.`);
  }

  return parsed;
}

/**
 * Validates that required production secrets and database credentials are provided.
 */
function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '');

  const requiredVars = [
    ...(hasDatabaseUrl ? [] : ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']),
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = requiredVars.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(', ')}`
    );
  }

  if (process.env.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters in production.');
  }

  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production.');
  }
}

validateProductionEnv();

const maxFileSizeMb = parsePositiveInt(
  process.env.MAX_FILE_SIZE_MB,
  10,
  'MAX_FILE_SIZE_MB'
);

const allowedMimeTypes = Object.freeze(
  (process.env.ALLOWED_MIME_TYPES || 'application/pdf,image/jpeg,image/png,image/webp')
    .split(',')
    .map((type) => type.trim())
    .filter(Boolean)
);

/**
 * Frozen, validated environment configuration object.
 */
export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parsePositiveInt(process.env.PORT, 5000, 'PORT'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parsePositiveInt(process.env.DB_PORT, 5432, 'DB_PORT'),
  DB_NAME: process.env.DB_NAME || 'abes_achievement_tracker',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD ?? '',

  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production-32chars',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production-32chars',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE_MB: maxFileSizeMb,
  MAX_FILE_SIZE_BYTES: maxFileSizeMb * 1024 * 1024,
  ALLOWED_MIME_TYPES: allowedMimeTypes,

  LOGIN_RATE_LIMIT_WINDOW_MS: parsePositiveInt(
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
    900000,
    'LOGIN_RATE_LIMIT_WINDOW_MS'
  ),
  LOGIN_RATE_LIMIT_MAX: parsePositiveInt(
    process.env.LOGIN_RATE_LIMIT_MAX,
    5,
    'LOGIN_RATE_LIMIT_MAX'
  ),
});

export default env;

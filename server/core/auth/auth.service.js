import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { env, ROLES } from '../../config/env.js';
import db from '../../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

const BCRYPT_SALT_ROUNDS = 12;
const DEFAULT_REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_EXPIRY_MS = 30 * 60 * 1000;

/**
 * Parse a duration string like '7d', '24h', '30m', '60s' into milliseconds.
 */
const parseExpiryToMs = (expiry) => {
  if (typeof expiry === 'number' && Number.isFinite(expiry)) {
    return expiry * 1000;
  }
  if (typeof expiry !== 'string') {
    return DEFAULT_REFRESH_EXPIRY_MS;
  }

  const trimmed = expiry.trim();
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10) * 1000;
  }

  const match = trimmed.match(/^(\d+)\s*(s|m|h|d|w)$/i);
  if (!match) {
    return DEFAULT_REFRESH_EXPIRY_MS;
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return amount * multipliers[unit];
};

/**
 * Return the standardized public user shape without sensitive fields.
 */
const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  department_id: user.department_id,
  full_name: user.full_name,
  employee_or_roll_no: user.employee_or_roll_no,
  can_manage_dept_users: Boolean(user.can_manage_dept_users),
  can_coordinate_student_approvals: Boolean(user.can_coordinate_student_approvals)
});

export const AuthService = {
  /**
   * Generate a signed JWT access token for the user.
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        role: user.role,
        department_id: user.department_id
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY || '15m' }
    );
  },

  /**
   * Compute a SHA-256 hex digest for storing and looking up refresh tokens.
   */
  hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  /**
   * Authenticate user credentials, issue access + refresh tokens, and record login timestamp.
   */
  async login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await db('users')
      .whereRaw('LOWER(email) = ?', [normalizedEmail])
      .andWhere('is_active', true)
      .first();

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = AuthService.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + parseExpiryToMs(env.JWT_REFRESH_EXPIRY));

    await db('refresh_tokens').insert({
      id: uuidv4(),
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      is_revoked: false
    });

    await db('users')
      .where({ id: user.id })
      .update({
        last_login_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    return {
      accessToken,
      refreshToken,
      user: sanitizeUser(user)
    };
  },

  /**
   * Validate a refresh token, rotate it atomically, and issue a fresh token pair.
   */
  async refreshAccessToken(refreshToken) {
    const tokenHash = AuthService.hashRefreshToken(refreshToken);

    const storedToken = await db('refresh_tokens')
      .where({ token_hash: tokenHash, is_revoked: false })
      .andWhere('expires_at', '>', db.fn.now())
      .first();

    if (!storedToken) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token.');
    }

    const user = await db('users').where({ id: storedToken.user_id }).first();
    if (!user || !user.is_active || !Object.values(ROLES).includes(user.role)) {
      await db('refresh_tokens').where({ id: storedToken.id }).update({ is_revoked: true });
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'User account is inactive or unavailable.');
    }

    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const newTokenHash = AuthService.hashRefreshToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + parseExpiryToMs(env.JWT_REFRESH_EXPIRY));

    await db.transaction(async (trx) => {
      // Atomic revocation check prevents concurrent reuse of the same refresh token
      const updatedCount = await trx('refresh_tokens')
        .where({ id: storedToken.id, is_revoked: false })
        .update({ is_revoked: true });

      if (!updatedCount) {
        throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has already been used.');
      }

      await trx('refresh_tokens').insert({
        id: uuidv4(),
        user_id: user.id,
        token_hash: newTokenHash,
        expires_at: expiresAt,
        is_revoked: false
      });
    });

    const accessToken = AuthService.generateAccessToken(user);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: sanitizeUser(user)
    };
  },

  /**
   * Revoke a specific refresh token or all refresh tokens belonging to the user.
   */
  async logout(userId, refreshToken = null) {
    if (refreshToken) {
      const tokenHash = AuthService.hashRefreshToken(refreshToken);
      await db('refresh_tokens')
        .where({ user_id: userId, token_hash: tokenHash })
        .update({ is_revoked: true });
      return;
    }

    await db('refresh_tokens')
      .where({ user_id: userId, is_revoked: false })
      .update({ is_revoked: true });
  },

  /**
   * Verify current password, hash and store new password, and revoke all active sessions.
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await db('users')
      .where({ id: userId, is_active: true })
      .first();

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      throw new AppError(401, 'INVALID_PASSWORD', 'Current password is incorrect.');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await db.transaction(async (trx) => {
      await trx('users')
        .where({ id: userId })
        .update({
          password_hash: newPasswordHash,
          updated_at: db.fn.now()
        });

      await trx('refresh_tokens')
        .where({ user_id: userId, is_revoked: false })
        .update({ is_revoked: true });
    });
  },

  /**
   * Create a single-use SHA-256 hashed password reset token for a user,
   * invalidating any previous unused reset tokens for that account.
   */
  async createPasswordResetToken(userId, createdByUserId = null, trxOrDb = db) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = AuthService.hashRefreshToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    await trxOrDb('password_reset_tokens')
      .where({ user_id: userId })
      .whereNull('used_at')
      .update({ used_at: trxOrDb.fn.now() });

    await trxOrDb('password_reset_tokens').insert({
      id: uuidv4(),
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by_user_id: createdByUserId
    });

    return { rawToken, expiresAt };
  },

  /**
   * Initiate a forgot-password request. Silently succeeds when email does not exist
   * to prevent account enumeration.
   */
  async requestPasswordReset(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await db('users')
      .whereRaw('LOWER(email) = ?', [normalizedEmail])
      .andWhere('is_active', true)
      .first();

    if (!user) {
      return { issued: false };
    }

    const { rawToken, expiresAt } = await AuthService.createPasswordResetToken(user.id);

    if (env.NODE_ENV !== 'production') {
      const clientOrigin = env.CORS_ORIGIN.split(',')[0].trim();
      console.info(
        `[DEV PASSWORD RESET] email=${user.email} resetUrl=${clientOrigin}/reset-password?token=${rawToken}`
      );
    }

    return {
      issued: true,
      userId: user.id,
      role: user.role,
      departmentId: user.department_id,
      expiresAt
    };
  },

  /**
   * Verify whether a password reset token is valid, unused, unexpired, and belongs to an active user.
   */
  async verifyPasswordResetToken(rawToken) {
    const tokenHash = AuthService.hashRefreshToken(rawToken.trim());
    const record = await db('password_reset_tokens')
      .join('users', 'password_reset_tokens.user_id', 'users.id')
      .where('password_reset_tokens.token_hash', tokenHash)
      .whereNull('password_reset_tokens.used_at')
      .andWhere('password_reset_tokens.expires_at', '>', db.fn.now())
      .andWhere('users.is_active', true)
      .select('password_reset_tokens.expires_at', 'users.email')
      .first();

    if (!record) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Password reset link is invalid or has expired.');
    }

    return {
      valid: true,
      expiresAt: record.expires_at
    };
  },

  /**
   * Reset a user's password using a valid one-time token and revoke all active sessions.
   */
  async resetPasswordWithToken(rawToken, newPassword) {
    const tokenHash = AuthService.hashRefreshToken(rawToken.trim());
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    return db.transaction(async (trx) => {
      const record = await trx('password_reset_tokens')
        .join('users', 'password_reset_tokens.user_id', 'users.id')
        .where('password_reset_tokens.token_hash', tokenHash)
        .whereNull('password_reset_tokens.used_at')
        .andWhere('password_reset_tokens.expires_at', '>', trx.fn.now())
        .andWhere('users.is_active', true)
        .select(
          'password_reset_tokens.id as token_id',
          'users.id as user_id',
          'users.role',
          'users.department_id'
        )
        .first();

      if (!record) {
        throw new AppError(400, 'INVALID_RESET_TOKEN', 'Password reset link is invalid or has expired.');
      }

      const consumed = await trx('password_reset_tokens')
        .where({ id: record.token_id })
        .whereNull('used_at')
        .update({ used_at: trx.fn.now() });

      if (!consumed) {
        throw new AppError(400, 'INVALID_RESET_TOKEN', 'Password reset link has already been used.');
      }

      await trx('users')
        .where({ id: record.user_id })
        .update({
          password_hash: newPasswordHash,
          updated_at: trx.fn.now()
        });

      await trx('refresh_tokens')
        .where({ user_id: record.user_id, is_revoked: false })
        .update({ is_revoked: true });

      return {
        userId: record.user_id,
        role: record.role,
        departmentId: record.department_id
      };
    });
  }
};

import { AuthService } from './auth.service.js';
import { auditLog } from '../audit/audit.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { ROLES } from '../../config/env.js';
import db from '../../config/database.js';

/**
 * Verifies whether a user's authenticated role is permitted to sign into the target portal.
 * Super Admin is permitted across all four portals; all other roles are strictly locked to their own portal.
 */
export function isRoleAllowedOnPortal(role, portal) {
  if (!portal) return true;
  if (role === ROLES.SUPER_ADMIN) return true;
  return role === portal;
}

/**
 * POST /login
 * Authenticate user credentials and return tokens + user profile.
 */
export async function login(req, res, next) {
  try {
    const { email, password, portal } = req.body;
    const result = await AuthService.login(email, password);

    if (portal && !isRoleAllowedOnPortal(result.user.role, portal)) {
      auditLog({
        actorUserId: result.user.id,
        actorRole: result.user.role,
        actorDepartmentId: result.user.department_id,
        action: 'PORTAL_LOGIN_DENIED',
        entityType: 'user',
        entityId: result.user.id,
        targetDepartmentId: result.user.department_id,
        afterState: { attempted_portal: portal },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.requestId
      });

      return sendError(
        res,
        403,
        'PORTAL_ACCESS_DENIED',
        `Your account role (${result.user.role}) is not authorized to sign into the ${portal} portal.`
      );
    }

    auditLog({
      actorUserId: result.user.id,
      actorRole: result.user.role,
      actorDepartmentId: result.user.department_id,
      action: 'LOGIN',
      entityType: 'user',
      entityId: result.user.id,
      targetDepartmentId: result.user.department_id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /refresh
 * Exchange a valid refresh token for a rotated access + refresh token pair.
 */
export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshAccessToken(refreshToken);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /logout
 * Revoke the provided refresh token or all user sessions if none is supplied.
 */
export async function logout(req, res, next) {
  try {
    const refreshToken = req.body?.refreshToken || null;
    await AuthService.logout(req.user.id, refreshToken);

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      action: 'LOGOUT',
      entityType: 'user',
      entityId: req.user.id,
      targetDepartmentId: req.user.department_id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, { message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /me
 * Return the authenticated user's profile enriched with department details.
 */
export async function getMe(req, res, next) {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required.');
    }

    const department = req.user.department_id
      ? await db('departments')
          .where({ id: req.user.department_id })
          .select('id', 'code', 'name', 'is_active', 'student_requires_college_approval')
          .first()
      : null;

    return sendSuccess(res, {
      ...req.user,
      department: department || null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /change-password
 * Update the authenticated user's password and revoke existing refresh tokens.
 */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user.id, currentPassword, newPassword);

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      action: 'CHANGE_PASSWORD',
      entityType: 'user',
      entityId: req.user.id,
      targetDepartmentId: req.user.department_id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, { message: 'Password changed successfully. Please log in again.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /forgot-password
 * Issue a one-time reset token if account exists; always return a uniform response.
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const outcome = await AuthService.requestPasswordReset(email);

    if (outcome.issued) {
      auditLog({
        actorUserId: outcome.userId,
        actorRole: outcome.role,
        actorDepartmentId: outcome.departmentId,
        action: 'FORGOT_PASSWORD_REQUEST',
        entityType: 'user',
        entityId: outcome.userId,
        targetDepartmentId: outcome.departmentId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.requestId
      });
    }

    return sendSuccess(res, {
      message: 'If an active account exists for this email, password reset instructions have been issued.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reset-password/verify
 * Verify reset token status before rendering reset password form.
 */
export async function verifyResetToken(req, res, next) {
  try {
    const result = await AuthService.verifyPasswordResetToken(req.query.token);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /reset-password
 * Complete password reset using a valid token and revoke all active sessions.
 */
export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const outcome = await AuthService.resetPasswordWithToken(token, newPassword);

    auditLog({
      actorUserId: outcome.userId,
      actorRole: outcome.role,
      actorDepartmentId: outcome.departmentId,
      action: 'RESET_PASSWORD',
      entityType: 'user',
      entityId: outcome.userId,
      targetDepartmentId: outcome.departmentId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, {
      message: 'Your password has been reset successfully. Please sign in with your new password.'
    });
  } catch (err) {
    next(err);
  }
}

import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import db from '../../config/database.js';

/**
 * JWT Authentication middleware.
 * Validates Bearer access token, verifies active user record, and attaches req.user & req.requestId.
 */
export async function authenticate(req, res, next) {
  if (!req.requestId) {
    req.requestId = randomUUID();
  }

  const authHeader = req.headers?.authorization;
  if (typeof authHeader !== 'string') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication token is required.'
      }
    });
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());
  const token = match?.[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication token is required.'
      }
    });
  }

  if (!env?.JWT_ACCESS_SECRET) {
    return next(new Error('JWT_ACCESS_SECRET is not configured.'));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired.'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token.'
      }
    });
  }

  // Reject tokens lacking subject identity or refresh tokens presented as access tokens
  if (!decoded || typeof decoded !== 'object' || !decoded.sub || decoded.type === 'refresh') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token.'
      }
    });
  }

  try {
    const user = await db('users')
      .select(
        'id',
        'email',
        'role',
        'department_id',
        'full_name',
        'employee_or_roll_no',
        'can_manage_dept_users',
        'can_coordinate_student_approvals'
      )
      .where({ id: decoded.sub, is_active: true })
      .first();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found or inactive.'
        }
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      department_id: user.department_id,
      full_name: user.full_name,
      employee_or_roll_no: user.employee_or_roll_no,
      can_manage_dept_users: Boolean(user.can_manage_dept_users),
      can_coordinate_student_approvals: Boolean(user.can_coordinate_student_approvals)
    };

    return next();
  } catch (err) {
    if (err?.code === '22P02') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token.'
        }
      });
    }
    return next(err);
  }
}

export default authenticate;

import { ROLES } from '../../config/env.js';

/**
 * Generic role check middleware factory.
 * @param  {...string} allowedRoles - Roles permitted to access the route.
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...allowedRoles) {
  const roles = allowedRoles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.'
        }
      });
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `Access denied. Required role(s): ${roles.join(', ')}.`
        }
      });
    }

    return next();
  };
}

// Convenience role guard factories
export const requireSuperAdmin = () => requireRole(ROLES.SUPER_ADMIN);
export const requireHODOrAbove = () => requireRole(ROLES.SUPER_ADMIN, ROLES.HOD);
export const requireFacultyOrAbove = () => requireRole(ROLES.SUPER_ADMIN, ROLES.HOD, ROLES.FACULTY);
export const requireAuthenticated = () =>
  requireRole(ROLES.SUPER_ADMIN, ROLES.HOD, ROLES.FACULTY, ROLES.STUDENT);

// Semantic aliases for route readability
export const requireHOD = requireHODOrAbove;
export const requireFaculty = requireFacultyOrAbove;
export const requireStudent = requireAuthenticated;

/**
 * Allows Super Admin globally, or an HOD strictly if granted `can_manage_dept_users`.
 * Department isolation and target-role constraints are enforced downstream.
 */
export const requireDeptUserManagerOrSuperAdmin = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.'
        }
      });
    }

    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    if (req.user.role === ROLES.HOD) {
      if (req.user.can_manage_dept_users === true) {
        return next();
      }
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_MANAGEMENT_NOT_GRANTED',
          message: 'User management permission has not been granted to your HOD account.'
        }
      });
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_ROLE',
        message: 'Access denied. Only Super Admin or authorized HOD may manage users.'
      }
    });
  };
};

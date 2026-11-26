import { ROLES } from '../../config/env.js';

const DEPARTMENT_DENIED_ERROR = {
  success: false,
  error: {
    code: 'DEPARTMENT_ACCESS_DENIED',
    message: "You do not have access to this department's resources."
  }
};

/**
 * Ensures non-Super-Admin users can only access resources within their own department.
 * Validates any department identifier provided via params, query, or body,
 * and populates req.departmentScope for downstream filtering.
 */
export function requireDepartmentAccess(req, res, next) {
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
    const requested =
      req.params?.departmentId ?? req.query?.departmentId ?? req.body?.department_id ?? null;
    req.departmentScope = typeof requested === 'string' && requested.trim() !== '' ? requested.trim() : null;
    return next();
  }

  if (!req.user.department_id) {
    return res.status(403).json(DEPARTMENT_DENIED_ERROR);
  }

  // Inspect all possible department inputs to prevent mixed-source bypass or query array pollution
  const providedDepartments = [
    req.params?.departmentId,
    req.query?.departmentId,
    req.body?.department_id
  ].filter((value) => value !== undefined && value !== null && value !== '');

  for (const deptId of providedDepartments) {
    if (typeof deptId !== 'string' || deptId !== req.user.department_id) {
      return res.status(403).json(DEPARTMENT_DENIED_ERROR);
    }
  }

  req.departmentScope = req.user.department_id;
  return next();
}

/**
 * Always injects req.departmentScope for list and analytics queries.
 * Super Admins may optionally filter by query.departmentId (null = all departments).
 * All other roles are strictly forced to their own req.user.department_id.
 */
export function injectDepartmentScope(req, res, next) {
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
    const queryDept = req.query?.departmentId;
    req.departmentScope =
      typeof queryDept === 'string' && queryDept.trim() !== '' ? queryDept.trim() : null;
    return next();
  }

  if (!req.user.department_id) {
    return res.status(403).json(DEPARTMENT_DENIED_ERROR);
  }

  req.departmentScope = req.user.department_id;
  return next();
}

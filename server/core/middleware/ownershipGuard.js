import { ROLES } from '../../config/env.js';
import db from '../../config/database.js';

const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validates SQL table/column identifiers used in middleware configuration.
 * @param {string} identifier
 * @param {string} label
 */
function assertSafeIdentifier(identifier, label) {
  if (typeof identifier !== 'string' || !SAFE_IDENTIFIER_REGEX.test(identifier)) {
    throw new Error(`Invalid SQL ${label} identifier: ${String(identifier)}`);
  }
}

/**
 * Record ownership verification middleware factory.
 * Verifies record existence and enforces role-appropriate ownership or department scope.
 * Attaches the fetched row to req.resource.
 *
 * @param {string} tableName - Target database table name.
 * @param {string} [ownerColumn='owner_user_id'] - Column storing the record owner's user ID.
 * @param {string} [departmentColumn='department_id'] - Column storing the record's department ID.
 * @returns {import('express').RequestHandler}
 */
export function requireOwnership(
  tableName,
  ownerColumn = 'owner_user_id',
  departmentColumn = 'department_id'
) {
  assertSafeIdentifier(tableName, 'table');
  assertSafeIdentifier(ownerColumn, 'owner column');
  if (departmentColumn !== null && departmentColumn !== undefined) {
    assertSafeIdentifier(departmentColumn, 'department column');
  }

  const selectColumns = Array.from(
    new Set(['id', ownerColumn, ...(departmentColumn ? [departmentColumn] : [])])
  );

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.'
        }
      });
    }

    const recordId = req.params?.id;
    if (!recordId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Resource ID is required.'
        }
      });
    }

    try {
      const record = await db(tableName).select(selectColumns).where({ id: recordId }).first();

      if (!record) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found.'
          }
        });
      }

      const { role, id: userId, department_id: userDeptId } = req.user;
      let isAuthorized = false;

      if (role === ROLES.SUPER_ADMIN) {
        isAuthorized = true;
      } else if (role === ROLES.HOD) {
        isAuthorized = Boolean(
          departmentColumn && userDeptId && record[departmentColumn] === userDeptId
        );
      } else if (role === ROLES.FACULTY || role === ROLES.STUDENT) {
        isAuthorized = Boolean(userId && record[ownerColumn] === userId);
      }

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'OWNERSHIP_DENIED',
            message: 'You do not have permission to access this resource.'
          }
        });
      }

      req.resource = record;
      if (res.locals) {
        res.locals.ownershipOwnerColumn = ownerColumn;
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Core maker-checker self-approval guard.
 * Prevents users from approving/reviewing their own submissions unless a Super Admin
 * explicitly supplies an override flag (which is audit-logged).
 */
function executeSelfApprovalCheck(req, res, next, options = {}) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.'
      }
    });
  }

  // Fail closed if requireOwnership was not executed prior to this guard
  if (!req.resource) {
    return next(
      new Error('Resource context missing. Ensure requireOwnership runs before requireSelfApprovalBlock.')
    );
  }

  const ownerColumn =
    options.ownerColumn || res.locals?.ownershipOwnerColumn || 'owner_user_id';
  const ownerId = req.resource[ownerColumn];

  if (ownerId !== undefined && ownerId === req.user.id) {
    const isSuperAdmin = req.user.role === ROLES.SUPER_ADMIN;
    const hasExplicitOverride = Boolean(
      options.allowSuperAdminOverride === true ||
        req.allowSelfApprovalOverride === true ||
        req.body?.override_self_approval === true ||
        req.body?.overrideSelfApproval === true ||
        req.headers?.['x-override-self-approval'] === 'true'
    );

    if (isSuperAdmin && hasExplicitOverride) {
      req.selfApprovalOverridden = true;
      req.auditMeta = {
        ...(req.auditMeta || {}),
        selfApprovalOverride: true,
        overriddenBy: req.user.id,
        resourceId: req.resource.id ?? req.params?.id ?? null,
        timestamp: new Date().toISOString()
      };

      console.warn(
        '[AUDIT] SELF_APPROVAL_OVERRIDE',
        JSON.stringify({
          requestId: req.requestId || null,
          ...req.auditMeta
        })
      );

      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'SELF_APPROVAL_BLOCKED',
        message: 'Self-approval is not permitted. Submissions must be reviewed by another authorized user.'
      }
    });
  }

  return next();
}

/**
 * Self-approval prevention middleware.
 * Can be mounted directly as `requireSelfApprovalBlock` or invoked as a factory:
 * `requireSelfApprovalBlock('submitted_by')` or `requireSelfApprovalBlock({ ownerColumn, allowSuperAdminOverride })`.
 */
export function requireSelfApprovalBlock(arg1, res, next) {
  // Invoked directly as Express middleware: (req, res, next)
  if (arg1 && typeof arg1 === 'object' && res && typeof next === 'function') {
    return executeSelfApprovalCheck(arg1, res, next);
  }

  // Invoked as middleware factory: (ownerColumn?) or ({ ownerColumn?, allowSuperAdminOverride? })
  const options =
    typeof arg1 === 'string'
      ? { ownerColumn: arg1 }
      : arg1 && typeof arg1 === 'object'
        ? arg1
        : {};

  return (req, response, nextFn) => executeSelfApprovalCheck(req, response, nextFn, options);
}

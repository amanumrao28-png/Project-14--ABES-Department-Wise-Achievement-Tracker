import db from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Return the string if it is a valid UUID, otherwise null.
 * Prevents PostgreSQL 22P02 errors when optional audit IDs are malformed.
 */
const toValidUuidOrNull = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
};

/**
 * Strip sensitive credential fields before serializing state snapshots to JSONB.
 */
const serializeJsonbState = (state) => {
  if (state === null || state === undefined) return null;
  if (typeof state === 'object' && !Array.isArray(state)) {
    const { password_hash, password, ...safeState } = state;
    return JSON.stringify(safeState);
  }
  return JSON.stringify(state);
};

/**
 * Record an immutable audit log entry into the audit_logs table.
 * Safe for both fire-and-forget and awaited usage: failures are logged and never thrown.
 *
 * @param {object} entry
 */
export async function auditLog({
  actorUserId = null,
  actorRole = null,
  actorDepartmentId = null,
  trackerDomain = null,
  action,
  entityType = null,
  entityId = null,
  targetDepartmentId = null,
  beforeState = null,
  afterState = null,
  ipAddress = null,
  userAgent = null,
  requestId = null
}) {
  try {
    if (!action) {
      console.error('[AuditService] Skipping audit log: missing required action');
      return;
    }

    await db('audit_logs').insert({
      id: uuidv4(),
      actor_user_id: toValidUuidOrNull(actorUserId),
      actor_role: actorRole ? String(actorRole).slice(0, 20) : null,
      actor_department_id: toValidUuidOrNull(actorDepartmentId),
      tracker_domain: trackerDomain ? String(trackerDomain).slice(0, 20) : null,
      action: String(action).slice(0, 100),
      entity_type: entityType ? String(entityType).slice(0, 100) : null,
      entity_id: toValidUuidOrNull(entityId),
      target_department_id: toValidUuidOrNull(targetDepartmentId),
      before_state: serializeJsonbState(beforeState),
      after_state: serializeJsonbState(afterState),
      ip_address: ipAddress ? String(ipAddress).slice(0, 45) : null,
      user_agent: userAgent || null,
      request_id: requestId ? String(requestId).slice(0, 100) : null
    });
  } catch (err) {
    // Audit logging must never disrupt or crash the main request lifecycle
    console.error('[AuditService] Failed to write audit log:', err.message);
  }
}

/**
 * Convenience Express middleware that logs an audit event after the response finishes.
 *
 * @param {string} action - Action identifier (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} entityType - Target entity type (e.g., 'achievement', 'user')
 * @param {string|null} [trackerDomain=null] - Optional tracker domain ('department', 'faculty', 'student')
 */
export function auditMiddleware(action, entityType, trackerDomain = null) {
  return (req, res, next) => {
    res.on('finish', () => {
      // Skip logging unsuccessful mutations so failed requests aren't recorded as completed actions
      if (typeof res.statusCode === 'number' && res.statusCode >= 400) {
        return;
      }

      const entityId = req.params?.id || res.locals?.auditEntityId || null;
      const targetDepartmentId =
        res.locals?.targetDepartmentId ||
        req.body?.department_id ||
        req.departmentScope ||
        req.user?.department_id ||
        null;

      auditLog({
        actorUserId: req.user?.id || null,
        actorRole: req.user?.role || null,
        actorDepartmentId: req.user?.department_id || null,
        trackerDomain,
        action,
        entityType,
        entityId,
        targetDepartmentId,
        beforeState: res.locals?.auditBeforeState ?? null,
        afterState: res.locals?.auditAfterState ?? null,
        ipAddress: req.ip || req.socket?.remoteAddress || null,
        userAgent: typeof req.get === 'function' ? req.get('user-agent') : req.headers?.['user-agent'] || null,
        requestId: req.requestId || req.id || req.headers?.['x-request-id'] || null
      });
    });

    next();
  };
}

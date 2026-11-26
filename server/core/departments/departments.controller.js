import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from '../audit/audit.service.js';
import { sendSuccess } from '../utils/response.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEPARTMENT_FIELDS = ['id', 'code', 'name', 'is_active', 'student_requires_college_approval'];

const assertValidUuid = (id) => {
  if (!id || !UUID_REGEX.test(id)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid department ID format.');
  }
};

/**
 * GET /
 * List departments (reference data accessible to all authenticated users).
 */
export async function listDepartments(req, res, next) {
  try {
    const query = db('departments').select(...DEPARTMENT_FIELDS);

    if (req.query.is_active !== undefined) {
      const isActive = req.query.is_active === 'true' || req.query.is_active === true;
      query.where('is_active', isActive);
    }

    const departments = await query.orderBy('name', 'asc');
    return sendSuccess(res, departments);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /:id
 * Fetch a single department by ID.
 */
export async function getDepartmentById(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const department = await db('departments')
      .where({ id })
      .select(...DEPARTMENT_FIELDS, 'created_at', 'updated_at')
      .first();

    if (!department) {
      throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
    }

    return sendSuccess(res, department);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /
 * Create a new department (Super Admin only).
 */
export async function createDepartment(req, res, next) {
  try {
    const normalizedCode = req.body.code.trim().toUpperCase();
    const trimmedName = req.body.name.trim();

    const existing = await db('departments')
      .whereRaw('UPPER(code) = ?', [normalizedCode])
      .first();

    if (existing) {
      throw new AppError(
        409,
        'DEPARTMENT_CODE_EXISTS',
        'A department with this code already exists.'
      );
    }

    const [createdDepartment] = await db('departments')
      .insert({
        id: uuidv4(),
        code: normalizedCode,
        name: trimmedName,
        is_active: true,
        student_requires_college_approval: Boolean(req.body.student_requires_college_approval)
      })
      .returning([...DEPARTMENT_FIELDS, 'created_at', 'updated_at']);

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      action: 'CREATE',
      entityType: 'department',
      entityId: createdDepartment.id,
      targetDepartmentId: createdDepartment.id,
      afterState: createdDepartment,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, createdDepartment, null, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /:id
 * Update department details or active status (Super Admin only).
 */
export async function updateDepartment(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existingDepartment = await db('departments')
      .where({ id })
      .select(...DEPARTMENT_FIELDS, 'created_at', 'updated_at')
      .first();

    if (!existingDepartment) {
      throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
    }

    const { code, name, is_active, student_requires_college_approval } = req.body;
    const updates = {};

    if (code !== undefined) {
      const normalizedCode = code.trim().toUpperCase();
      const duplicateCode = await db('departments')
        .whereRaw('UPPER(code) = ?', [normalizedCode])
        .andWhereNot('id', id)
        .first();

      if (duplicateCode) {
        throw new AppError(
          409,
          'DEPARTMENT_CODE_EXISTS',
          'A department with this code already exists.'
        );
      }
      updates.code = normalizedCode;
    }

    if (name !== undefined) {
      updates.name = name.trim();
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    if (student_requires_college_approval !== undefined) {
      updates.student_requires_college_approval = Boolean(student_requires_college_approval);
    }

    updates.updated_at = db.fn.now();

    const [updatedDepartment] = await db('departments')
      .where({ id })
      .update(updates)
      .returning([...DEPARTMENT_FIELDS, 'created_at', 'updated_at']);

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      action: 'UPDATE',
      entityType: 'department',
      entityId: updatedDepartment.id,
      targetDepartmentId: updatedDepartment.id,
      beforeState: existingDepartment,
      afterState: updatedDepartment,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, updatedDepartment);
  } catch (err) {
    next(err);
  }
}

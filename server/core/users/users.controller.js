import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { env, ROLES } from '../../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from '../audit/audit.service.js';
import { sendSuccess } from '../utils/response.js';
import { AuthService } from '../auth/auth.service.js';

const BCRYPT_SALT_ROUNDS = 12;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOD_MANAGEABLE_ROLES = [ROLES.FACULTY, ROLES.STUDENT];

// Explicit public columns so password_hash is never selected or serialized
const USER_PUBLIC_COLUMNS = [
  'id',
  'department_id',
  'email',
  'employee_or_roll_no',
  'full_name',
  'role',
  'is_active',
  'can_manage_dept_users',
  'can_coordinate_student_approvals',
  'last_login_at',
  'created_at',
  'updated_at'
];

const QUALIFIED_USER_PUBLIC_COLUMNS = USER_PUBLIC_COLUMNS.map((col) => `users.${col}`);

const assertValidUuid = (id, label = 'user ID') => {
  if (!id || !UUID_REGEX.test(id)) {
    throw new AppError(400, 'INVALID_ID', `Invalid ${label} format.`);
  }
};

/**
 * Enforces strict boundaries when an authorized HOD (can_manage_dept_users === true)
 * creates or mutates users: department-locked and restricted to faculty/student roles.
 */
const assertActorCanManageTarget = (actor, targetUser) => {
  if (actor.role === ROLES.SUPER_ADMIN) {
    return;
  }

  if (actor.role !== ROLES.HOD || actor.can_manage_dept_users !== true) {
    throw new AppError(
      403,
      'USER_MANAGEMENT_NOT_GRANTED',
      'You do not have permission to manage user accounts.'
    );
  }

  if (targetUser.department_id !== actor.department_id) {
    throw new AppError(
      403,
      'DEPARTMENT_ACCESS_DENIED',
      'HODs may only manage users within their assigned department.'
    );
  }

  if (!HOD_MANAGEABLE_ROLES.includes(targetUser.role)) {
    throw new AppError(
      403,
      'ROLE_MANAGEMENT_FORBIDDEN',
      'HODs may only manage faculty and student accounts.'
    );
  }
};

/**
 * GET /
 * List users with pagination, department scope enforcement, and optional filters.
 */
export async function listUsers(req, res, next) {
  try {
    const {
      page,
      limit,
      role,
      department_id,
      search,
      is_active,
      sortBy,
      sortOrder
    } = req.query;

    const baseQuery = db('users');

    if (req.user.role !== ROLES.SUPER_ADMIN) {
      // HODs are strictly constrained to their own department
      const scopedDeptId = req.departmentScope || req.user.department_id;
      baseQuery.where('users.department_id', scopedDeptId);
    } else {
      const adminDeptFilter = req.departmentScope || department_id;
      if (adminDeptFilter) {
        baseQuery.where('users.department_id', adminDeptFilter);
      }
    }

    if (role) {
      baseQuery.where('users.role', role);
    }

    if (typeof is_active === 'boolean') {
      baseQuery.where('users.is_active', is_active);
    }

    if (search && search.trim()) {
      const pattern = `%${search.trim().toLowerCase()}%`;
      baseQuery.where(function () {
        this.whereRaw('LOWER(users.full_name) LIKE ?', [pattern])
          .orWhereRaw('LOWER(users.email) LIKE ?', [pattern])
          .orWhereRaw('LOWER(users.employee_or_roll_no) LIKE ?', [pattern]);
      });
    }

    const countResult = await baseQuery.clone().count('users.id as count').first();
    const total = parseInt(countResult?.count || 0, 10);
    const offset = (page - 1) * limit;

    const users = await baseQuery
      .clone()
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .select(
        ...QUALIFIED_USER_PUBLIC_COLUMNS,
        'departments.code as department_code',
        'departments.name as department_name'
      )
      .orderBy(`users.${sortBy}`, sortOrder)
      .limit(limit)
      .offset(offset);

    return sendSuccess(res, users, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /:id
 * Fetch a single user by ID. HODs may only view users within their own department.
 */
export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const user = await db('users')
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .where('users.id', id)
      .select(
        ...QUALIFIED_USER_PUBLIC_COLUMNS,
        'departments.code as department_code',
        'departments.name as department_name'
      )
      .first();

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && user.department_id !== req.user.department_id) {
      throw new AppError(
        403,
        'DEPARTMENT_ACCESS_DENIED',
        'You do not have access to users in another department.'
      );
    }

    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /
 * Create a new user account (Super Admin, or authorized HOD for dept faculty/students).
 */
export async function createUser(req, res, next) {
  try {
    const {
      email,
      employee_or_roll_no,
      full_name,
      role,
      department_id,
      password,
      can_manage_dept_users,
      can_coordinate_student_approvals
    } = req.body;

    if (!Object.values(ROLES).includes(role)) {
      throw new AppError(400, 'INVALID_ROLE', 'Invalid user role specified.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN) {
      assertActorCanManageTarget(req.user, { department_id, role });
      if (can_manage_dept_users !== undefined) {
        throw new AppError(
          403,
          'FORBIDDEN_PERMISSION_ESCALATION',
          'Only Super Admin may configure user management delegation.'
        );
      }
    }

    const department = await db('departments').where({ id: department_id }).first();
    if (!department) {
      throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingEmail = await db('users')
      .whereRaw('LOWER(email) = ?', [normalizedEmail])
      .first();
    if (existingEmail) {
      throw new AppError(409, 'EMAIL_EXISTS', 'A user with this email already exists.');
    }

    const normalizedIdentifier = employee_or_roll_no.trim();
    const existingIdentifier = await db('users')
      .where({ employee_or_roll_no: normalizedIdentifier })
      .first();
    if (existingIdentifier) {
      throw new AppError(
        409,
        'EMPLOYEE_NO_EXISTS',
        'A user with this employee or roll number already exists.'
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const allowDeptUserMgmt =
      req.user.role === ROLES.SUPER_ADMIN && role === ROLES.HOD
        ? Boolean(can_manage_dept_users)
        : false;
    const allowStudentCoordinator =
      role === ROLES.FACULTY ? Boolean(can_coordinate_student_approvals) : false;

    const [createdUser] = await db('users')
      .insert({
        id: uuidv4(),
        department_id,
        email: normalizedEmail,
        employee_or_roll_no: normalizedIdentifier,
        full_name: full_name.trim(),
        role,
        password_hash: passwordHash,
        is_active: true,
        can_manage_dept_users: allowDeptUserMgmt,
        can_coordinate_student_approvals: allowStudentCoordinator
      })
      .returning(USER_PUBLIC_COLUMNS);

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      action: 'CREATE',
      entityType: 'user',
      entityId: createdUser.id,
      targetDepartmentId: createdUser.department_id,
      afterState: createdUser,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, createdUser, null, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /:id
 * Update user profile, role, department, status, or password
 * (Super Admin globally, or authorized HOD for dept faculty/students).
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existingUser = await db('users')
      .where({ id })
      .select(USER_PUBLIC_COLUMNS)
      .first();

    if (!existingUser) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    assertActorCanManageTarget(req.user, existingUser);

    const {
      email,
      employee_or_roll_no,
      full_name,
      role,
      department_id,
      password,
      is_active,
      can_manage_dept_users,
      can_coordinate_student_approvals
    } = req.body;

    if (is_active === false && id === req.user.id) {
      throw new AppError(
        400,
        'SELF_DEACTIVATION_NOT_ALLOWED',
        'You cannot deactivate your own account.'
      );
    }

    if (req.user.role !== ROLES.SUPER_ADMIN) {
      if (role !== undefined && !HOD_MANAGEABLE_ROLES.includes(role)) {
        throw new AppError(
          403,
          'ROLE_MANAGEMENT_FORBIDDEN',
          'HODs may only assign faculty or student roles.'
        );
      }
      if (department_id !== undefined && department_id !== req.user.department_id) {
        throw new AppError(
          403,
          'DEPARTMENT_ACCESS_DENIED',
          'HODs cannot reassign users to another department.'
        );
      }
      if (can_manage_dept_users !== undefined) {
        throw new AppError(
          403,
          'FORBIDDEN_PERMISSION_ESCALATION',
          'Only Super Admin may modify HOD user management permissions.'
        );
      }
    }

    const updates = {};

    if (role !== undefined) {
      if (!Object.values(ROLES).includes(role)) {
        throw new AppError(400, 'INVALID_ROLE', 'Invalid user role specified.');
      }
      updates.role = role;
      if (role !== ROLES.HOD) {
        updates.can_manage_dept_users = false;
      }
      if (role !== ROLES.FACULTY) {
        updates.can_coordinate_student_approvals = false;
      }
    }

    if (can_manage_dept_users !== undefined && req.user.role === ROLES.SUPER_ADMIN) {
      const targetRole = updates.role || existingUser.role;
      updates.can_manage_dept_users =
        targetRole === ROLES.HOD ? Boolean(can_manage_dept_users) : false;
    }

    if (can_coordinate_student_approvals !== undefined) {
      const targetRole = updates.role || existingUser.role;
      updates.can_coordinate_student_approvals =
        targetRole === ROLES.FACULTY ? Boolean(can_coordinate_student_approvals) : false;
    }

    if (department_id !== undefined) {
      const department = await db('departments').where({ id: department_id }).first();
      if (!department) {
        throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
      }
      updates.department_id = department_id;
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      const duplicateEmail = await db('users')
        .whereRaw('LOWER(email) = ?', [normalizedEmail])
        .andWhereNot('id', id)
        .first();
      if (duplicateEmail) {
        throw new AppError(409, 'EMAIL_EXISTS', 'A user with this email already exists.');
      }
      updates.email = normalizedEmail;
    }

    if (employee_or_roll_no !== undefined) {
      const normalizedIdentifier = employee_or_roll_no.trim();
      const duplicateIdentifier = await db('users')
        .where({ employee_or_roll_no: normalizedIdentifier })
        .andWhereNot('id', id)
        .first();
      if (duplicateIdentifier) {
        throw new AppError(
          409,
          'EMPLOYEE_NO_EXISTS',
          'A user with this employee or roll number already exists.'
        );
      }
      updates.employee_or_roll_no = normalizedIdentifier;
    }

    if (full_name !== undefined) {
      updates.full_name = full_name.trim();
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    if (password !== undefined) {
      updates.password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    }

    updates.updated_at = db.fn.now();

    let updatedUser;
    await db.transaction(async (trx) => {
      const [row] = await trx('users')
        .where({ id })
        .update(updates)
        .returning(USER_PUBLIC_COLUMNS);
      updatedUser = row;

      // Revoke active sessions if credentials, role, department, or status changed
      if (
        password !== undefined ||
        is_active === false ||
        role !== undefined ||
        department_id !== undefined
      ) {
        await trx('refresh_tokens')
          .where({ user_id: id, is_revoked: false })
          .update({ is_revoked: true });
      }
    });

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      action: 'UPDATE',
      entityType: 'user',
      entityId: updatedUser.id,
      targetDepartmentId: updatedUser.department_id,
      beforeState: existingUser,
      afterState: updatedUser,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, updatedUser);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /:id
 * Soft-deactivate a user and revoke all active refresh tokens
 * (Super Admin, or authorized HOD for dept faculty/students).
 */
export async function deactivateUser(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    if (id === req.user.id) {
      throw new AppError(
        400,
        'SELF_DEACTIVATION_NOT_ALLOWED',
        'You cannot deactivate your own account.'
      );
    }

    const existingUser = await db('users')
      .where({ id })
      .select(USER_PUBLIC_COLUMNS)
      .first();

    if (!existingUser) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    assertActorCanManageTarget(req.user, existingUser);

    let deactivatedUser;
    await db.transaction(async (trx) => {
      const [row] = await trx('users')
        .where({ id })
        .update({
          is_active: false,
          updated_at: db.fn.now()
        })
        .returning(USER_PUBLIC_COLUMNS);
      deactivatedUser = row;

      await trx('refresh_tokens')
        .where({ user_id: id, is_revoked: false })
        .update({ is_revoked: true });
    });

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      action: 'DEACTIVATE',
      entityType: 'user',
      entityId: deactivatedUser.id,
      targetDepartmentId: deactivatedUser.department_id,
      beforeState: existingUser,
      afterState: deactivatedUser,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, deactivatedUser);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /:id/reset-access
 * Reset a user's access by revoking active sessions, setting a temporary password,
 * or generating a single-use password reset link.
 */
export async function resetUserAccess(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existingUser = await db('users')
      .where({ id })
      .select(USER_PUBLIC_COLUMNS)
      .first();

    if (!existingUser) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    assertActorCanManageTarget(req.user, existingUser);

    const { mode, temporaryPassword, activateAccount } = req.body;
    const passwordHash =
      mode === 'temporary_password'
        ? await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS)
        : null;

    let updatedUser = existingUser;
    let resetTokenMeta = null;

    await db.transaction(async (trx) => {
      const userUpdates = { updated_at: trx.fn.now() };
      if (passwordHash) {
        userUpdates.password_hash = passwordHash;
      }
      if (activateAccount === true) {
        userUpdates.is_active = true;
      }

      const [row] = await trx('users')
        .where({ id })
        .update(userUpdates)
        .returning(USER_PUBLIC_COLUMNS);
      updatedUser = row;

      await trx('refresh_tokens')
        .where({ user_id: id, is_revoked: false })
        .update({ is_revoked: true });

      if (mode === 'reset_link') {
        resetTokenMeta = await AuthService.createPasswordResetToken(id, req.user.id, trx);
      }
    });

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      action: 'RESET_USER_ACCESS',
      entityType: 'user',
      entityId: updatedUser.id,
      targetDepartmentId: updatedUser.department_id,
      beforeState: existingUser,
      afterState: {
        ...updatedUser,
        reset_mode: mode,
        sessions_revoked: true
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    const responsePayload = {
      user: updatedUser,
      mode,
      sessionsRevoked: true,
      message:
        mode === 'revoke_sessions'
          ? 'All active user sessions have been revoked.'
          : mode === 'temporary_password'
            ? 'Temporary password set and all active sessions revoked.'
            : 'One-time password reset link generated and active sessions revoked.'
    };

    if (resetTokenMeta) {
      const clientOrigin = env.CORS_ORIGIN.split(',')[0].trim();
      responsePayload.resetToken = resetTokenMeta.rawToken;
      responsePayload.resetUrl = `${clientOrigin}/reset-password?token=${resetTokenMeta.rawToken}`;
      responsePayload.expiresAt = resetTokenMeta.expiresAt;
    }

    return sendSuccess(res, responsePayload);
  } catch (err) {
    next(err);
  }
}

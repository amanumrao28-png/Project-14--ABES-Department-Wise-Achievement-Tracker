import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import Joi from 'joi';

import app from '../../app.js';
import { env, ROLES } from '../../config/env.js';
import {
  requireRole,
  requireSuperAdmin,
  requireHODOrAbove,
  requireFacultyOrAbove,
  requireDeptUserManagerOrSuperAdmin
} from '../../core/middleware/authorize.js';
import {
  requireDepartmentAccess,
  injectDepartmentScope
} from '../../core/middleware/departmentScope.js';
import { requireSelfApprovalBlock } from '../../core/middleware/ownershipGuard.js';
import { validate } from '../../core/middleware/validate.js';
import {
  canAccessUserManagement,
  canMutateTargetUser,
  getManageableRolesForActor,
  getSafePostLoginDestination,
  isPathAllowedForUser
} from '../../../client/src/core/rbac/permissions.js';
import { getNavigationForUser } from '../../../client/src/core/rbac/navigationConfig.js';
import { createUser } from '../../core/users/users.controller.js';
import { resetAccessSchema } from '../../core/users/users.validators.js';
import {
  forgotPasswordSchema,
  resetPasswordSchema
} from '../../core/auth/auth.validators.js';
import { createDeptAchievementSchema } from '../../modules/department-tracker/dept.validators.js';
import { createFacultyAchievementSchema } from '../../modules/faculty-tracker/faculty.validators.js';
import { createStudentAchievementSchema } from '../../modules/student-tracker/student.validators.js';

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    locals: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function runMiddleware(mw, req) {
  return new Promise((resolve) => {
    const res = createMockRes();
    let nextCalled = false;
    let nextErr = null;
    const next = (err) => {
      nextCalled = true;
      nextErr = err || null;
      resolve({ nextCalled, nextErr, res });
    };
    Promise.resolve(mw(req, res, next)).then(() => {
      if (!nextCalled) {
        resolve({ nextCalled: false, nextErr: null, res });
      }
    });
  });
}

async function withServer(fn) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('Unauthenticated direct API access returns HTTP 401 across all protected routes', async () => {
  await withServer(async (baseUrl) => {
    const protectedEndpoints = [
      ['GET', '/auth/me'],
      ['POST', '/auth/logout'],
      ['POST', '/auth/change-password'],
      ['GET', '/users'],
      ['POST', '/users'],
      ['PATCH', '/users/11111111-1111-4111-8111-111111111111'],
      ['DELETE', '/users/11111111-1111-4111-8111-111111111111'],
      ['POST', '/users/11111111-1111-4111-8111-111111111111/reset-access'],
      ['GET', '/departments'],
      ['POST', '/departments'],
      ['GET', '/audit-logs']
    ];

    for (const [method, path] of protectedEndpoints) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'GET' ? undefined : JSON.stringify({})
      });
      assert.equal(response.status, 401, `${method} ${path} should return 401`);
      const json = await response.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'AUTHENTICATION_REQUIRED');
    }
  });
});

test('Expired and tampered JWT tokens return HTTP 401', async () => {
  await withServer(async (baseUrl) => {
    const expiredToken = jwt.sign(
      { sub: '11111111-1111-4111-8111-111111111111', role: ROLES.STUDENT },
      env.JWT_ACCESS_SECRET,
      { expiresIn: -10 }
    );
    const expiredRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert.equal(expiredRes.status, 401);
    const expiredJson = await expiredRes.json();
    assert.equal(expiredJson.error.code, 'TOKEN_EXPIRED');

    const badTokenRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: 'Bearer not.a.valid.jwt' }
    });
    assert.equal(badTokenRes.status, 401);
    const badJson = await badTokenRes.json();
    assert.equal(badJson.error.code, 'INVALID_TOKEN');
  });
});

test('Role authorization guards return 401 when unauthenticated and 403 for forbidden roles', async () => {
  const unauth = await runMiddleware(requireSuperAdmin(), {});
  assert.equal(unauth.nextCalled, false);
  assert.equal(unauth.res.statusCode, 401);

  const studentReq = { user: { id: 'u1', role: ROLES.STUDENT, department_id: 'd1' } };
  const facultyReq = { user: { id: 'u2', role: ROLES.FACULTY, department_id: 'd1' } };
  const hodReq = { user: { id: 'u3', role: ROLES.HOD, department_id: 'd1', can_manage_dept_users: false } };
  const hodDelegatedReq = { user: { id: 'u4', role: ROLES.HOD, department_id: 'd1', can_manage_dept_users: true } };
  const adminReq = { user: { id: 'u5', role: ROLES.SUPER_ADMIN, department_id: 'd1' } };

  assert.equal((await runMiddleware(requireSuperAdmin(), hodDelegatedReq)).res.statusCode, 403);
  assert.equal((await runMiddleware(requireSuperAdmin(), adminReq)).nextCalled, true);

  assert.equal((await runMiddleware(requireHODOrAbove(), facultyReq)).res.statusCode, 403);
  assert.equal((await runMiddleware(requireHODOrAbove(), studentReq)).res.statusCode, 403);
  assert.equal((await runMiddleware(requireHODOrAbove(), hodReq)).nextCalled, true);

  assert.equal((await runMiddleware(requireFacultyOrAbove(), studentReq)).res.statusCode, 403);
  assert.equal((await runMiddleware(requireFacultyOrAbove(), facultyReq)).nextCalled, true);

  // Delegated HOD user management check
  const hodDenied = await runMiddleware(requireDeptUserManagerOrSuperAdmin(), hodReq);
  assert.equal(hodDenied.res.statusCode, 403);
  assert.equal(hodDenied.res.body.error.code, 'USER_MANAGEMENT_NOT_GRANTED');

  assert.equal((await runMiddleware(requireDeptUserManagerOrSuperAdmin(), hodDelegatedReq)).nextCalled, true);
  assert.equal((await runMiddleware(requireDeptUserManagerOrSuperAdmin(), adminReq)).nextCalled, true);
  assert.equal((await runMiddleware(requireDeptUserManagerOrSuperAdmin(), facultyReq)).res.statusCode, 403);
  assert.equal((await runMiddleware(requireRole(ROLES.SUPER_ADMIN), studentReq)).res.statusCode, 403);
});

test('Department scope middleware isolates non-Super-Admin users to assigned department', async () => {
  const crossDeptReq = {
    user: { id: 'u3', role: ROLES.HOD, department_id: 'dept-cs' },
    params: { departmentId: 'dept-it' },
    query: {},
    body: {}
  };
  const blocked = await runMiddleware(requireDepartmentAccess, crossDeptReq);
  assert.equal(blocked.nextCalled, false);
  assert.equal(blocked.res.statusCode, 403);
  assert.equal(blocked.res.body.error.code, 'DEPARTMENT_ACCESS_DENIED');

  // injectDepartmentScope forcibly overrides client query attempts for non-Super-Admin
  const spoofReq = {
    user: { id: 'u3', role: ROLES.HOD, department_id: 'dept-cs' },
    query: { departmentId: 'dept-it' }
  };
  const injected = await runMiddleware(injectDepartmentScope, spoofReq);
  assert.equal(injected.nextCalled, true);
  assert.equal(spoofReq.departmentScope, 'dept-cs');

  const adminFilterReq = {
    user: { id: 'u5', role: ROLES.SUPER_ADMIN, department_id: 'dept-cs' },
    query: { departmentId: 'dept-it' }
  };
  const adminInjected = await runMiddleware(injectDepartmentScope, adminFilterReq);
  assert.equal(adminInjected.nextCalled, true);
  assert.equal(adminFilterReq.departmentScope, 'dept-it');
});

test('Self-approval block enforces maker-checker isolation', async () => {
  const selfReq = {
    user: { id: 'fac-1', role: ROLES.HOD, department_id: 'dept-cs' },
    resource: { id: 'ach-1', owner_user_id: 'fac-1' },
    body: {}
  };
  const blocked = await runMiddleware(requireSelfApprovalBlock, selfReq);
  assert.equal(blocked.nextCalled, false);
  assert.equal(blocked.res.statusCode, 403);
  assert.equal(blocked.res.body.error.code, 'SELF_APPROVAL_BLOCKED');
});

test('Input validation strips unpermitted fields like department_id and computed_score', async () => {
  const schema = Joi.object({ title: Joi.string().required() });
  const req = {
    body: {
      title: 'Hackathon Winner',
      computed_score: 9999,
      workflow_status: 'approved',
      department_id: 'spoofed-dept'
    }
  };
  const result = await runMiddleware(validate(schema), req);
  assert.equal(result.nextCalled, true);
  assert.deepEqual(req.body, { title: 'Hackathon Winner' });
});

test('Frontend RBAC permissions & navigation strictly hide unauthorized dashboards and links', () => {
  const superAdmin = { role: ROLES.SUPER_ADMIN, department_id: 'd1', can_manage_dept_users: false };
  const hodPlain = { role: ROLES.HOD, department_id: 'd1', can_manage_dept_users: false };
  const hodDelegated = { role: ROLES.HOD, department_id: 'd1', can_manage_dept_users: true };
  const faculty = { role: ROLES.FACULTY, department_id: 'd1', can_manage_dept_users: false };
  const student = { role: ROLES.STUDENT, department_id: 'd1', can_manage_dept_users: false };

  // Navigation items strictly scoped
  assert.deepEqual(
    getNavigationForUser(student).flatMap((s) => s.items.map((i) => i.to)),
    [
      '/student/dashboard',
      '/student/achievements',
      '/student/achievements/new',
      '/student/competitions',
      '/student/internships',
      '/student/placements',
      '/student/portfolio',
      '/student/reports',
      '/student/insights'
    ]
  );
  assert.deepEqual(
    getNavigationForUser(faculty).flatMap((s) => s.items.map((i) => i.to)),
    [
      '/faculty/dashboard',
      '/faculty/achievements',
      '/faculty/achievements/new',
      '/faculty/portfolio',
      '/faculty/department-students',
      '/faculty/leaderboards',
      '/faculty/reports',
      '/faculty/insights'
    ]
  );
  assert.deepEqual(
    getNavigationForUser(hodPlain).flatMap((s) => s.items.map((i) => i.to)),
    [
      '/department/dashboard',
      '/department/department-tracker',
      '/department/faculty-tracker',
      '/department/student-tracker',
      '/department/leaderboards',
      '/department/reports',
      '/department/insights'
    ]
  );
  assert.deepEqual(
    getNavigationForUser(hodDelegated).flatMap((s) => s.items.map((i) => i.to)),
    [
      '/department/dashboard',
      '/department/users',
      '/department/department-tracker',
      '/department/faculty-tracker',
      '/department/student-tracker',
      '/department/leaderboards',
      '/department/reports',
      '/department/insights'
    ]
  );
  assert.deepEqual(
    getNavigationForUser(superAdmin).flatMap((s) => s.items.map((i) => i.to)),
    [
      '/college/dashboard',
      '/college/users',
      '/college/departments',
      '/college/department-tracker',
      '/college/faculty-tracker',
      '/college/student-tracker',
      '/college/leaderboards',
      '/college/reports',
      '/college/insights'
    ]
  );

  // Route access checks
  assert.equal(isPathAllowedForUser(student, '/faculty/dashboard'), false);
  assert.equal(isPathAllowedForUser(student, '/department/dashboard'), false);
  assert.equal(isPathAllowedForUser(student, '/college/dashboard'), false);
  assert.equal(isPathAllowedForUser(faculty, '/department/dashboard'), false);
  assert.equal(isPathAllowedForUser(faculty, '/college/users'), false);
  assert.equal(isPathAllowedForUser(hodPlain, '/department/users'), false);
  assert.equal(isPathAllowedForUser(hodDelegated, '/department/users'), true);
  assert.equal(isPathAllowedForUser(hodDelegated, '/college/dashboard'), false);

  // User management mutation boundaries
  assert.equal(canAccessUserManagement(hodPlain), false);
  assert.equal(canAccessUserManagement(hodDelegated), true);
  assert.deepEqual(getManageableRolesForActor(hodDelegated), [ROLES.FACULTY, ROLES.STUDENT]);
  assert.equal(
    canMutateTargetUser(hodDelegated, { department_id: 'd1', role: ROLES.FACULTY }),
    true
  );
  assert.equal(
    canMutateTargetUser(hodDelegated, { department_id: 'd1', role: ROLES.HOD }),
    false
  );
  assert.equal(
    canMutateTargetUser(hodDelegated, { department_id: 'd2', role: ROLES.STUDENT }),
    false
  );
});

test('Post-login role redirect routes each role to its authorized dashboard and blocks unsafe redirects', () => {
  const admin = { role: ROLES.SUPER_ADMIN, department_id: 'd1', can_manage_dept_users: false };
  const hod = { role: ROLES.HOD, department_id: 'd1', can_manage_dept_users: false };
  const faculty = { role: ROLES.FACULTY, department_id: 'd1', can_manage_dept_users: false };
  const student = { role: ROLES.STUDENT, department_id: 'd1', can_manage_dept_users: false };

  assert.equal(getSafePostLoginDestination(admin, null), '/college/dashboard');
  assert.equal(getSafePostLoginDestination(hod, null), '/department/dashboard');
  assert.equal(getSafePostLoginDestination(faculty, null), '/faculty/dashboard');
  assert.equal(getSafePostLoginDestination(student, null), '/student/dashboard');

  // If a student had navigated to /college/users before login, redirect back to /student/dashboard instead of 403
  assert.equal(getSafePostLoginDestination(student, '/college/users'), '/student/dashboard');
  assert.equal(getSafePostLoginDestination(admin, '/college/users'), '/college/users');
});

test('Delegated HOD createUser controller rejects HOD creation, cross-dept creation, and delegation escalation', async () => {
  const hodDelegated = {
    id: 'hod-1',
    role: ROLES.HOD,
    department_id: 'dept-cs',
    can_manage_dept_users: true
  };

  const captureNextError = async (body) => {
    let capturedErr = null;
    await createUser(
      { user: hodDelegated, body, ip: '127.0.0.1', get: () => 'test' },
      createMockRes(),
      (err) => {
        capturedErr = err;
      }
    );
    return capturedErr;
  };

  const roleEscalationErr = await captureNextError({
    email: 'newhod@abes.ac.in',
    employee_or_roll_no: 'EMP-99',
    full_name: 'Another HOD',
    role: ROLES.HOD,
    department_id: 'dept-cs',
    password: 'Strong@123'
  });
  assert.equal(roleEscalationErr.statusCode, 403);
  assert.equal(roleEscalationErr.code, 'ROLE_MANAGEMENT_FORBIDDEN');

  const crossDeptErr = await captureNextError({
    email: 'fac@abes.ac.in',
    employee_or_roll_no: 'EMP-100',
    full_name: 'Other Dept Faculty',
    role: ROLES.FACULTY,
    department_id: 'dept-it',
    password: 'Strong@123'
  });
  assert.equal(crossDeptErr.statusCode, 403);
  assert.equal(crossDeptErr.code, 'DEPARTMENT_ACCESS_DENIED');

  const permEscalationErr = await captureNextError({
    email: 'fac2@abes.ac.in',
    employee_or_roll_no: 'EMP-101',
    full_name: 'Dept Faculty',
    role: ROLES.FACULTY,
    department_id: 'dept-cs',
    password: 'Strong@123',
    can_manage_dept_users: true
  });
  assert.equal(permEscalationErr.statusCode, 403);
  assert.equal(permEscalationErr.code, 'FORBIDDEN_PERMISSION_ESCALATION');
});

test('Auth password reset and admin reset-access validators enforce strong password rules', () => {
  assert.ok(forgotPasswordSchema.validate({ email: 'ADMIN@ABES.AC.IN' }).value.email === 'admin@abes.ac.in');

  const weakReset = resetPasswordSchema.validate({
    token: 'a'.repeat(64),
    newPassword: 'weak'
  });
  assert.ok(weakReset.error);

  const missingTempPw = resetAccessSchema.validate({ mode: 'temporary_password' });
  assert.ok(missingTempPw.error);

  const validResetLink = resetAccessSchema.validate({ mode: 'reset_link', activateAccount: true });
  assert.equal(validResetLink.error, undefined);
});

test('Unauthenticated access to all three achievement tracker endpoints returns HTTP 401', async () => {
  await withServer(async (baseUrl) => {
    const trackerRoutes = [
      ['GET', '/department-achievements'],
      ['GET', '/department-achievements/categories'],
      ['POST', '/department-achievements'],
      ['GET', '/faculty-achievements'],
      ['GET', '/faculty-achievements/portfolio'],
      ['POST', '/faculty-achievements'],
      ['GET', '/student-achievements'],
      ['GET', '/student-achievements/portfolio'],
      ['POST', '/student-achievements']
    ];

    for (const [method, path] of trackerRoutes) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'GET' ? undefined : JSON.stringify({})
      });
      assert.equal(response.status, 401, `${method} ${path} must reject unauthenticated callers`);
    }
  });
});

test('Independent tracker role boundaries block cross-tracker privilege leakage', async () => {
  const facultyReq = { user: { id: 'f1', role: ROLES.FACULTY, department_id: 'd1' } };
  const studentReq = { user: { id: 's1', role: ROLES.STUDENT, department_id: 'd1' } };
  const hodReq = { user: { id: 'h1', role: ROLES.HOD, department_id: 'd1' } };

  // Student write guard blocks Faculty (must remain strictly read-only on student tracker)
  const facultyWriteStudent = await runMiddleware(
    requireRole(ROLES.STUDENT, ROLES.SUPER_ADMIN),
    facultyReq
  );
  assert.equal(facultyWriteStudent.res.statusCode, 403);

  // Student review guard blocks Faculty
  const facultyApproveStudent = await runMiddleware(requireHODOrAbove(), facultyReq);
  assert.equal(facultyApproveStudent.res.statusCode, 403);

  // Department tracker blocks Faculty & Student; review blocks HOD
  assert.equal((await runMiddleware(requireHODOrAbove(), studentReq)).res.statusCode, 403);
  assert.equal((await runMiddleware(requireSuperAdmin(), hodReq)).res.statusCode, 403);

  // Faculty tracker blocks Student
  assert.equal((await runMiddleware(requireFacultyOrAbove(), studentReq)).res.statusCode, 403);
});

test('Each tracker validates its own submission payload independently', () => {
  const baseValid = {
    category_id: '11111111-1111-4111-8111-111111111111',
    title: 'Sample Valid Achievement Title',
    description: 'Detailed institutional verifiable achievement description.',
    achieved_on: '2026-02-15',
    achievement_level: 'national',
    organization: 'AICTE India',
    academic_year: '2025-26',
    collaborators_json: [{ name: 'Dr. Collaborator', role: 'Co-Author', identifier: 'EMP-12' }]
  };

  assert.equal(createDeptAchievementSchema.validate(baseValid).error, undefined);
  assert.equal(createFacultyAchievementSchema.validate(baseValid).error, undefined);
  assert.equal(createStudentAchievementSchema.validate(baseValid).error, undefined);

  const badAy = { ...baseValid, academic_year: '2025' };
  assert.ok(createDeptAchievementSchema.validate(badAy).error);
  assert.ok(createFacultyAchievementSchema.validate(badAy).error);
  assert.ok(createStudentAchievementSchema.validate(badAy).error);
});

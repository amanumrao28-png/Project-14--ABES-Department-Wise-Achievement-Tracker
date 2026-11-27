import test from 'node:test';
import assert from 'node:assert/strict';

import { ROLES } from '../../config/env.js';
import { isRoleAllowedOnPortal } from '../../core/auth/auth.controller.js';
import { loginSchema } from '../../core/auth/auth.validators.js';
import {
  requireAuthenticated,
  requireDeptUserManagerOrSuperAdmin,
  requireFacultyOrAbove,
  requireHODOrAbove,
  requireSuperAdmin
} from '../../core/middleware/authorize.js';

function runGuard(mw, user) {
  return new Promise((resolve) => {
    const req = user ? { user } : {};
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
      resolve({ nextCalled, res });
    });
    setTimeout(() => {
      if (!nextCalled) resolve({ nextCalled, res });
    }, 5);
  });
}

test('Portal login matrix isolates Student, Faculty, and HOD while allowing Super Admin across all 4 portals', () => {
  // Student
  assert.equal(isRoleAllowedOnPortal(ROLES.STUDENT, 'student'), true);
  assert.equal(isRoleAllowedOnPortal(ROLES.STUDENT, 'faculty'), false);
  assert.equal(isRoleAllowedOnPortal(ROLES.STUDENT, 'hod'), false);
  assert.equal(isRoleAllowedOnPortal(ROLES.STUDENT, 'super_admin'), false);

  // Faculty
  assert.equal(isRoleAllowedOnPortal(ROLES.FACULTY, 'student'), false);
  assert.equal(isRoleAllowedOnPortal(ROLES.FACULTY, 'faculty'), true);
  assert.equal(isRoleAllowedOnPortal(ROLES.FACULTY, 'hod'), false);
  assert.equal(isRoleAllowedOnPortal(ROLES.FACULTY, 'super_admin'), false);

  // HOD
  assert.equal(isRoleAllowedOnPortal(ROLES.HOD, 'student'), false);
  assert.equal(isRoleAllowedOnPortal(ROLES.HOD, 'faculty'), false);
  assert.equal(isRoleAllowedOnPortal(ROLES.HOD, 'hod'), true);
  assert.equal(isRoleAllowedOnPortal(ROLES.HOD, 'super_admin'), false);

  // Super Admin allowed across all 4 portals
  assert.equal(isRoleAllowedOnPortal(ROLES.SUPER_ADMIN, 'student'), true);
  assert.equal(isRoleAllowedOnPortal(ROLES.SUPER_ADMIN, 'faculty'), true);
  assert.equal(isRoleAllowedOnPortal(ROLES.SUPER_ADMIN, 'hod'), true);
  assert.equal(isRoleAllowedOnPortal(ROLES.SUPER_ADMIN, 'super_admin'), true);
});

test('Login validator accepts valid portal identifiers and rejects invalid portals', () => {
  for (const portal of ['student', 'faculty', 'hod', 'super_admin']) {
    const valid = loginSchema.validate({
      email: 'user@abes.ac.in',
      password: 'Password@123',
      portal
    });
    assert.equal(valid.error, undefined);
  }

  const invalid = loginSchema.validate({
    email: 'user@abes.ac.in',
    password: 'Password@123',
    portal: 'root_admin'
  });
  assert.ok(invalid.error);
});

test('Backend RBAC guards enforce strict 4-portal API separation regardless of origin', async () => {
  const student = { id: 's1', role: ROLES.STUDENT, department_id: 'd1' };
  const faculty = { id: 'f1', role: ROLES.FACULTY, department_id: 'd1' };
  const hod = { id: 'h1', role: ROLES.HOD, department_id: 'd1', can_manage_dept_users: false };
  const admin = { id: 'a1', role: ROLES.SUPER_ADMIN, department_id: 'd1' };

  // Student API access
  assert.equal((await runGuard(requireAuthenticated(), student)).nextCalled, true);
  assert.equal((await runGuard(requireFacultyOrAbove(), student)).res.statusCode, 403);
  assert.equal((await runGuard(requireHODOrAbove(), student)).res.statusCode, 403);
  assert.equal((await runGuard(requireSuperAdmin(), student)).res.statusCode, 403);

  // Faculty API access
  assert.equal((await runGuard(requireFacultyOrAbove(), faculty)).nextCalled, true);
  assert.equal((await runGuard(requireHODOrAbove(), faculty)).res.statusCode, 403);
  assert.equal((await runGuard(requireDeptUserManagerOrSuperAdmin(), faculty)).res.statusCode, 403);

  // HOD API access
  assert.equal((await runGuard(requireHODOrAbove(), hod)).nextCalled, true);
  assert.equal((await runGuard(requireSuperAdmin(), hod)).res.statusCode, 403);

  // Super Admin API access
  assert.equal((await runGuard(requireSuperAdmin(), admin)).nextCalled, true);
  assert.equal((await runGuard(requireHODOrAbove(), admin)).nextCalled, true);
  assert.equal((await runGuard(requireFacultyOrAbove(), admin)).nextCalled, true);
  assert.equal((await runGuard(requireAuthenticated(), admin)).nextCalled, true);
});

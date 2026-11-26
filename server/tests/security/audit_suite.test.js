import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

import app from '../../app.js';
import { ROLES, WORKFLOW_STATUSES } from '../../config/env.js';
import {
  requireFacultyOrAbove,
  requireHODOrAbove,
  requireRole,
  requireSuperAdmin
} from '../../core/middleware/authorize.js';
import {
  injectDepartmentScope,
  requireDepartmentAccess
} from '../../core/middleware/departmentScope.js';
import { savePrivateEvidenceFile, deletePrivateEvidenceFile } from '../../core/storage/privateStorage.js';
import { shapeSingleTrackerAnalytics } from '../../core/utils/analyticsShape.js';
import { calculateDepartmentScore } from '../../modules/department-tracker/dept.scoring.js';
import { calculateFacultyScore } from '../../modules/faculty-tracker/faculty.scoring.js';
import { calculateStudentScore } from '../../modules/student-tracker/student.scoring.js';
import { getNavigationForUser } from '../../../client/src/core/rbac/navigationConfig.js';
import { isPathAllowedForUser } from '../../../client/src/core/rbac/permissions.js';

function runMiddleware(mw, req) {
  return new Promise((resolve) => {
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

function createMockKnex(tableResponses = {}) {
  return (tableName) => {
    const row = tableResponses[tableName] || null;
    const chain = {
      where() { return chain; },
      whereIn() { return chain; },
      orderByRaw() { return chain; },
      orderBy() { return chain; },
      first: async () => row
    };
    return chain;
  };
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

test('Authorization matrix covers all 8 strict cross-role and cross-department scenarios', async () => {
  const student = { id: 'stu-1', role: ROLES.STUDENT, department_id: 'dept-cs' };
  const faculty = { id: 'fac-1', role: ROLES.FACULTY, department_id: 'dept-cs' };
  const hod = { id: 'hod-1', role: ROLES.HOD, department_id: 'dept-cs' };
  const superAdmin = { id: 'adm-1', role: ROLES.SUPER_ADMIN, department_id: 'dept-cs' };

  // 1. Student attempts to access faculty achievements
  assert.equal((await runMiddleware(requireFacultyOrAbove(), { user: student })).res.statusCode, 403);
  assert.equal(isPathAllowedForUser(student, '/faculty/achievements'), false);

  // 2. Student attempts to access department achievements
  assert.equal((await runMiddleware(requireHODOrAbove(), { user: student })).res.statusCode, 403);
  assert.equal(isPathAllowedForUser(student, '/department/department-tracker'), false);

  // 3. Faculty attempts to access another faculty's personal dashboard/route
  assert.equal(isPathAllowedForUser(faculty, '/department/faculty-tracker'), false);
  assert.equal(isPathAllowedForUser(faculty, '/college/faculty-tracker'), false);

  // 4. Faculty attempts to access department achievements
  assert.equal((await runMiddleware(requireHODOrAbove(), { user: faculty })).res.statusCode, 403);
  assert.equal(isPathAllowedForUser(faculty, '/department/dashboard'), false);

  // 5. Faculty accesses student records from another department -> blocked
  const facCrossDept = await runMiddleware(requireDepartmentAccess, {
    user: faculty,
    params: { departmentId: 'dept-ec' },
    query: {},
    body: {}
  });
  assert.equal(facCrossDept.res.statusCode, 403);

  // 6. HOD attempts to access another department -> blocked
  const hodCrossDept = await runMiddleware(requireDepartmentAccess, {
    user: hod,
    params: {},
    query: { departmentId: 'dept-me' },
    body: {}
  });
  assert.equal(hodCrossDept.res.statusCode, 403);

  // 7. HOD accesses faculty and student records from their own department -> allowed
  const hodOwnFaculty = await runMiddleware(requireFacultyOrAbove(), { user: hod });
  const hodOwnDept = await runMiddleware(injectDepartmentScope, { user: hod, query: {} });
  assert.equal(hodOwnFaculty.nextCalled, true);
  assert.equal(hodOwnDept.nextCalled, true);
  assert.equal(hodOwnDept.nextErr, null);

  // 8. Super Admin accesses every tracker
  assert.equal((await runMiddleware(requireSuperAdmin(), { user: superAdmin })).nextCalled, true);
  assert.equal((await runMiddleware(requireHODOrAbove(), { user: superAdmin })).nextCalled, true);
  assert.equal((await runMiddleware(requireFacultyOrAbove(), { user: superAdmin })).nextCalled, true);
  assert.equal((await runMiddleware(requireRole(ROLES.SUPER_ADMIN), { user: superAdmin })).nextCalled, true);
});

test('Scoring engines are strictly isolated per tracker and unapproved statuses never affect verified statistics', async () => {
  const deptMock = createMockKnex({
    dept_categories: { code: 'DEPT_ACCREDITATION' },
    dept_scoring_rules: { base_points: 100, rule_version: 2 }
  });
  const facMock = createMockKnex({
    faculty_categories: { code: 'FACULTY_PUBLICATION' },
    faculty_scoring_rules: { base_points: 50, rule_version: 1 }
  });
  const stuMock = createMockKnex({
    student_categories: { code: 'STUDENT_HACKATHON' },
    student_scoring_rules: { base_points: 40, rule_version: 1 }
  });

  const deptScore = await calculateDepartmentScore(
    { category_id: 'c1', achievement_level: 'international', academic_year: '2025-26', details_json: { validity_years: 6 } },
    deptMock
  );
  const facScore = await calculateFacultyScore(
    { category_id: 'c2', achievement_level: 'international', academic_year: '2025-26', details_json: { indexing: 'SCI', impact_factor: 4.2 } },
    facMock
  );
  const stuScore = await calculateStudentScore(
    { category_id: 'c3', achievement_level: 'national', academic_year: '2025-26', details_json: { position_or_rank: 'Winner' } },
    stuMock
  );

  assert.equal(deptScore.computedScore, 140);
  assert.equal(facScore.computedScore, 85);
  assert.equal(stuScore.computedScore, 65);

  const shaped = shapeSingleTrackerAnalytics([
    { category_id: 'c1', academic_year: '2025-26', achieved_on: '2025-09-01', workflow_status: WORKFLOW_STATUSES.DRAFT, computed_score: 50 },
    { category_id: 'c1', academic_year: '2025-26', achieved_on: '2025-09-02', workflow_status: WORKFLOW_STATUSES.SUBMITTED, computed_score: 50 },
    { category_id: 'c1', academic_year: '2025-26', achieved_on: '2025-09-03', workflow_status: WORKFLOW_STATUSES.UNDER_REVIEW, computed_score: 50 },
    { category_id: 'c1', academic_year: '2025-26', achieved_on: '2025-09-04', workflow_status: WORKFLOW_STATUSES.CHANGES_REQUESTED, computed_score: 50 },
    { category_id: 'c1', academic_year: '2025-26', achieved_on: '2025-09-05', workflow_status: WORKFLOW_STATUSES.DEPARTMENT_APPROVED, computed_score: 50 },
    { category_id: 'c1', academic_year: '2025-09-06', achieved_on: '2025-09-06', workflow_status: WORKFLOW_STATUSES.REJECTED, computed_score: 50 },
    { category_id: 'c1', academic_year: '2025-26', achieved_on: '2025-09-07', workflow_status: WORKFLOW_STATUSES.COLLEGE_APPROVED, computed_score: 85 }
  ]);

  assert.equal(shaped.summary.total_count, 7);
  assert.equal(shaped.summary.verified_count, 1);
  assert.equal(shaped.summary.verified_score, 85);
});

test('Private evidence upload rejects spoofed magic bytes and path traversal, and stores valid PDFs with SHA-256', async () => {
  await assert.rejects(
    () =>
      savePrivateEvidenceFile({
        trackerFolder: '../escape',
        departmentId: 'dept1',
        achievementId: 'ach1',
        file: { originalname: 'test.pdf', buffer: Buffer.from('%PDF-1.4\n...') }
      }),
    (err) => err.code === 'INVALID_STORAGE_SEGMENT'
  );

  await assert.rejects(
    () =>
      savePrivateEvidenceFile({
        trackerFolder: 'faculty',
        departmentId: 'dept1',
        achievementId: 'ach1',
        file: { originalname: 'malware.pdf', buffer: Buffer.from('MZ\x90\x00\x03\x00\x00\x00') }
      }),
    (err) => err.code === 'INVALID_FILE_SIGNATURE'
  );

  const saved = await savePrivateEvidenceFile({
    trackerFolder: 'faculty',
    departmentId: 'dept1',
    achievementId: 'ach1',
    file: { originalname: 'certificate.pdf', buffer: Buffer.from('%PDF-1.4\nValid Certificate') }
  });
  assert.equal(saved.mimeType, 'application/pdf');
  assert.equal(saved.sha256Hash.length, 64);
  await deletePrivateEvidenceFile(saved.storageObjectKey);
});

test('Public passport endpoint rejects malformed UUIDs with HTTP 400', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/public/passport/not-a-valid-uuid`);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, 'INVALID_ID');
  });
});

test('Navigation icons and route wiring match AppShell ICON_MAP and App.jsx routes', async () => {
  const appShellSource = await fs.readFile(
    path.resolve(process.cwd(), '../client/src/shared/components/AppShell.jsx'),
    'utf8'
  );
  const appJsxSource = await fs.readFile(
    path.resolve(process.cwd(), '../client/src/App.jsx'),
    'utf8'
  );

  const roles = [
    { role: ROLES.SUPER_ADMIN },
    { role: ROLES.HOD, can_manage_dept_users: true },
    { role: ROLES.FACULTY },
    { role: ROLES.STUDENT }
  ];

  for (const actor of roles) {
    const sections = getNavigationForUser(actor);
    for (const section of sections) {
      for (const item of section.items) {
        assert.ok(
          appShellSource.includes(`'${item.icon}'`) || appShellSource.includes(`${item.icon}:`),
          `Missing icon mapping in AppShell.jsx for "${item.icon}"`
        );
        assert.ok(
          appJsxSource.includes(`path="${item.to}"`),
          `Missing Route in App.jsx for "${item.to}"`
        );
      }
    }
  }
});

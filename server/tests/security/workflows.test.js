import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import app from '../../app.js';
import db from '../../config/database.js';
import { ROLES, WORKFLOW_STATUSES } from '../../config/env.js';
import { resolveDepartmentTransition } from '../../modules/department-tracker/dept.workflow.js';
import { resolveFacultyTransition } from '../../modules/faculty-tracker/faculty.workflow.js';
import { resolveStudentTransition } from '../../modules/student-tracker/student.workflow.js';
import { shapeSingleTrackerAnalytics } from '../../core/utils/analyticsShape.js';
import { extractCertificateFields } from '../../core/ocr/ocr.service.js';

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

test('Department workflow enforces college management exclusivity and separation of duties', () => {
  const superAdmin = { id: 'admin-1', role: ROLES.SUPER_ADMIN, department_id: 'd1' };
  const hod = { id: 'hod-1', role: ROLES.HOD, department_id: 'd1' };

  assert.throws(
    () =>
      resolveDepartmentTransition({
        actor: hod,
        record: { created_by_user_id: 'hod-2', workflow_status: WORKFLOW_STATUSES.SUBMITTED },
        decision: WORKFLOW_STATUSES.COLLEGE_APPROVED
      }),
    (err) => err.statusCode === 403 && err.code === 'INSUFFICIENT_APPROVAL_AUTHORITY'
  );

  assert.throws(
    () =>
      resolveDepartmentTransition({
        actor: superAdmin,
        record: { created_by_user_id: 'admin-1', workflow_status: WORKFLOW_STATUSES.SUBMITTED },
        decision: WORKFLOW_STATUSES.COLLEGE_APPROVED
      }),
    (err) => err.statusCode === 403 && err.code === 'SELF_APPROVAL_BLOCKED'
  );

  const underReview = resolveDepartmentTransition({
    actor: superAdmin,
    record: { created_by_user_id: 'hod-1', workflow_status: WORKFLOW_STATUSES.SUBMITTED },
    decision: WORKFLOW_STATUSES.UNDER_REVIEW
  });
  assert.equal(underReview.nextStatus, WORKFLOW_STATUSES.UNDER_REVIEW);
  assert.equal(underReview.isFinalVerified, false);

  const approved = resolveDepartmentTransition({
    actor: superAdmin,
    record: { created_by_user_id: 'hod-1', workflow_status: WORKFLOW_STATUSES.UNDER_REVIEW },
    decision: WORKFLOW_STATUSES.COLLEGE_APPROVED
  });
  assert.equal(approved.nextStatus, WORKFLOW_STATUSES.COLLEGE_APPROVED);
  assert.equal(approved.isFinalVerified, true);

  const returned = resolveDepartmentTransition({
    actor: superAdmin,
    record: { created_by_user_id: 'hod-1', workflow_status: WORKFLOW_STATUSES.UNDER_REVIEW },
    decision: WORKFLOW_STATUSES.CHANGES_REQUESTED
  });
  assert.equal(returned.clearScore, true);
});

test('Faculty workflow enforces two-stage HOD -> College Management approval and self-approval block', () => {
  const hod = { id: 'hod-1', role: ROLES.HOD, department_id: 'd1' };
  const superAdmin = { id: 'admin-1', role: ROLES.SUPER_ADMIN, department_id: 'd1' };
  const facultyRecord = {
    owner_user_id: 'fac-1',
    department_id: 'd1',
    workflow_status: WORKFLOW_STATUSES.SUBMITTED
  };

  // HOD cannot self-approve own personal submission
  assert.throws(
    () =>
      resolveFacultyTransition({
        actor: hod,
        record: { ...facultyRecord, owner_user_id: 'hod-1' },
        decision: WORKFLOW_STATUSES.DEPARTMENT_APPROVED
      }),
    (err) => err.statusCode === 403 && err.code === 'SELF_APPROVAL_BLOCKED'
  );

  // HOD cannot review another department
  assert.throws(
    () =>
      resolveFacultyTransition({
        actor: hod,
        record: { ...facultyRecord, department_id: 'd2' },
        decision: WORKFLOW_STATUSES.DEPARTMENT_APPROVED
      }),
    (err) => err.statusCode === 403 && err.code === 'DEPARTMENT_ACCESS_DENIED'
  );

  // HOD approves at department stage, but cannot grant college_approved
  const deptApproved = resolveFacultyTransition({
    actor: hod,
    record: facultyRecord,
    decision: WORKFLOW_STATUSES.DEPARTMENT_APPROVED
  });
  assert.equal(deptApproved.nextStatus, WORKFLOW_STATUSES.DEPARTMENT_APPROVED);
  assert.equal(deptApproved.isFinalVerified, false);

  assert.throws(
    () =>
      resolveFacultyTransition({
        actor: hod,
        record: { ...facultyRecord, workflow_status: WORKFLOW_STATUSES.DEPARTMENT_APPROVED },
        decision: WORKFLOW_STATUSES.COLLEGE_APPROVED
      }),
    (err) => err.statusCode === 403 && err.code === 'INSUFFICIENT_APPROVAL_AUTHORITY'
  );

  // College management finalizes verification
  const collegeApproved = resolveFacultyTransition({
    actor: superAdmin,
    record: { ...facultyRecord, workflow_status: WORKFLOW_STATUSES.DEPARTMENT_APPROVED },
    decision: WORKFLOW_STATUSES.COLLEGE_APPROVED
  });
  assert.equal(collegeApproved.nextStatus, WORKFLOW_STATUSES.COLLEGE_APPROVED);
  assert.equal(collegeApproved.isFinalVerified, true);
});

test('Student workflow supports Faculty Coordinator, HOD, and configurable College finalization', () => {
  const plainFaculty = {
    id: 'fac-1',
    role: ROLES.FACULTY,
    department_id: 'd1',
    can_coordinate_student_approvals: false
  };
  const coordinator = {
    id: 'fac-2',
    role: ROLES.FACULTY,
    department_id: 'd1',
    can_coordinate_student_approvals: true
  };
  const hod = { id: 'hod-1', role: ROLES.HOD, department_id: 'd1' };
  const superAdmin = { id: 'admin-1', role: ROLES.SUPER_ADMIN, department_id: 'd1' };
  const studentRecord = {
    owner_user_id: 'stu-1',
    department_id: 'd1',
    workflow_status: WORKFLOW_STATUSES.SUBMITTED
  };

  // Regular faculty cannot approve student records
  assert.throws(
    () =>
      resolveStudentTransition({
        actor: plainFaculty,
        record: studentRecord,
        decision: WORKFLOW_STATUSES.DEPARTMENT_APPROVED
      }),
    (err) => err.statusCode === 403 && err.code === 'INSUFFICIENT_APPROVAL_AUTHORITY'
  );

  // Faculty coordinator can approve up to department_approved, not college_approved
  const coordResult = resolveStudentTransition({
    actor: coordinator,
    record: studentRecord,
    decision: WORKFLOW_STATUSES.DEPARTMENT_APPROVED
  });
  assert.equal(coordResult.nextStatus, WORKFLOW_STATUSES.DEPARTMENT_APPROVED);
  assert.equal(coordResult.isFinalVerified, false);

  assert.throws(
    () =>
      resolveStudentTransition({
        actor: coordinator,
        record: { ...studentRecord, workflow_status: WORKFLOW_STATUSES.DEPARTMENT_APPROVED },
        decision: WORKFLOW_STATUSES.COLLEGE_APPROVED
      }),
    (err) => err.statusCode === 403 && err.code === 'INSUFFICIENT_APPROVAL_AUTHORITY'
  );

  // HOD finalizes when department config allows HOD final approval
  const hodFinal = resolveStudentTransition({
    actor: hod,
    record: { ...studentRecord, workflow_status: WORKFLOW_STATUSES.DEPARTMENT_APPROVED },
    decision: WORKFLOW_STATUSES.COLLEGE_APPROVED,
    departmentConfig: { student_requires_college_approval: false }
  });
  assert.equal(hodFinal.nextStatus, WORKFLOW_STATUSES.COLLEGE_APPROVED);
  assert.equal(hodFinal.isFinalVerified, true);

  // When department requires college management approval, HOD is blocked from finalizing
  assert.throws(
    () =>
      resolveStudentTransition({
        actor: hod,
        record: { ...studentRecord, workflow_status: WORKFLOW_STATUSES.DEPARTMENT_APPROVED },
        decision: WORKFLOW_STATUSES.COLLEGE_APPROVED,
        departmentConfig: { student_requires_college_approval: true }
      }),
    (err) => err.statusCode === 403 && err.code === 'COLLEGE_APPROVAL_REQUIRED'
  );

  const adminFinal = resolveStudentTransition({
    actor: superAdmin,
    record: { ...studentRecord, workflow_status: WORKFLOW_STATUSES.DEPARTMENT_APPROVED },
    decision: WORKFLOW_STATUSES.COLLEGE_APPROVED,
    departmentConfig: { student_requires_college_approval: true }
  });
  assert.equal(adminFinal.isFinalVerified, true);
});

test('Notifications endpoints require authentication (HTTP 401)', async () => {
  await withServer(async (baseUrl) => {
    const res1 = await fetch(`${baseUrl}/notifications`);
    assert.equal(res1.status, 401);

    const res2 = await fetch(`${baseUrl}/notifications/read-all`, { method: 'POST' });
    assert.equal(res2.status, 401);
  });
});

test('Analytics endpoints require authentication (HTTP 401)', async () => {
  await withServer(async (baseUrl) => {
    const endpoints = [
      '/department-achievements/analytics',
      '/faculty-achievements/analytics',
      '/student-achievements/analytics'
    ];
    for (const path of endpoints) {
      const res = await fetch(`${baseUrl}${path}`);
      assert.equal(res.status, 401, `${path} must reject unauthenticated callers`);
    }
  });
});

test('shapeSingleTrackerAnalytics counts only college_approved records toward verified_score', () => {
  const shaped = shapeSingleTrackerAnalytics([
    {
      category_id: 'c1',
      category_code: 'FACULTY_PUBLICATION',
      category_name: 'Research Publications',
      academic_year: '2025-26',
      achieved_on: '2026-01-15',
      workflow_status: WORKFLOW_STATUSES.COLLEGE_APPROVED,
      computed_score: 75
    },
    {
      category_id: 'c1',
      category_code: 'FACULTY_PUBLICATION',
      category_name: 'Research Publications',
      academic_year: '2025-26',
      achieved_on: '2026-01-15',
      workflow_status: WORKFLOW_STATUSES.DEPARTMENT_APPROVED,
      computed_score: 50
    },
    {
      category_id: 'c2',
      category_code: 'FACULTY_PATENT',
      category_name: 'Patents',
      academic_year: '2024-25',
      achieved_on: '2025-03-10',
      workflow_status: WORKFLOW_STATUSES.SUBMITTED,
      computed_score: null
    }
  ]);

  assert.equal(shaped.summary.total_count, 3);
  assert.equal(shaped.summary.verified_count, 1);
  assert.equal(shaped.summary.pending_count, 2);
  assert.equal(shaped.summary.verified_score, 75);
  assert.equal(shaped.calendar_heatmap.find((d) => d.date === '2026-01-15')?.count, 2);
  assert.equal(shaped.by_year.length, 2);
  assert.equal(shaped.monthly_trend.length, 2);
});

test('Public showcase endpoint is mounted without auth requirement (never 401/404)', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/public/showcase`);
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 404);
  });
});

test('AI/innovation endpoints require authentication (401 without token)', async () => {
  await withServer(async (baseUrl) => {
    const postEndpoints = ['/ocr/extract', '/duplicates/check'];
    for (const ep of postEndpoints) {
      const res = await fetch(`${baseUrl}${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(res.status, 401, `Expected 401 for POST ${ep}`);
    }

    const getEndpoints = [
      '/leaderboards/departments',
      '/leaderboards/faculty',
      '/leaderboards/students',
      '/reports/department',
      '/reports/faculty',
      '/reports/student',
      '/reports/college-consolidated',
      '/insights/department',
      '/insights/faculty',
      '/insights/student',
      '/insights/college',
      '/public/passport/privacy/me'
    ];
    for (const ep of getEndpoints) {
      const res = await fetch(`${baseUrl}${ep}`);
      assert.equal(res.status, 401, `Expected 401 for GET ${ep}`);
    }
  });
});

test('OCR extraction parses certificate fields and never marks extraction as authentic', () => {
  const sample = `
    Certificate of Excellence
    This is to certify that Dr. Ananya Sharma has completed
    Title: International Conference on AI Systems
    Issued by: IEEE Computer Society
    Date: 15 March 2025
    Certificate No: CERT-IEEE-2025-881
  `;
  const result = extractCertificateFields({ text: sample });

  assert.equal(result.is_authentic, false);
  assert.equal(result.verification_status, 'unverified_advisory_only');
  assert.equal(result.extracted.recipient_name, 'Dr. Ananya Sharma');
  assert.equal(result.extracted.organization, 'IEEE Computer Society');
  assert.equal(result.extracted.achieved_on, '2025-03-15');
  assert.equal(result.extracted.certificate_number, 'CERT-IEEE-2025-881');
  assert.ok(result.extracted.achievement_title);
});

test.after(async () => {
  await db.destroy();
});

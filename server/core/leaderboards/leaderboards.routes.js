import { Router } from 'express';
import db from '../../config/database.js';
import { ROLES, WORKFLOW_STATUSES } from '../../config/env.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireFacultyOrAbove, requireHODOrAbove } from '../middleware/authorize.js';
import { sendError, sendSuccess } from '../utils/response.js';

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveScopedDepartment(req, res) {
  const requested = req.query.department_id || req.query.departmentId || null;
  if (requested && !UUID_REGEX.test(String(requested))) {
    sendError(res, 400, 'INVALID_ID', 'Invalid department ID format.');
    return { blocked: true };
  }
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    if (requested && requested !== req.user.department_id) {
      sendError(res, 403, 'DEPARTMENT_ACCESS_DENIED', "You do not have access to another department's leaderboard.");
      return { blocked: true };
    }
    return { blocked: false, departmentId: req.user.department_id };
  }
  return { blocked: false, departmentId: requested };
}

/**
 * GET /api/v1/leaderboards/departments
 * Independent Department Leaderboard using ONLY verified (college_approved) department achievements.
 * Never combines scores from faculty or student trackers.
 */
router.get('/departments', authenticate, requireHODOrAbove(), async (req, res, next) => {
  try {
    const { academic_year } = req.query;
    const scope = resolveScopedDepartment(req, res);
    if (scope.blocked) return undefined;

    const query = db('departments as d')
      .leftJoin('dept_achievements as a', function joinVerifiedDept() {
        this.on('d.id', '=', 'a.department_id').andOnVal(
          'a.workflow_status',
          '=',
          WORKFLOW_STATUSES.COLLEGE_APPROVED
        );
        if (academic_year) {
          this.andOnVal('a.academic_year', '=', String(academic_year));
        }
      })
      .where('d.is_active', true);

    if (scope.departmentId) {
      query.where('d.id', scope.departmentId);
    }

    const rows = await query
      .groupBy('d.id', 'd.code', 'd.name')
      .select(
        'd.id as department_id',
        'd.code as department_code',
        'd.name as department_name',
        db.raw('COUNT(a.id)::int as verified_count'),
        db.raw('COALESCE(SUM(a.computed_score), 0)::float as total_score')
      )
      .orderBy('total_score', 'desc')
      .orderBy('verified_count', 'desc')
      .orderBy('d.name', 'asc');

    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      ...row
    }));

    return sendSuccess(res, {
      tracker_domain: 'department',
      academic_year: academic_year || 'all',
      verified_only: true,
      leaderboard
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/leaderboards/faculty
 * Independent Faculty Leaderboard using ONLY verified (college_approved) faculty achievements.
 * Never combines scores from department or student trackers.
 */
router.get('/faculty', authenticate, requireFacultyOrAbove(), async (req, res, next) => {
  try {
    const { academic_year } = req.query;
    const scope = resolveScopedDepartment(req, res);
    if (scope.blocked) return undefined;
    const scopedDeptId = scope.departmentId;

    const query = db('users as u')
      .join('departments as d', 'u.department_id', 'd.id')
      .leftJoin('faculty_achievements as a', function joinVerifiedFaculty() {
        this.on('u.id', '=', 'a.owner_user_id').andOnVal(
          'a.workflow_status',
          '=',
          WORKFLOW_STATUSES.COLLEGE_APPROVED
        );
        if (academic_year) {
          this.andOnVal('a.academic_year', '=', String(academic_year));
        }
      })
      .where('u.role', ROLES.FACULTY)
      .where('u.is_active', true);

    if (scopedDeptId) {
      query.where('u.department_id', scopedDeptId);
    }

    const rows = await query
      .groupBy('u.id', 'u.full_name', 'u.employee_or_roll_no', 'd.id', 'd.code', 'd.name')
      .select(
        'u.id as user_id',
        'u.full_name',
        'u.employee_or_roll_no',
        'd.id as department_id',
        'd.code as department_code',
        'd.name as department_name',
        db.raw('COUNT(a.id)::int as verified_count'),
        db.raw('COALESCE(SUM(a.computed_score), 0)::float as total_score')
      )
      .orderBy('total_score', 'desc')
      .orderBy('verified_count', 'desc')
      .orderBy('u.full_name', 'asc')
      .limit(50);

    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      ...row
    }));

    return sendSuccess(res, {
      tracker_domain: 'faculty',
      academic_year: academic_year || 'all',
      department_id: scopedDeptId || 'all',
      verified_only: true,
      leaderboard
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/leaderboards/students
 * Independent Student Leaderboard using ONLY verified (college_approved) student achievements.
 * Never combines scores from department or faculty trackers.
 */
router.get('/students', authenticate, requireFacultyOrAbove(), async (req, res, next) => {
  try {
    const { academic_year } = req.query;
    const scope = resolveScopedDepartment(req, res);
    if (scope.blocked) return undefined;
    const scopedDeptId = scope.departmentId;

    const query = db('users as u')
      .join('departments as d', 'u.department_id', 'd.id')
      .leftJoin('student_achievements as a', function joinVerifiedStudent() {
        this.on('u.id', '=', 'a.owner_user_id').andOnVal(
          'a.workflow_status',
          '=',
          WORKFLOW_STATUSES.COLLEGE_APPROVED
        );
        if (academic_year) {
          this.andOnVal('a.academic_year', '=', String(academic_year));
        }
      })
      .where('u.role', ROLES.STUDENT)
      .where('u.is_active', true);

    if (scopedDeptId) {
      query.where('u.department_id', scopedDeptId);
    }

    const rows = await query
      .groupBy('u.id', 'u.full_name', 'u.employee_or_roll_no', 'd.id', 'd.code', 'd.name')
      .select(
        'u.id as user_id',
        'u.full_name',
        'u.employee_or_roll_no',
        'd.id as department_id',
        'd.code as department_code',
        'd.name as department_name',
        db.raw('COUNT(a.id)::int as verified_count'),
        db.raw('COALESCE(SUM(a.computed_score), 0)::float as total_score')
      )
      .orderBy('total_score', 'desc')
      .orderBy('verified_count', 'desc')
      .orderBy('u.full_name', 'asc')
      .limit(50);

    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      ...row
    }));

    return sendSuccess(res, {
      tracker_domain: 'student',
      academic_year: academic_year || 'all',
      department_id: scopedDeptId || 'all',
      verified_only: true,
      leaderboard
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

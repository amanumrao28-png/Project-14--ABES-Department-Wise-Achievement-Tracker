import { Router } from 'express';
import db from '../../config/database.js';
import { ROLES, WORKFLOW_STATUSES } from '../../config/env.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAuthenticated } from '../middleware/authorize.js';
import { sendError, sendSuccess } from '../utils/response.js';

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/public/showcase
 * Public read-only summary exposing ONLY verified (`college_approved`) aggregate counts
 * and non-sensitive showcase highlights. Never exposes drafts, pending items, or private PII.
 */
router.get('/showcase', async (req, res, next) => {
  try {
    const verified = WORKFLOW_STATUSES.COLLEGE_APPROVED;

    const [
      departments,
      deptCountRow,
      facultyCountRow,
      studentCountRow,
      deptHighlights,
      facultyHighlights,
      studentHighlights
    ] = await Promise.all([
      db('departments')
        .where({ is_active: true })
        .select('id', 'code', 'name')
        .orderBy('name', 'asc'),
      db('dept_achievements').where({ workflow_status: verified }).count('id as count').first(),
      db('faculty_achievements').where({ workflow_status: verified }).count('id as count').first(),
      db('student_achievements').where({ workflow_status: verified }).count('id as count').first(),
      db('dept_achievements')
        .leftJoin('dept_categories', 'dept_achievements.category_id', 'dept_categories.id')
        .leftJoin('departments', 'dept_achievements.department_id', 'departments.id')
        .where('dept_achievements.workflow_status', verified)
        .select(
          'dept_achievements.id',
          'dept_achievements.title',
          'dept_achievements.organization',
          'dept_achievements.achievement_level',
          'dept_achievements.academic_year',
          'dept_achievements.achieved_on',
          'dept_achievements.approved_at',
          'dept_categories.name as category_name',
          'departments.code as department_code',
          'departments.name as department_name'
        )
        .orderBy('dept_achievements.approved_at', 'desc')
        .limit(4),
      db('faculty_achievements')
        .leftJoin('faculty_categories', 'faculty_achievements.category_id', 'faculty_categories.id')
        .leftJoin('departments', 'faculty_achievements.department_id', 'departments.id')
        .where('faculty_achievements.workflow_status', verified)
        .select(
          'faculty_achievements.id',
          'faculty_achievements.title',
          'faculty_achievements.organization',
          'faculty_achievements.achievement_level',
          'faculty_achievements.academic_year',
          'faculty_achievements.achieved_on',
          'faculty_achievements.approved_at',
          'faculty_categories.name as category_name',
          'departments.code as department_code',
          'departments.name as department_name'
        )
        .orderBy('faculty_achievements.approved_at', 'desc')
        .limit(4),
      db('student_achievements')
        .leftJoin('student_categories', 'student_achievements.category_id', 'student_categories.id')
        .leftJoin('departments', 'student_achievements.department_id', 'departments.id')
        .where('student_achievements.workflow_status', verified)
        .select(
          'student_achievements.id',
          'student_achievements.title',
          'student_achievements.organization',
          'student_achievements.achievement_level',
          'student_achievements.academic_year',
          'student_achievements.achieved_on',
          'student_achievements.approved_at',
          'student_categories.name as category_name',
          'departments.code as department_code',
          'departments.name as department_name'
        )
        .orderBy('student_achievements.approved_at', 'desc')
        .limit(4)
    ]);

    const highlights = [
      ...deptHighlights.map((r) => ({ ...r, tracker_domain: 'Department' })),
      ...facultyHighlights.map((r) => ({ ...r, tracker_domain: 'Faculty' })),
      ...studentHighlights.map((r) => ({ ...r, tracker_domain: 'Student' }))
    ]
      .sort((a, b) => new Date(b.approved_at || 0) - new Date(a.approved_at || 0))
      .slice(0, 4);

    return sendSuccess(res, {
      departments,
      counts: {
        active_departments: departments.length,
        verified_department_achievements: parseInt(deptCountRow?.count || 0, 10),
        verified_faculty_achievements: parseInt(facultyCountRow?.count || 0, 10),
        verified_student_achievements: parseInt(studentCountRow?.count || 0, 10)
      },
      highlights
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/public/passport/privacy/me
 * Returns the authenticated user's current Achievement Passport privacy setting.
 */
router.get('/passport/privacy/me', authenticate, requireAuthenticated(), async (req, res, next) => {
  try {
    const row = await db('users')
      .where({ id: req.user.id })
      .select('is_portfolio_public')
      .first();
    return sendSuccess(res, { is_portfolio_public: Boolean(row?.is_portfolio_public) });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/v1/public/passport/privacy
 * Updates the authenticated user's Achievement Passport public visibility setting.
 */
router.patch('/passport/privacy', authenticate, requireAuthenticated(), async (req, res, next) => {
  try {
    const isPublic = Boolean(req.body?.is_portfolio_public);
    await db('users')
      .where({ id: req.user.id })
      .update({ is_portfolio_public: isPublic, updated_at: db.fn.now() });

    return sendSuccess(res, { is_portfolio_public: isPublic });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/public/passport/:userId
 * Public shareable Achievement Passport for Faculty or Student.
 * Strictly returns ONLY verified (college_approved) records and ONLY if is_portfolio_public is true.
 */
router.get('/passport/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!UUID_REGEX.test(userId)) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid passport user ID format.');
    }
    const owner = await db('users as u')
      .join('departments as d', 'u.department_id', 'd.id')
      .where('u.id', userId)
      .where('u.is_active', true)
      .select(
        'u.id',
        'u.full_name',
        'u.role',
        'u.employee_or_roll_no',
        'u.is_portfolio_public',
        'd.code as department_code',
        'd.name as department_name'
      )
      .first();

    if (!owner || ![ROLES.FACULTY, ROLES.STUDENT].includes(owner.role)) {
      return sendError(res, 404, 'PASSPORT_NOT_FOUND', 'Achievement passport not found.');
    }

    if (!owner.is_portfolio_public) {
      return sendError(res, 403, 'PASSPORT_PRIVATE', 'This achievement passport is set to private.');
    }

    const isFaculty = owner.role === ROLES.FACULTY;
    const table = isFaculty ? 'faculty_achievements' : 'student_achievements';
    const catTable = isFaculty ? 'faculty_categories' : 'student_categories';

    const records = await db(`${table} as a`)
      .join(`${catTable} as c`, 'a.category_id', 'c.id')
      .where('a.owner_user_id', owner.id)
      .where('a.workflow_status', WORKFLOW_STATUSES.COLLEGE_APPROVED)
      .select(
        'a.id',
        'a.title',
        'a.organization',
        'a.achieved_on',
        'a.achievement_level',
        'a.academic_year',
        'a.computed_score',
        'c.name as category_name'
      )
      .orderBy('a.achieved_on', 'desc');

    const totalScore = records.reduce((acc, r) => acc + Number(r.computed_score || 0), 0);

    return sendSuccess(res, {
      owner: {
        id: owner.id,
        full_name: owner.full_name,
        role: owner.role,
        identifier: owner.employee_or_roll_no,
        department_code: owner.department_code,
        department_name: owner.department_name
      },
      summary: {
        verified_count: records.length,
        total_verified_score: Number(totalScore.toFixed(2))
      },
      records
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

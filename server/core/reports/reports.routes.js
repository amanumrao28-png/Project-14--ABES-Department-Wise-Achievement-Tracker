import { Router } from 'express';
import db from '../../config/database.js';
import { ROLES, WORKFLOW_STATUSES } from '../../config/env.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  requireAuthenticated,
  requireFacultyOrAbove,
  requireHODOrAbove,
  requireSuperAdmin
} from '../middleware/authorize.js';
import { sendError, sendSuccess } from '../utils/response.js';

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveReportDepartmentScope(req, res) {
  const requested = req.query.department_id || req.query.departmentId || null;
  if (requested && !UUID_REGEX.test(String(requested))) {
    sendError(res, 400, 'INVALID_ID', 'Invalid department ID format.');
    return { blocked: true };
  }
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    if (requested && requested !== req.user.department_id) {
      sendError(res, 403, 'DEPARTMENT_ACCESS_DENIED', "You do not have access to another department's reports.");
      return { blocked: true };
    }
    return { blocked: false, departmentId: req.user.department_id };
  }
  return { blocked: false, departmentId: requested };
}

function buildSectionSummary(records) {
  const byCategory = {};
  const byLevel = {};
  let totalScore = 0;

  for (const r of records) {
    const score = Number(r.computed_score || 0);
    totalScore = Number((totalScore + score).toFixed(2));

    const cat = r.category_name || 'Uncategorized';
    if (!byCategory[cat]) {
      byCategory[cat] = { category: cat, count: 0, score: 0 };
    }
    byCategory[cat].count += 1;
    byCategory[cat].score = Number((byCategory[cat].score + score).toFixed(2));

    const lvl = r.achievement_level || 'institutional';
    if (!byLevel[lvl]) {
      byLevel[lvl] = { level: lvl, count: 0, score: 0 };
    }
    byLevel[lvl].count += 1;
    byLevel[lvl].score = Number((byLevel[lvl].score + score).toFixed(2));
  }

  return {
    verified_count: records.length,
    total_verified_score: totalScore,
    category_breakdown: Object.values(byCategory).sort((a, b) => b.count - a.count),
    level_breakdown: Object.values(byLevel).sort((a, b) => b.count - a.count)
  };
}

/**
 * GET /api/v1/reports/department
 * Department Annual Report — ONLY verified (college_approved) department achievements.
 */
router.get('/department', authenticate, requireHODOrAbove(), async (req, res, next) => {
  try {
    const { academic_year } = req.query;
    const scope = resolveReportDepartmentScope(req, res);
    if (scope.blocked) return undefined;
    const scopedDeptId = scope.departmentId;

    const query = db('dept_achievements as a')
      .join('dept_categories as c', 'a.category_id', 'c.id')
      .join('departments as d', 'a.department_id', 'd.id')
      .where('a.workflow_status', WORKFLOW_STATUSES.COLLEGE_APPROVED);

    if (scopedDeptId) query.where('a.department_id', scopedDeptId);
    if (academic_year) query.where('a.academic_year', String(academic_year));

    const records = await query
      .select(
        'a.id',
        'a.title',
        'a.organization',
        'a.achieved_on',
        'a.achievement_level',
        'a.academic_year',
        'a.computed_score',
        'a.approved_at',
        'c.name as category_name',
        'd.code as department_code',
        'd.name as department_name'
      )
      .orderBy('a.achieved_on', 'desc');

    return sendSuccess(res, {
      report_type: 'department_annual_report',
      tracker_domain: 'department',
      academic_year: academic_year || 'all',
      department_id: scopedDeptId || 'all',
      generated_at: new Date().toISOString(),
      verified_only: true,
      summary: buildSectionSummary(records),
      records
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/reports/faculty
 * Faculty Annual Report — ONLY verified (college_approved) faculty achievements.
 */
router.get('/faculty', authenticate, requireFacultyOrAbove(), async (req, res, next) => {
  try {
    const { academic_year } = req.query;
    const scope = resolveReportDepartmentScope(req, res);
    if (scope.blocked) return undefined;

    const query = db('faculty_achievements as a')
      .join('faculty_categories as c', 'a.category_id', 'c.id')
      .join('departments as d', 'a.department_id', 'd.id')
      .join('users as u', 'a.owner_user_id', 'u.id')
      .where('a.workflow_status', WORKFLOW_STATUSES.COLLEGE_APPROVED);

    if (req.user.role === ROLES.FACULTY) {
      query.where('a.owner_user_id', req.user.id);
    } else if (req.user.role === ROLES.HOD) {
      query.where('a.department_id', req.user.department_id);
    } else if (scope.departmentId) {
      query.where('a.department_id', scope.departmentId);
    }

    if (academic_year) query.where('a.academic_year', String(academic_year));

    const records = await query
      .select(
        'a.id',
        'a.title',
        'a.organization',
        'a.achieved_on',
        'a.achievement_level',
        'a.academic_year',
        'a.computed_score',
        'a.approved_at',
        'c.name as category_name',
        'd.code as department_code',
        'd.name as department_name',
        'u.full_name as owner_name',
        'u.employee_or_roll_no as owner_identifier'
      )
      .orderBy('a.achieved_on', 'desc');

    return sendSuccess(res, {
      report_type: 'faculty_annual_report',
      tracker_domain: 'faculty',
      academic_year: academic_year || 'all',
      generated_at: new Date().toISOString(),
      verified_only: true,
      summary: buildSectionSummary(records),
      records
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/reports/student
 * Student Annual Report — ONLY verified (college_approved) student achievements.
 */
router.get('/student', authenticate, requireAuthenticated(), async (req, res, next) => {
  try {
    const { academic_year } = req.query;
    const scope = resolveReportDepartmentScope(req, res);
    if (scope.blocked) return undefined;

    const query = db('student_achievements as a')
      .join('student_categories as c', 'a.category_id', 'c.id')
      .join('departments as d', 'a.department_id', 'd.id')
      .join('users as u', 'a.owner_user_id', 'u.id')
      .where('a.workflow_status', WORKFLOW_STATUSES.COLLEGE_APPROVED);

    if (req.user.role === ROLES.STUDENT) {
      query.where('a.owner_user_id', req.user.id);
    } else if (req.user.role === ROLES.FACULTY || req.user.role === ROLES.HOD) {
      query.where('a.department_id', req.user.department_id);
    } else if (scope.departmentId) {
      query.where('a.department_id', scope.departmentId);
    }

    if (academic_year) query.where('a.academic_year', String(academic_year));

    const records = await query
      .select(
        'a.id',
        'a.title',
        'a.organization',
        'a.achieved_on',
        'a.achievement_level',
        'a.academic_year',
        'a.computed_score',
        'a.approved_at',
        'c.name as category_name',
        'd.code as department_code',
        'd.name as department_name',
        'u.full_name as owner_name',
        'u.employee_or_roll_no as owner_identifier'
      )
      .orderBy('a.achieved_on', 'desc');

    return sendSuccess(res, {
      report_type: 'student_annual_report',
      tracker_domain: 'student',
      academic_year: academic_year || 'all',
      generated_at: new Date().toISOString(),
      verified_only: true,
      summary: buildSectionSummary(records),
      records
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/reports/college-consolidated
 * Super Admin ONLY. Presents Department, Faculty, and Student verified summaries in
 * strictly separate sections without ever combining their scores.
 */
router.get('/college-consolidated', authenticate, requireSuperAdmin(), async (req, res, next) => {
  try {
    const { academic_year } = req.query;

    const loadDomain = async (table, catTable) => {
      const q = db(`${table} as a`)
        .join(`${catTable} as c`, 'a.category_id', 'c.id')
        .where('a.workflow_status', WORKFLOW_STATUSES.COLLEGE_APPROVED);
      if (academic_year) q.where('a.academic_year', String(academic_year));
      const rows = await q.select('a.achievement_level', 'a.computed_score', 'c.name as category_name');
      return buildSectionSummary(rows);
    };

    const [departmentSection, facultySection, studentSection] = await Promise.all([
      loadDomain('dept_achievements', 'dept_categories'),
      loadDomain('faculty_achievements', 'faculty_categories'),
      loadDomain('student_achievements', 'student_categories')
    ]);

    return sendSuccess(res, {
      report_type: 'college_consolidated_annual_report',
      academic_year: academic_year || 'all',
      generated_at: new Date().toISOString(),
      verified_only: true,
      scores_combined: false,
      sections: {
        department: departmentSection,
        faculty: facultySection,
        student: studentSection
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

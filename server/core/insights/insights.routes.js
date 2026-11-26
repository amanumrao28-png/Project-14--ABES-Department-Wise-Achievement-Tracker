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
import { sendSuccess } from '../utils/response.js';

const router = Router();

/**
 * Generates strictly data-grounded insights from verified historical records.
 * Every insight includes exact supporting metrics from the database.
 */
function buildDataGroundedInsights(domainLabel, rows) {
  if (!rows || rows.length === 0) {
    return [
      {
        id: `${domainLabel}-empty`,
        type: 'coverage_notice',
        title: `No verified ${domainLabel} records available yet`,
        summary: `0 verified (college_approved) ${domainLabel} achievements match the current scope.`,
        metrics: { verified_count: 0 }
      }
    ];
  }

  const insights = [];

  // 1. Academic Year Growth
  const byYear = {};
  for (const r of rows) {
    const ay = r.academic_year || 'Unknown';
    if (!byYear[ay]) byYear[ay] = { count: 0, score: 0 };
    byYear[ay].count += 1;
    byYear[ay].score = Number((byYear[ay].score + Number(r.computed_score || 0)).toFixed(2));
  }
  const years = Object.keys(byYear).sort();
  if (years.length >= 2) {
    const prev = years[years.length - 2];
    const curr = years[years.length - 1];
    const prevCount = byYear[prev].count;
    const currCount = byYear[curr].count;
    const pctChange = prevCount > 0 ? Number((((currCount - prevCount) / prevCount) * 100).toFixed(1)) : 100;
    insights.push({
      id: `${domainLabel}-growth`,
      type: 'achievement_growth',
      title: `Year-over-year ${domainLabel} volume ${pctChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(pctChange)}%`,
      summary: `Verified ${domainLabel} achievements moved from ${prevCount} in ${prev} to ${currCount} in ${curr}.`,
      metrics: {
        previous_year: prev,
        previous_count: prevCount,
        current_year: curr,
        current_count: currCount,
        percent_change: pctChange
      }
    });
  } else {
    const onlyYear = years[0];
    insights.push({
      id: `${domainLabel}-baseline`,
      type: 'achievement_growth',
      title: `${byYear[onlyYear].count} verified ${domainLabel} achievements in ${onlyYear}`,
      summary: `Total verified score in ${onlyYear} is ${byYear[onlyYear].score} points across ${byYear[onlyYear].count} records.`,
      metrics: {
        academic_year: onlyYear,
        verified_count: byYear[onlyYear].count,
        verified_score: byYear[onlyYear].score
      }
    });
  }

  // 2. Category-wise Concentration
  const byCategory = {};
  for (const r of rows) {
    const cat = r.category_name || 'Uncategorized';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (topCategories.length > 0) {
    const [topCat, topCount] = topCategories[0];
    const sharePct = Number(((topCount / rows.length) * 100).toFixed(1));
    insights.push({
      id: `${domainLabel}-category`,
      type: 'category_trend',
      title: `${topCat} leads ${domainLabel} verified activity (${sharePct}%)`,
      summary: `${topCount} of ${rows.length} verified ${domainLabel} achievements belong to ${topCat}.`,
      metrics: {
        top_category: topCat,
        top_category_count: topCount,
        total_verified: rows.length,
        share_percent: sharePct
      }
    });
  }

  // 3. Level Distribution (International / National vs Institutional)
  const highImpactCount = rows.filter((r) =>
    ['international', 'national'].includes(r.achievement_level)
  ).length;
  const highImpactPct = Number(((highImpactCount / rows.length) * 100).toFixed(1));
  insights.push({
    id: `${domainLabel}-impact`,
    type: 'research_and_impact_trend',
    title: `${highImpactPct}% of verified ${domainLabel} records are National or International`,
    summary: `${highImpactCount} out of ${rows.length} verified records achieved National or International recognition.`,
    metrics: {
      national_international_count: highImpactCount,
      total_verified: rows.length,
      share_percent: highImpactPct
    }
  });

  // 4. Department Activity Pattern (when multiple departments present)
  const byDept = {};
  for (const r of rows) {
    if (r.department_code) {
      byDept[r.department_code] = (byDept[r.department_code] || 0) + 1;
    }
  }
  const deptEntries = Object.entries(byDept).sort((a, b) => b[1] - a[1]);
  if (deptEntries.length >= 2) {
    const [topDept, topDeptCount] = deptEntries[0];
    insights.push({
      id: `${domainLabel}-dept-pattern`,
      type: 'department_pattern',
      title: `Department ${topDept} accounts for ${topDeptCount} verified ${domainLabel} records`,
      summary: `Across ${deptEntries.length} active departments, ${topDept} recorded the highest verified volume (${topDeptCount} of ${rows.length}).`,
      metrics: {
        top_department: topDept,
        top_department_count: topDeptCount,
        active_departments: deptEntries.length
      }
    });
  }

  return insights;
}

/**
 * GET /api/v1/insights/department
 */
router.get('/department', authenticate, requireHODOrAbove(), async (req, res, next) => {
  try {
    const query = db('dept_achievements as a')
      .join('dept_categories as c', 'a.category_id', 'c.id')
      .join('departments as d', 'a.department_id', 'd.id')
      .where('a.workflow_status', WORKFLOW_STATUSES.COLLEGE_APPROVED);

    if (req.user.role === ROLES.HOD) {
      query.where('a.department_id', req.user.department_id);
    }

    const rows = await query.select(
      'a.academic_year',
      'a.achievement_level',
      'a.computed_score',
      'c.name as category_name',
      'd.code as department_code'
    );

    return sendSuccess(res, {
      tracker_domain: 'department',
      verified_only: true,
      grounded_in_records: rows.length,
      insights: buildDataGroundedInsights('department', rows)
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/insights/faculty
 */
router.get('/faculty', authenticate, requireFacultyOrAbove(), async (req, res, next) => {
  try {
    const query = db('faculty_achievements as a')
      .join('faculty_categories as c', 'a.category_id', 'c.id')
      .join('departments as d', 'a.department_id', 'd.id')
      .where('a.workflow_status', WORKFLOW_STATUSES.COLLEGE_APPROVED);

    if (req.user.role === ROLES.FACULTY) {
      query.where('a.owner_user_id', req.user.id);
    } else if (req.user.role === ROLES.HOD) {
      query.where('a.department_id', req.user.department_id);
    }

    const rows = await query.select(
      'a.academic_year',
      'a.achievement_level',
      'a.computed_score',
      'c.name as category_name',
      'd.code as department_code'
    );

    return sendSuccess(res, {
      tracker_domain: 'faculty',
      verified_only: true,
      grounded_in_records: rows.length,
      insights: buildDataGroundedInsights('faculty', rows)
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/insights/student
 */
router.get('/student', authenticate, requireAuthenticated(), async (req, res, next) => {
  try {
    const query = db('student_achievements as a')
      .join('student_categories as c', 'a.category_id', 'c.id')
      .join('departments as d', 'a.department_id', 'd.id')
      .where('a.workflow_status', WORKFLOW_STATUSES.COLLEGE_APPROVED);

    if (req.user.role === ROLES.STUDENT) {
      query.where('a.owner_user_id', req.user.id);
    } else if (req.user.role === ROLES.FACULTY || req.user.role === ROLES.HOD) {
      query.where('a.department_id', req.user.department_id);
    }

    const rows = await query.select(
      'a.academic_year',
      'a.achievement_level',
      'a.computed_score',
      'c.name as category_name',
      'd.code as department_code'
    );

    return sendSuccess(res, {
      tracker_domain: 'student',
      verified_only: true,
      grounded_in_records: rows.length,
      insights: buildDataGroundedInsights('student', rows)
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/insights/college
 * Super Admin ONLY. Returns strictly separated insight groups per tracker domain.
 */
router.get('/college', authenticate, requireSuperAdmin(), async (req, res, next) => {
  try {
    const loadRows = (table, catTable) =>
      db(`${table} as a`)
        .join(`${catTable} as c`, 'a.category_id', 'c.id')
        .join('departments as d', 'a.department_id', 'd.id')
        .where('a.workflow_status', WORKFLOW_STATUSES.COLLEGE_APPROVED)
        .select(
          'a.academic_year',
          'a.achievement_level',
          'a.computed_score',
          'c.name as category_name',
          'd.code as department_code'
        );

    const [deptRows, facultyRows, studentRows] = await Promise.all([
      loadRows('dept_achievements', 'dept_categories'),
      loadRows('faculty_achievements', 'faculty_categories'),
      loadRows('student_achievements', 'student_categories')
    ]);

    return sendSuccess(res, {
      tracker_domain: 'college_isolated',
      verified_only: true,
      scores_combined: false,
      groups: {
        department: buildDataGroundedInsights('department', deptRows),
        faculty: buildDataGroundedInsights('faculty', facultyRows),
        student: buildDataGroundedInsights('student', studentRows)
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

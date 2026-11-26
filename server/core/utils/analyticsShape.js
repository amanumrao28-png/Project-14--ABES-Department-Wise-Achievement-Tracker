import { WORKFLOW_STATUSES } from '../../config/env.js';

/**
 * Pure presentation-shaping helper for a single tracker's isolated records.
 * Never combines records or scores across different trackers.
 */
export function shapeSingleTrackerAnalytics(records = []) {
  const statusMap = {
    [WORKFLOW_STATUSES.DRAFT]: 0,
    [WORKFLOW_STATUSES.SUBMITTED]: 0,
    [WORKFLOW_STATUSES.UNDER_REVIEW]: 0,
    [WORKFLOW_STATUSES.CHANGES_REQUESTED]: 0,
    [WORKFLOW_STATUSES.DEPARTMENT_APPROVED]: 0,
    [WORKFLOW_STATUSES.COLLEGE_APPROVED]: 0,
    [WORKFLOW_STATUSES.REJECTED]: 0
  };

  const categoryMap = {};
  const yearMap = {};
  const monthMap = {};
  const heatmapMap = {};

  let verifiedCount = 0;
  let pendingCount = 0;
  let totalVerifiedScore = 0;

  for (const row of records) {
    const status = row.workflow_status;
    if (statusMap[status] !== undefined) {
      statusMap[status] += 1;
    }

    const isVerified = status === WORKFLOW_STATUSES.COLLEGE_APPROVED;
    const isPending = [
      WORKFLOW_STATUSES.SUBMITTED,
      WORKFLOW_STATUSES.UNDER_REVIEW,
      WORKFLOW_STATUSES.DEPARTMENT_APPROVED
    ].includes(status);

    if (isVerified) {
      verifiedCount += 1;
      totalVerifiedScore += Number(row.computed_score || 0);
    }
    if (isPending) {
      pendingCount += 1;
    }

    // Category aggregation
    const catKey = row.category_code || row.category_id || 'OTHER';
    if (!categoryMap[catKey]) {
      categoryMap[catKey] = {
        category_id: row.category_id,
        category_code: row.category_code || 'OTHER',
        category_name: row.category_name || 'Other',
        total_count: 0,
        verified_count: 0,
        verified_score: 0
      };
    }
    categoryMap[catKey].total_count += 1;
    if (isVerified) {
      categoryMap[catKey].verified_count += 1;
      categoryMap[catKey].verified_score = Number(
        (categoryMap[catKey].verified_score + Number(row.computed_score || 0)).toFixed(2)
      );
    }

    // Academic year aggregation
    const ay = row.academic_year || 'Unknown';
    if (!yearMap[ay]) {
      yearMap[ay] = {
        academic_year: ay,
        total_count: 0,
        verified_count: 0,
        verified_score: 0
      };
    }
    yearMap[ay].total_count += 1;
    if (isVerified) {
      yearMap[ay].verified_count += 1;
      yearMap[ay].verified_score = Number(
        (yearMap[ay].verified_score + Number(row.computed_score || 0)).toFixed(2)
      );
    }

    // Date-based monthly trend & daily calendar heatmap
    if (row.achieved_on) {
      const isoDate =
        row.achieved_on instanceof Date
          ? row.achieved_on.toISOString().slice(0, 10)
          : String(row.achieved_on).slice(0, 10);

      if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        heatmapMap[isoDate] = (heatmapMap[isoDate] || 0) + 1;

        const monthKey = isoDate.slice(0, 7);
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = {
            month: monthKey,
            total_count: 0,
            verified_count: 0,
            verified_score: 0
          };
        }
        monthMap[monthKey].total_count += 1;
        if (isVerified) {
          monthMap[monthKey].verified_count += 1;
          monthMap[monthKey].verified_score = Number(
            (monthMap[monthKey].verified_score + Number(row.computed_score || 0)).toFixed(2)
          );
        }
      }
    }
  }

  return {
    summary: {
      total_count: records.length,
      verified_count: verifiedCount,
      pending_count: pendingCount,
      changes_requested_count: statusMap[WORKFLOW_STATUSES.CHANGES_REQUESTED],
      rejected_count: statusMap[WORKFLOW_STATUSES.REJECTED],
      draft_count: statusMap[WORKFLOW_STATUSES.DRAFT],
      verified_score: Number(totalVerifiedScore.toFixed(2))
    },
    by_status: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    by_category: Object.values(categoryMap).sort((a, b) => b.total_count - a.total_count),
    by_year: Object.values(yearMap).sort((a, b) => a.academic_year.localeCompare(b.academic_year)),
    monthly_trend: Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)),
    calendar_heatmap: Object.entries(heatmapMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  };
}

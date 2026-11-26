import db from '../../config/database.js';

const DEFAULT_FACULTY_BASE_WEIGHTS = {
  international: 50,
  national: 35,
  state: 25,
  university: 18,
  institutional: 12
};

/**
 * Independent Faculty Achievement Scoring Engine.
 * Reads ONLY `faculty_scoring_rules` and `faculty_categories` — never shares
 * formulas or points with Department or Student trackers.
 */
export async function calculateFacultyScore(achievement, trxOrDb = db) {
  const category = await trxOrDb('faculty_categories')
    .where({ id: achievement.category_id })
    .first();

  const rule =
    (await trxOrDb('faculty_scoring_rules')
      .where({
        category_id: achievement.category_id,
        achievement_level: achievement.achievement_level,
        is_active: true
      })
      .whereIn('academic_year', [achievement.academic_year, '*'])
      .orderByRaw("CASE WHEN academic_year = '*' THEN 1 ELSE 0 END ASC")
      .orderBy('rule_version', 'desc')
      .first()) || null;

  let score = rule
    ? Number(rule.base_points)
    : DEFAULT_FACULTY_BASE_WEIGHTS[achievement.achievement_level] || 15;

  const details =
    typeof achievement.details_json === 'string'
      ? JSON.parse(achievement.details_json || '{}')
      : achievement.details_json || {};

  // Faculty-specific academic quality modifiers
  if (category?.code === 'FACULTY_PUBLICATION') {
    const indexing = String(details.indexing || '').toLowerCase();
    if (indexing.includes('sci')) score += 25;
    else if (indexing.includes('scopus')) score += 15;
    if (Number(details.impact_factor || 0) >= 3) score += 10;
  } else if (category?.code === 'FACULTY_PATENT') {
    const status = String(details.patent_status || '').toLowerCase();
    if (status === 'granted') score += 35;
    else if (status === 'published') score += 15;
  } else if (category?.code === 'FACULTY_RESEARCH_GRANT') {
    const amountLakhs = Number(details.sanctioned_amount_lakhs || 0);
    if (amountLakhs >= 25) score += 30;
    else if (amountLakhs >= 10) score += 15;
    if (String(details.grant_role || '').toLowerCase() === 'pi') score += 10;
  }

  return {
    computedScore: Number(score.toFixed(2)),
    scoringRuleVersion: rule?.rule_version || 1
  };
}

import db from '../../config/database.js';

const DEFAULT_DEPT_BASE_WEIGHTS = {
  international: 100,
  national: 75,
  state: 55,
  university: 40,
  institutional: 25
};

/**
 * Independent Department Achievement Scoring Engine.
 * Reads ONLY `dept_scoring_rules` and `dept_categories` — never touches
 * Faculty or Student scoring rules or records.
 */
export async function calculateDepartmentScore(achievement, trxOrDb = db) {
  const category = await trxOrDb('dept_categories')
    .where({ id: achievement.category_id })
    .first();

  const rule =
    (await trxOrDb('dept_scoring_rules')
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
    : DEFAULT_DEPT_BASE_WEIGHTS[achievement.achievement_level] || 25;

  const details =
    typeof achievement.details_json === 'string'
      ? JSON.parse(achievement.details_json || '{}')
      : achievement.details_json || {};

  // Department-specific bonus scoring modifiers
  if (category?.code === 'DEPT_ACCREDITATION') {
    const years = Number(details.validity_years || 0);
    if (years >= 6) score += 40;
    else if (years >= 3) score += 20;
  } else if (category?.code === 'DEPT_RESEARCH_PROJECT') {
    const amountLakhs = Number(details.sanctioned_amount_lakhs || 0);
    if (amountLakhs >= 50) score += 50;
    else if (amountLakhs >= 15) score += 25;
  } else if (category?.code === 'DEPT_ORGANIZED_EVENT') {
    const participants = Number(details.participant_count || 0);
    if (participants >= 200) score += 20;
    else if (participants >= 100) score += 10;
  }

  return {
    computedScore: Number(score.toFixed(2)),
    scoringRuleVersion: rule?.rule_version || 1
  };
}

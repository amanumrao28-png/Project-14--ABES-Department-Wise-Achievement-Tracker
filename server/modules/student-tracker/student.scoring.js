import db from '../../config/database.js';

const DEFAULT_STUDENT_BASE_WEIGHTS = {
  international: 55,
  national: 40,
  state: 28,
  university: 18,
  institutional: 12
};

/**
 * Independent Student Achievement Scoring Engine.
 * Reads ONLY `student_scoring_rules` and `student_categories` — never shares
 * formulas or points with Department or Faculty trackers.
 */
export async function calculateStudentScore(achievement, trxOrDb = db) {
  const category = await trxOrDb('student_categories')
    .where({ id: achievement.category_id })
    .first();

  const rule =
    (await trxOrDb('student_scoring_rules')
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
    : DEFAULT_STUDENT_BASE_WEIGHTS[achievement.achievement_level] || 15;

  const details =
    typeof achievement.details_json === 'string'
      ? JSON.parse(achievement.details_json || '{}')
      : achievement.details_json || {};

  // Student-specific outcome modifiers
  if (
    category?.code === 'STUDENT_HACKATHON' ||
    category?.code === 'STUDENT_TECH_COMPETITION' ||
    category?.code === 'STUDENT_SPORTS'
  ) {
    const pos = String(details.position_or_rank || '').toLowerCase();
    if (pos.includes('winner') || pos.includes('1st') || pos.includes('gold')) score += 25;
    else if (pos.includes('runner') || pos.includes('2nd') || pos.includes('silver')) score += 15;
    else if (pos.includes('finalist') || pos.includes('3rd') || pos.includes('bronze')) score += 8;
  } else if (category?.code === 'STUDENT_INTERNSHIP') {
    const weeks = Number(details.duration_weeks || 0);
    if (weeks >= 16) score += 15;
    else if (weeks >= 8) score += 8;
    if (details.ppo_received === true || details.ppo_received === 'true') score += 15;
  } else if (category?.code === 'STUDENT_PLACEMENT') {
    const offerType = String(details.offer_type || '').toLowerCase();
    if (offerType.includes('super')) score += 30;
    else if (offerType.includes('dream')) score += 18;
  }

  return {
    computedScore: Number(score.toFixed(2)),
    scoringRuleVersion: rule?.rule_version || 1
  };
}

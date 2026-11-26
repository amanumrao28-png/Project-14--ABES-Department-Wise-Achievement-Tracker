import db from '../../config/database.js';
import { TRACKER_DOMAINS } from '../../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

const DOMAIN_TABLE_MAP = {
  [TRACKER_DOMAINS.DEPARTMENT]: {
    achievements: 'dept_achievements',
    evidence: 'dept_evidence_documents',
    ownerColumn: 'created_by_user_id'
  },
  [TRACKER_DOMAINS.FACULTY]: {
    achievements: 'faculty_achievements',
    evidence: 'faculty_evidence_documents',
    ownerColumn: 'owner_user_id'
  },
  [TRACKER_DOMAINS.STUDENT]: {
    achievements: 'student_achievements',
    evidence: 'student_evidence_documents',
    ownerColumn: 'owner_user_id'
  }
};

/**
 * Detects potential duplicate submissions strictly within a single tracker domain
 * using certificate SHA-256 hash, certificate number, user ID, organization, title, and date.
 */
export async function checkPotentialDuplicates({
  trackerDomain,
  userId,
  title,
  organization,
  achievedOn,
  certificateNumber,
  sha256Hash,
  excludeAchievementId = null
}) {
  const config = DOMAIN_TABLE_MAP[trackerDomain];
  if (!config) {
    throw new AppError(400, 'INVALID_TRACKER_DOMAIN', 'Invalid tracker domain for duplicate check.');
  }

  const matchesMap = new Map();
  const addMatch = (row, reason, confidence) => {
    if (!row || (excludeAchievementId && row.id === excludeAchievementId)) return;
    const existing = matchesMap.get(row.id);
    if (existing) {
      if (!existing.match_reasons.includes(reason)) {
        existing.match_reasons.push(reason);
      }
      if (confidence === 'high') existing.confidence = 'high';
    } else {
      matchesMap.set(row.id, {
        achievement_id: row.id,
        title: row.title,
        organization: row.organization,
        achieved_on: row.achieved_on,
        workflow_status: row.workflow_status,
        certificate_number: row.details_json?.certificate_number || null,
        match_reasons: [reason],
        confidence
      });
    }
  };

  // 1. Certificate file SHA-256 hash match
  if (sha256Hash && /^[a-f0-9]{64}$/i.test(sha256Hash.trim())) {
    const hashRows = await db(config.evidence)
      .join(config.achievements, `${config.evidence}.achievement_id`, `${config.achievements}.id`)
      .where(`${config.evidence}.sha256_hash`, sha256Hash.trim().toLowerCase())
      .select(
        `${config.achievements}.id`,
        `${config.achievements}.title`,
        `${config.achievements}.organization`,
        `${config.achievements}.achieved_on`,
        `${config.achievements}.workflow_status`,
        `${config.achievements}.details_json`
      )
      .limit(10);

    for (const row of hashRows) {
      addMatch(row, 'Identical certificate file hash (SHA-256)', 'high');
    }
  }

  // 2. Certificate number match in details_json
  if (certificateNumber && certificateNumber.trim().length >= 3) {
    const certRows = await db(config.achievements)
      .whereRaw("LOWER(COALESCE(details_json->>'certificate_number', '')) = ?", [
        certificateNumber.trim().toLowerCase()
      ])
      .select('id', 'title', 'organization', 'achieved_on', 'workflow_status', 'details_json')
      .limit(10);

    for (const row of certRows) {
      addMatch(row, 'Matching certificate number', 'high');
    }
  }

  // 3. Same user + same date + same organization
  if (userId && achievedOn && organization && organization.trim().length >= 2) {
    const userOrgRows = await db(config.achievements)
      .where(config.ownerColumn, userId)
      .where('achieved_on', achievedOn)
      .whereRaw('LOWER(organization) = ?', [organization.trim().toLowerCase()])
      .select('id', 'title', 'organization', 'achieved_on', 'workflow_status', 'details_json')
      .limit(10);

    for (const row of userOrgRows) {
      addMatch(row, 'Same user, organization, and achievement date', 'high');
    }
  }

  // 4. Same title + organization + date (across users or same user)
  if (title && title.trim().length >= 4 && organization && organization.trim().length >= 2 && achievedOn) {
    const exactMetaRows = await db(config.achievements)
      .where('achieved_on', achievedOn)
      .whereRaw('LOWER(title) = ?', [title.trim().toLowerCase()])
      .whereRaw('LOWER(organization) = ?', [organization.trim().toLowerCase()])
      .select('id', 'title', 'organization', 'achieved_on', 'workflow_status', 'details_json')
      .limit(10);

    for (const row of exactMetaRows) {
      addMatch(row, 'Matching title, organization, and date', 'medium');
    }
  }

  // 5. Same user + very similar title
  if (userId && title && title.trim().length >= 6) {
    const similarTitleRows = await db(config.achievements)
      .where(config.ownerColumn, userId)
      .whereRaw('LOWER(title) = ?', [title.trim().toLowerCase()])
      .select('id', 'title', 'organization', 'achieved_on', 'workflow_status', 'details_json')
      .limit(10);

    for (const row of similarTitleRows) {
      addMatch(row, 'Same user with identical achievement title', 'medium');
    }
  }

  const matches = Array.from(matchesMap.values());

  return {
    tracker_domain: trackerDomain,
    has_potential_duplicates: matches.length > 0,
    requires_manual_review: matches.length > 0,
    match_count: matches.length,
    matches,
    checked_signals: {
      sha256_hash: Boolean(sha256Hash),
      certificate_number: Boolean(certificateNumber),
      user_id: Boolean(userId),
      organization: Boolean(organization),
      title: Boolean(title),
      achieved_on: Boolean(achievedOn)
    }
  };
}

import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { ROLES } from '../../config/env.js';

/**
 * Persists workflow status-change notifications for target user IDs.
 * Fire-and-forget safe so notification delivery issues never fail primary transactions.
 */
export async function notifyUsers({
  recipientUserIds = [],
  trackerDomain,
  achievementId,
  title,
  message,
  status
}) {
  try {
    const uniqueIds = [...new Set(recipientUserIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;

    const rows = uniqueIds.map((userId) => ({
      id: uuidv4(),
      recipient_user_id: userId,
      tracker_domain: trackerDomain,
      achievement_id: achievementId,
      title: String(title).slice(0, 250),
      message,
      status,
      is_read: false
    }));

    await db('notifications').insert(rows);
  } catch (err) {
    console.error('[NOTIFICATION_ERROR]', err?.message || err);
  }
}

/**
 * Resolves active reviewer user IDs for a given role/department target.
 */
export async function findReviewerUserIds({ role, departmentId = null, coordinatorOnly = false }) {
  const query = db('users').where({ role, is_active: true }).select('id');
  if (departmentId) {
    query.andWhere({ department_id: departmentId });
  }
  if (coordinatorOnly && role === ROLES.FACULTY) {
    query.andWhere({ can_coordinate_student_approvals: true });
  }
  const rows = await query;
  return rows.map((r) => r.id);
}

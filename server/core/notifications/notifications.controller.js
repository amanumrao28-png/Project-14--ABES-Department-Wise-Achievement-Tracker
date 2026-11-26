import db from '../../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listMyNotifications(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const [items, unreadRow] = await Promise.all([
      db('notifications')
        .where({ recipient_user_id: req.user.id })
        .orderBy('created_at', 'desc')
        .limit(limit),
      db('notifications')
        .where({ recipient_user_id: req.user.id, is_read: false })
        .count('id as count')
        .first()
    ]);

    return sendSuccess(res, {
      items,
      unreadCount: parseInt(unreadRow?.count || 0, 10)
    });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      throw new AppError(400, 'INVALID_ID', 'Invalid notification ID.');
    }

    const [updated] = await db('notifications')
      .where({ id, recipient_user_id: req.user.id })
      .update({ is_read: true })
      .returning('*');

    if (!updated) {
      throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
    }

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await db('notifications')
      .where({ recipient_user_id: req.user.id, is_read: false })
      .update({ is_read: true });
    return sendSuccess(res, { markedAllRead: true });
  } catch (err) {
    next(err);
  }
}

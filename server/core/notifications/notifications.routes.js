import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import * as notificationsController from './notifications.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', notificationsController.listMyNotifications);
router.patch('/:id/read', notificationsController.markNotificationRead);
router.post('/read-all', notificationsController.markAllNotificationsRead);
router.delete('/', notificationsController.clearAllNotifications);
router.delete('/:id', notificationsController.deleteNotification);

export default router;

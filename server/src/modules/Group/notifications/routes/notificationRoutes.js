import express from 'express';
import { protect } from '../../../../middlewares/auth.js';
import { listNotifications, markNotificationRead } from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);

router.get('/', listNotifications);
router.patch('/:id/read', markNotificationRead);

export default router;

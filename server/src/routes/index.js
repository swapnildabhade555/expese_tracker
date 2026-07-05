import express from 'express';
import authRouter from '../modules/Individual/auth/routes/authRoutes.js';
import categoryRouter from '../modules/Individual/categories/routes/categoryRoutes.js';
import expenseRouter from '../modules/Individual/expenses/routes/expenseRoutes.js';
import budgetRouter from '../modules/Individual/budgets/routes/budgetRoutes.js';
import analyticsRouter from '../modules/Individual/analytics/routes/analyticsRoutes.js';
import groupRouter from '../modules/Group/groups/routes/groupRoutes.js';
import notificationRouter from '../modules/Group/notifications/routes/notificationRoutes.js';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/categories', categoryRouter);
router.use('/expenses', expenseRouter);
router.use('/analytics', analyticsRouter);
router.use('/budgets', budgetRouter);
router.use('/groups', groupRouter);
router.use('/notifications', notificationRouter);

export default router;

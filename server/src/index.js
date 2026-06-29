import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler.js';
import AppError from './utils/AppError.js';
import { seedDefaultCategories } from './config/seed.js';

import authRouter from './modules/auth/authRoutes.js';
import categoryRouter from './modules/categories/categoryRoutes.js';
import expenseRouter from './modules/expenses/expenseRoutes.js';
import analyticsRouter from './modules/analytics/analyticsRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Set default environment as development if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/expenses', expenseRouter);
app.use('/api/analytics', analyticsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Expense Tracker API is running' });
});

// Fallback for unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler Middleware
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  // Seed default categories
  await seedDefaultCategories();
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler.js';
import AppError from './utils/AppError.js';
import { seedDefaultCategories } from './config/seed.js';

import apiRouter from './routes/index.js';
import { processRecurringExpenses } from './modules/Individual/expenses/services/recurringExpenseService.js';
import { loadExchangeRates } from './modules/Individual/expenses/services/currencyService.js';
import { serveSwagger } from './config/swagger.js';

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
app.use('/api', apiRouter);

// Register Swagger docs
serveSwagger(app);

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

  // Load exchange rates
  await loadExchangeRates();

  // Process any due recurring expenses on startup
  console.log('Processing recurring expenses on startup...');
  await processRecurringExpenses();

  // Set up hourly background check
  setInterval(async () => {
    console.log('Running background scan for due recurring expenses...');
    await processRecurringExpenses();
  }, 3600000);
});

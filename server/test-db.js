import prisma from './src/config/db.js';
console.log('User model:', !!prisma.user);
console.log('Expense model:', !!prisma.expense);
console.log('RecurringExpense model:', !!prisma.recurringExpense);
console.log('RefreshToken model:', !!prisma.refreshToken);
process.exit(0);

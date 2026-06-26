import AppError from '../utils/AppError.js';

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak details
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    // Standardize specific database/ORM errors
    let error = { ...err };
    error.message = err.message;
    error.isOperational = err.isOperational;

    // Prisma Unique constraint violation
    if (err.code === 'P2002') {
      const target = err.meta?.target;
      const field = Array.isArray(target) ? target.join(', ') : (target || 'field');
      error = new AppError(`Duplicate value for field: ${field}. Please use another value!`, 400);
    }
    // Prisma Record not found
    if (err.code === 'P2025') {
      error = new AppError('Record not found', 404);
    }

    sendErrorProd(error, res);
  }
};

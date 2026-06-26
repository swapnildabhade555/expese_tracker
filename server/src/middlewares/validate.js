import AppError from '../utils/AppError.js';

export const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errorMessages = result.error.errors
        .map(err => {
          // err.path will be like ['body', 'amount'] -> we format as 'amount'
          const field = err.path.length > 1 ? err.path.slice(1).join('.') : err.path[0];
          return `${field}: ${err.message}`;
        })
        .join(', ');
      
      return next(new AppError(`Validation failed: ${errorMessages}`, 400));
    }

    // Assign parsed data back to request to ensure runtime safety & coercion (e.g. string to number)
    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.query !== undefined) req.query = result.data.query;
    if (result.data.params !== undefined) req.params = result.data.params;

    next();
  } catch (err) {
    next(err);
  }
};

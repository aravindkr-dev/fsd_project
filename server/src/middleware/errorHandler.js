import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, _res, next) => next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message;

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  } else if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for ${Object.keys(err.keyPattern || {}).join(', ') || 'field'}`;
  } else if (err.name === 'ValidationError') {
    status = 400;
  } else if (err.name === 'MulterError') {
    status = 400;
  }

  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 && env.nodeEnv === 'production' ? 'Internal server error' : message,
    ...(err.details ? { details: err.details } : {}),
  });
}

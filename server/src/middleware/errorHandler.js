import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Handle Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `An account with this ${field} already exists`;
    details = [{ field, message: `This ${field} is already registered` }];
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation error';
    details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle invalid ObjectId cast error
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle rate-limit storage outages (fail-closed policy)
  if (
    err.name === 'RateLimitStorageUnavailableError' ||
    err.code === 'RATE_LIMIT_STORAGE_UNAVAILABLE'
  ) {
    statusCode = 503;
    message =
      'Authentication service temporarily unavailable. Please try again shortly.';
    details = null;
  }

  // Log error (with stack trace in development)
  if (statusCode >= 500) {
    logger.error(`Server Error: ${message}`, {
      correlationId: req.id,
      path: req.originalUrl,
      method: req.method,
      stack: env.isProduction ? undefined : err.stack
    });
  } else {
    logger.debug(`Client Error (${statusCode}): ${message}`, {
      correlationId: req.id,
      path: req.originalUrl,
      method: req.method
    });
  }

  const payload = {
    success: false,
    message,
    statusCode,
    meta: {
      timestamp: new Date().toISOString(),
      correlationId: req.id
    }
  };

  if (details) {
    payload.details = details;
  }

  if (
    !env.isProduction &&
    err.stack &&
    statusCode >= 500 &&
    err.name !== 'RateLimitStorageUnavailableError'
  ) {
    payload.stack = err.stack;
  }

  return res.status(statusCode).json(payload);
}

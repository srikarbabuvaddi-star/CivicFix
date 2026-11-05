import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * General API rate limiter
 */
export const generalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.isTest ? 10000 : env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429
  }
});

/**
 * Strict limiter for sensitive authentication endpoints (login, register)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isTest ? 10000 : env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    statusCode: 429
  }
});


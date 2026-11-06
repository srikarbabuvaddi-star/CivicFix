import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { MongoRateLimitStore } from './rateLimitStore.js';

/**
 * Shared MongoDB stores for distributed rate limiting.
 * Segregates general API traffic from authentication endpoints to prevent cross-policy exhaustion.
 */
export const generalStore = new MongoRateLimitStore({
  prefix: 'rl:gen:',
  windowMs: env.rateLimitWindowMs
});

export const authStore = new MongoRateLimitStore({
  prefix: 'rl:auth:',
  windowMs: 15 * 60 * 1000
});

/**
 * General API rate limiter
 */
export const generalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.isTest ? 10000 : env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  store: generalStore,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429
  }
});

/**
 * Strict limiter for sensitive authentication endpoints (login, register).
 * Enforces shared brute-force protection across multiple serverless instances and instance restarts.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isTest ? 10000 : env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  store: authStore,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    statusCode: 429
  }
});

/**
 * Factory function to create custom rate limiters (useful for custom routes or integration tests)
 *
 * @param {Object} [options={}]
 * @param {number} [options.windowMs]
 * @param {number} [options.max]
 * @param {string} [options.prefix]
 * @param {Object} [options.store]
 * @param {Object} [options.message]
 */
export function createRateLimiter(options = {}) {
  const store =
    options.store ||
    new MongoRateLimitStore({
      prefix: options.prefix || 'rl:custom:',
      windowMs: options.windowMs || 15 * 60 * 1000
    });

  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    message: options.message || {
      success: false,
      message: 'Too many requests, please try again later.',
      statusCode: 429
    }
  });
}



import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import {
  MongoRateLimitStore,
  RateLimitStorageUnavailableError
} from './rateLimitStore.js';

/**
 * Shared MongoDB stores for distributed rate limiting.
 *
 * Segregates general API traffic from authentication endpoints to prevent cross-policy exhaustion.
 *
 * Outage Policies:
 * - authStore: 'fail-closed' (Rejects authentication requests with HTTP 503 if shared MongoDB
 *   storage is unreachable. Prevents brute-force bypass across serverless instances during outages.)
 * - generalStore: 'degraded-local' (Degrades to local memory during database outages with explicit
 *   headers and logs, preserving general service availability without claiming distributed guarantees.)
 */
export const generalStore = new MongoRateLimitStore({
  prefix: 'rl:gen:',
  windowMs: env.rateLimitWindowMs,
  outagePolicy: 'degraded-local'
});

export const authStore = new MongoRateLimitStore({
  prefix: 'rl:auth:',
  windowMs: 15 * 60 * 1000,
  outagePolicy: 'fail-closed'
});

/**
 * Internal raw general API rate limiter using express-rate-limit.
 */
const rawGeneralLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.isTest ? 10000 : env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  store: generalStore,
  passOnStoreError: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429
  }
});

/**
 * General API rate limiter middleware.
 * Attaches mode indicator header so clients and monitors can distinguish between
 * shared-mongodb and degraded-local-memory operation during database outages.
 */
export const generalLimiter = (req, res, next) => {
  const isHealthy = generalStore.isDbReady();
  res.setHeader(
    'X-RateLimit-Mode',
    isHealthy ? 'shared-mongodb' : 'degraded-local-memory'
  );
  return rawGeneralLimiter(req, res, next);
};

/**
 * Internal raw auth rate limiter using express-rate-limit.
 */
const rawAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isTest ? 10000 : env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  store: authStore,
  passOnStoreError: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    statusCode: 429
  }
});

/**
 * Strict limiter for sensitive authentication endpoints (login, register).
 *
 * Enforces FAIL-CLOSED behavior:
 * If the shared MongoDB rate-limit store is unavailable, requests are immediately
 * rejected with HTTP 503 Service Unavailable, preventing downstream handler execution
 * and ensuring distributed brute-force protection is never bypassed.
 */
export const authLimiter = (req, res, next) => {
  // Pre-flight check: reject immediately if database storage is unavailable
  if (!authStore.isDbReady()) {
    res.setHeader('X-RateLimit-Mode', 'unavailable');
    return res.status(503).json({
      success: false,
      message:
        'Authentication service temporarily unavailable. Please try again shortly.',
      statusCode: 503
    });
  }

  res.setHeader('X-RateLimit-Mode', 'shared-mongodb');

  return rawAuthLimiter(req, res, (err) => {
    if (err) {
      if (
        err instanceof RateLimitStorageUnavailableError ||
        err.name === 'RateLimitStorageUnavailableError' ||
        err.code === 'RATE_LIMIT_STORAGE_UNAVAILABLE'
      ) {
        res.setHeader('X-RateLimit-Mode', 'unavailable');
        return res.status(503).json({
          success: false,
          message:
            'Authentication service temporarily unavailable. Please try again shortly.',
          statusCode: 503
        });
      }
      return next(err);
    }
    return next();
  });
};

/**
 * Factory function to create custom rate limiters (useful for custom routes or integration tests)
 *
 * @param {Object} [options={}]
 * @param {number} [options.windowMs]
 * @param {number} [options.max]
 * @param {string} [options.prefix]
 * @param {Object} [options.store]
 * @param {'fail-closed' | 'degraded-local'} [options.outagePolicy]
 * @param {string} [options.unavailableMessage]
 * @param {Object} [options.message]
 */
export function createRateLimiter(options = {}) {
  const outagePolicy =
    options.outagePolicy ||
    (options.store && options.store.outagePolicy) ||
    'degraded-local';

  const store =
    options.store ||
    new MongoRateLimitStore({
      prefix: options.prefix || 'rl:custom:',
      windowMs: options.windowMs || 15 * 60 * 1000,
      outagePolicy
    });

  const limiter = rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    passOnStoreError: false,
    message: options.message || {
      success: false,
      message: 'Too many requests, please try again later.',
      statusCode: 429
    }
  });

  const isFailClosed =
    outagePolicy === 'fail-closed' ||
    (store && store.outagePolicy === 'fail-closed');

  if (isFailClosed) {
    return (req, res, next) => {
      if (!store.isDbReady()) {
        res.setHeader('X-RateLimit-Mode', 'unavailable');
        return res.status(503).json({
          success: false,
          message:
            options.unavailableMessage ||
            'Authentication service temporarily unavailable. Please try again shortly.',
          statusCode: 503
        });
      }

      res.setHeader('X-RateLimit-Mode', 'shared-mongodb');

      return limiter(req, res, (err) => {
        if (
          err &&
          (err instanceof RateLimitStorageUnavailableError ||
            err.name === 'RateLimitStorageUnavailableError')
        ) {
          res.setHeader('X-RateLimit-Mode', 'unavailable');
          return res.status(503).json({
            success: false,
            message:
              options.unavailableMessage ||
              'Authentication service temporarily unavailable. Please try again shortly.',
            statusCode: 503
          });
        }
        if (err) return next(err);
        return next();
      });
    };
  }

  return (req, res, next) => {
    res.setHeader(
      'X-RateLimit-Mode',
      store.isDbReady() ? 'shared-mongodb' : 'degraded-local-memory'
    );
    return limiter(req, res, next);
  };
}




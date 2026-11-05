import crypto from 'crypto';
import { ForbiddenError } from '../utils/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Get or initialize CSRF token for the active session
 */
export function getOrCreateCsrfToken(req) {
  if (!req.session) {
    return null;
  }
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

/**
 * Regenerate CSRF token (e.g. after login/register) to prevent fixation
 */
export function rotateCsrfToken(req) {
  if (req.session) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    return req.session.csrfToken;
  }
  return null;
}

/**
 * CSRF Protection Middleware
 * Protects state-changing requests using the Synchronizer Token Pattern
 */
export function csrfProtection(req, res, next) {
  // Safe HTTP methods do not mutate state
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Exempt health check
  if (req.path === '/api/v1/health') {
    return next();
  }

  const sessionToken = req.session?.csrfToken;
  const clientToken = req.headers['x-csrf-token'];

  // Enforce CSRF token if session is authenticated or has initialized a CSRF token
  if (req.session?.userId || sessionToken) {
    if (!sessionToken || !clientToken) {
      return next(new ForbiddenError('Invalid or missing CSRF token'));
    }

    try {
      const sessionBuffer = Buffer.from(sessionToken, 'utf-8');
      const clientBuffer = Buffer.from(clientToken, 'utf-8');

      if (sessionBuffer.length !== clientBuffer.length || !crypto.timingSafeEqual(sessionBuffer, clientBuffer)) {
        return next(new ForbiddenError('CSRF token validation failed'));
      }
    } catch {
      return next(new ForbiddenError('CSRF token validation failed'));
    }
  }

  next();
}

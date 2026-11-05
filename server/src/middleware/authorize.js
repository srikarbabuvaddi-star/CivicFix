import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

/**
 * Middleware factory for role-based authorization
 * Usage: authorize('admin'), authorize('staff', 'admin')
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before authorization'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Forbidden: Requires one of [${allowedRoles.join(', ')}] role`));
    }

    next();
  };
}


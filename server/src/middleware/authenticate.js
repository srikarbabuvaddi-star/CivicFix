import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { findUserById } from '../modules/users/user.service.js';
import { ACCOUNT_STATUS } from '../config/constants.js';

export async function authenticate(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return next(new UnauthorizedError('Authentication required. Please log in.'));
    }

    const user = await findUserById(req.session.userId);

    if (!user) {
      // Session exists but user was deleted
      req.session.destroy();
      return next(new UnauthorizedError('User account not found. Please log in again.'));
    }

    if (user.status === ACCOUNT_STATUS.SUSPENDED) {
      req.session.destroy();
      return next(new ForbiddenError('Account is suspended. Please contact civic administration.'));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication: attaches req.user if a valid session exists,
 * but allows guest access if no session is present.
 */
export async function optionalAuthenticate(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return next();
    }

    const user = await findUserById(req.session.userId);
    if (user && user.status !== ACCOUNT_STATUS.SUSPENDED) {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
}


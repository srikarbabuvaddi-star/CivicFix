import * as authService from './auth.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { rotateCsrfToken, getOrCreateCsrfToken } from '../../middleware/csrf.js';
import { env } from '../../config/env.js';

export async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = user.id;
      const csrfToken = rotateCsrfToken(req);

      return sendSuccess(
        res,
        { user, csrfToken },
        'Account created successfully',
        201
      );
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const user = await authService.login(req.body);

    // Regenerate session upon successful login
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = user.id;
      const csrfToken = rotateCsrfToken(req);

      return sendSuccess(
        res,
        { user, csrfToken },
        'Login successful',
        200
      );
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    if (!req.session) {
      return sendSuccess(res, null, 'Already logged out', 200);
    }

    req.session.destroy((err) => {
      if (err) return next(err);

      res.clearCookie(env.sessionCookieName, {
        path: '/',
        httpOnly: true,
        secure: env.isProduction,
        sameSite: env.cookieSameSite
      });

      return sendSuccess(res, null, 'Logged out successfully', 200);
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getUserProfile(req.user.id);
    const csrfToken = getOrCreateCsrfToken(req);

    return sendSuccess(
      res,
      { user, csrfToken },
      'Session profile retrieved',
      200
    );
  } catch (error) {
    next(error);
  }
}

export async function getCsrfToken(req, res) {
  const csrfToken = getOrCreateCsrfToken(req);
  return sendSuccess(res, { csrfToken }, 'CSRF token retrieved', 200);
}


import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { findUserByEmail, findUserById, createCitizenUser } from '../users/user.service.js';
import { ACCOUNT_STATUS } from '../../config/constants.js';

export async function register({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new ConflictError('An account with this email address already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await createCitizenUser({
    name,
    email: normalizedEmail,
    passwordHash
  });

  return user.toJSON();
}

export async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await findUserByEmail(normalizedEmail, true);
  if (!user) {
    // Generic authentication failure message
    throw new UnauthorizedError('Invalid email or password');
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status === ACCOUNT_STATUS.SUSPENDED) {
    throw new ForbiddenError('Account is suspended. Please contact civic administration.');
  }

  return user.toJSON();
}

export async function getUserProfile(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new NotFoundError('User profile not found');
  }
  return user.toJSON();
}


import { User } from './user.model.js';
import { ROLES, ACCOUNT_STATUS } from '../../config/constants.js';

export async function findUserByEmail(email, includePassword = false) {
  const normalizedEmail = email.trim().toLowerCase();
  const query = User.findOne({ email: normalizedEmail });
  if (includePassword) {
    query.select('+passwordHash');
  }
  return query.exec();
}

export async function findUserById(id) {
  return User.findById(id).exec();
}

export async function createCitizenUser({ name, email, passwordHash }) {
  // Public registration ALWAYS assigns CITIZEN role and ACTIVE status
  const normalizedEmail = email.trim().toLowerCase();
  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: ROLES.CITIZEN,
    status: ACCOUNT_STATUS.ACTIVE,
    departmentId: null
  });

  return user.save();
}

export async function provisionInternalUser({ name, email, passwordHash, role, departmentId = null }) {
  // Provisioning for staff/admin via administrative process
  const normalizedEmail = email.trim().toLowerCase();
  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    status: ACCOUNT_STATUS.ACTIVE,
    departmentId
  });

  return user.save();
}

export async function getUserPreferences(userId) {
  const user = await User.findById(userId).exec();
  if (!user) {
    return { email: true, inApp: true };
  }
  return user.notificationPreferences || { email: true, inApp: true };
}

export async function updateUserPreferences(userId, { email, inApp }) {
  const user = await User.findById(userId).exec();
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.notificationPreferences) {
    user.notificationPreferences = { email: true, inApp: true };
  }

  if (email !== undefined) {
    user.notificationPreferences.email = Boolean(email);
  }
  if (inApp !== undefined) {
    user.notificationPreferences.inApp = Boolean(inApp);
  }

  await user.save();
  return user.notificationPreferences;
}


import mongoose from 'mongoose';
import { User } from '../users/user.model.js';
import { Department } from '../departments/department.model.js';
import { ROLES, ACCOUNT_STATUS } from '../../config/constants.js';
import {
  NotFoundError,
  BadRequestError
} from '../../utils/errors.js';

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Retrieve staff directory with populated department references
 */
export async function getStaffUsers({ departmentId, status, search } = {}) {
  const query = { role: ROLES.STAFF };

  if (departmentId) {
    if (departmentId === 'unassigned') {
      query.departmentId = null;
    } else if (mongoose.Types.ObjectId.isValid(departmentId)) {
      query.departmentId = new mongoose.Types.ObjectId(departmentId);
    }
  }

  if (status) {
    query.status = status;
  }

  if (search && search.trim()) {
    const sanitized = escapeRegex(search.trim());
    query.$or = [
      { name: { $regex: sanitized, $options: 'i' } },
      { email: { $regex: sanitized, $options: 'i' } }
    ];
  }

  const staff = await User.find(query)
    .populate('departmentId', 'name normalizedName isActive categoriesHandled')
    .sort({ name: 1 })
    .exec();

  return staff.map((u) => u.toJSON());
}

/**
 * Assign or change a staff member's department
 */
export async function assignStaffDepartment(staffId, departmentId) {
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    throw new BadRequestError('Invalid staff user identifier format');
  }

  const user = await User.findById(staffId).exec();
  if (!user) {
    throw new NotFoundError('Staff user not found');
  }

  if (user.role !== ROLES.STAFF) {
    throw new BadRequestError(`Cannot assign department to user with role '${user.role}'`);
  }

  if (user.status !== ACCOUNT_STATUS.ACTIVE) {
    throw new BadRequestError('Cannot assign department to suspended staff member. Reactivate account first.');
  }

  let depObj = null;
  if (departmentId !== null) {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw new BadRequestError('Invalid department identifier format');
    }

    depObj = await Department.findById(departmentId).exec();
    if (!depObj) {
      throw new NotFoundError('Department not found');
    }

    if (!depObj.isActive) {
      throw new BadRequestError(`Cannot assign staff to deactivated or inactive department '${depObj.name}'`);
    }

    user.departmentId = depObj._id;
  } else {
    user.departmentId = null;
  }

  await user.save();

  const populated = await User.findById(user._id)
    .populate('departmentId', 'name normalizedName isActive categoriesHandled')
    .exec();

  return populated.toJSON();
}

/**
 * Suspend or reactivate staff account with protection against losing last active admin
 */
export async function updateStaffStatus(staffId, status, _currentAdminId) {
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    throw new BadRequestError('Invalid user identifier format');
  }

  const targetUser = await User.findById(staffId).exec();
  if (!targetUser) {
    throw new NotFoundError('User not found');
  }

  // Prevent accidental loss of the last active administrator
  if (targetUser.role === ROLES.ADMIN && status === ACCOUNT_STATUS.SUSPENDED) {
    const activeAdminsCount = await User.countDocuments({
      role: ROLES.ADMIN,
      status: ACCOUNT_STATUS.ACTIVE,
      _id: { $ne: targetUser._id }
    });

    if (activeAdminsCount === 0) {
      throw new BadRequestError(
        'Cannot suspend the last active administrator account. System requires at least one active administrator.'
      );
    }
  }

  targetUser.status = status;
  await targetUser.save();

  const populated = await User.findById(targetUser._id)
    .populate('departmentId', 'name normalizedName isActive categoriesHandled')
    .exec();

  return populated.toJSON();
}

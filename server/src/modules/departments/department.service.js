import mongoose from 'mongoose';
import { Department } from './department.model.js';
import { Issue } from '../issues/issue.model.js';
import { User } from '../users/user.model.js';
import { ROLES } from '../../config/constants.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError
} from '../../utils/errors.js';

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function createDepartment({ name, description, categoriesHandled, serviceArea }) {
  const normalizedName = name.trim().toLowerCase();

  const existing = await Department.findOne({ normalizedName });
  if (existing) {
    throw new ConflictError(`A department with name "${name.trim()}" already exists`);
  }

  const department = new Department({
    name: name.trim(),
    normalizedName,
    description: description?.trim() || '',
    categoriesHandled,
    serviceArea: serviceArea?.trim() || 'Municipality-Wide',
    isActive: true
  });

  const saved = await department.save();
  return saved.toJSON();
}

export async function getDepartments({ isActive = 'all', search } = {}) {
  const query = {};

  if (isActive === 'true') {
    query.isActive = true;
  } else if (isActive === 'false') {
    query.isActive = false;
  }

  if (search && search.trim()) {
    const sanitized = escapeRegex(search.trim());
    query.$or = [
      { name: { $regex: sanitized, $options: 'i' } },
      { description: { $regex: sanitized, $options: 'i' } },
      { categoriesHandled: { $in: [new RegExp(sanitized, 'i')] } }
    ];
  }

  const departments = await Department.find(query).sort({ name: 1 }).exec();
  return departments.map((d) => d.toJSON());
}

export async function getDepartmentById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid department identifier format');
  }

  const department = await Department.findById(id).exec();
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  return department.toJSON();
}

export async function updateDepartment(id, updateData) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid department identifier format');
  }

  const department = await Department.findById(id).exec();
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  if (updateData.name && updateData.name.trim() !== department.name) {
    const normalizedName = updateData.name.trim().toLowerCase();
    const existing = await Department.findOne({
      normalizedName,
      _id: { $ne: department._id }
    });

    if (existing) {
      throw new ConflictError(`A department with name "${updateData.name.trim()}" already exists`);
    }

    department.name = updateData.name.trim();
    department.normalizedName = normalizedName;
  }

  if (updateData.description !== undefined) {
    department.description = updateData.description.trim();
  }

  if (updateData.categoriesHandled !== undefined) {
    department.categoriesHandled = updateData.categoriesHandled;
  }

  if (updateData.serviceArea !== undefined) {
    department.serviceArea = updateData.serviceArea.trim();
  }

  if (updateData.isActive !== undefined) {
    department.isActive = updateData.isActive;
  }

  const saved = await department.save();
  return saved.toJSON();
}

export async function deleteDepartment(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid department identifier format');
  }

  const department = await Department.findById(id).exec();
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  // Prevent accidental deletion of departments referenced by existing issues
  const hasReferencingIssues = await Issue.exists({ departmentId: id });
  if (hasReferencingIssues) {
    throw new ConflictError(
      'Cannot delete department that is referenced by existing civic issues. Deactivate the department instead.'
    );
  }

  // Prevent deletion of departments with active staff members
  const hasStaffMembers = await User.exists({ departmentId: id, role: ROLES.STAFF });
  if (hasStaffMembers) {
    throw new ConflictError(
      'Cannot delete department with assigned staff members. Please reassign staff first.'
    );
  }

  await Department.findByIdAndDelete(id);
  return { message: 'Department deleted successfully' };
}

export async function suggestDepartmentForCategory(category) {
  const department = await Department.findOne({
    categoriesHandled: category,
    isActive: true
  }).exec();

  return department ? department.toJSON() : null;
}

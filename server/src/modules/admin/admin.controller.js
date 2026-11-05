import * as adminService from './admin.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function getStaffDirectory(req, res, next) {
  try {
    const staff = await adminService.getStaffUsers(req.query);
    return sendSuccess(res, staff, 'Staff directory retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function assignStaffDepartment(req, res, next) {
  try {
    const updated = await adminService.assignStaffDepartment(
      req.params.id,
      req.body.departmentId
    );
    return sendSuccess(res, updated, 'Staff department membership updated', 200);
  } catch (error) {
    next(error);
  }
}

export async function updateStaffStatus(req, res, next) {
  try {
    const status = req.body.status || req.body.accountStatus;
    const updated = await adminService.updateStaffStatus(
      req.params.id,
      status,
      req.user.id
    );
    return sendSuccess(res, updated, 'Staff account status updated', 200);
  } catch (error) {
    next(error);
  }
}

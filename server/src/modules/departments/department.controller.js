import * as departmentService from './department.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function createDepartment(req, res, next) {
  try {
    const department = await departmentService.createDepartment(req.body);
    return sendSuccess(res, department, 'Department created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function getDepartments(req, res, next) {
  try {
    const departments = await departmentService.getDepartments(req.query);
    return sendSuccess(res, departments, 'Departments retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function getDepartmentById(req, res, next) {
  try {
    const department = await departmentService.getDepartmentById(req.params.id);
    return sendSuccess(res, department, 'Department retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function updateDepartment(req, res, next) {
  try {
    const updated = await departmentService.updateDepartment(req.params.id, req.body);
    return sendSuccess(res, updated, 'Department updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function deleteDepartment(req, res, next) {
  try {
    const result = await departmentService.deleteDepartment(req.params.id);
    return sendSuccess(res, result, 'Department deleted successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function suggestDepartment(req, res, next) {
  try {
    const department = await departmentService.suggestDepartmentForCategory(req.params.category);
    return sendSuccess(res, department, 'Suggested department for category', 200);
  } catch (error) {
    next(error);
  }
}

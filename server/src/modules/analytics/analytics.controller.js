import * as analyticsService from './analytics.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function getCitizenAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getCitizenAnalytics(req.user.id);
    return sendSuccess(res, data, 'Citizen analytics retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getStaffAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getStaffAnalytics(req.user.id);
    return sendSuccess(res, data, 'Staff workload analytics retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getAdminAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getAdminAnalytics();
    return sendSuccess(res, data, 'Administrator municipal analytics retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getGeographicHotspots(req, res, next) {
  try {
    const minThreshold = parseInt(req.query.minThreshold, 10) || 2;
    const category = req.query.category || null;
    const data = await analyticsService.getGeographicHotspots({ minThreshold, category });
    return sendSuccess(res, data, 'Geographic issue hotspots retrieved', 200);
  } catch (error) {
    next(error);
  }
}


import { Router } from 'express';
import * as analyticsController from './analytics.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { ROLES } from '../../config/constants.js';

const router = Router();

// Hotspots endpoint is accessible to authenticated users (and can be public/citizen/admin)
router.get('/hotspots', authenticate, analyticsController.getGeographicHotspots);

// Citizen analytics (strictly scoped to requesting citizen)
router.get('/citizen', authenticate, analyticsController.getCitizenAnalytics);

// Staff analytics (Staff or Admin)
router.get('/staff', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), analyticsController.getStaffAnalytics);

// Admin platform-wide telemetry
router.get('/admin', authenticate, authorize(ROLES.ADMIN), analyticsController.getAdminAnalytics);

export default router;


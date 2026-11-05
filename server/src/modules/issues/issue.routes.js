import { Router } from 'express';
import * as issueController from './issue.controller.js';
import * as feedbackController from '../feedback/feedback.controller.js';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { submitFeedbackSchema } from '../feedback/feedback.validation.js';
import {
  createIssueSchema,
  updateIssueSchema,
  queryIssuesSchema,
  assignIssueSchema,
  reassignIssueSchema,
  transitionIssueSchema,
  resolveIssueSchema,
  reopenIssueSchema
} from './issue.validation.js';
import { ROLES } from '../../config/constants.js';

const router = Router();

// Public listing of published civic reports (supports both / and /public)
router.get('/', validate(queryIssuesSchema, 'query'), issueController.getPublicIssues);
router.get('/public', validate(queryIssuesSchema, 'query'), issueController.getPublicIssues);

// Citizen authenticated routes (must precede /:id)
router.get('/mine', authenticate, validate(queryIssuesSchema, 'query'), issueController.getMyIssues);

// Staff work orders queue (Staff and Admin)
router.get(
  '/staff/queue',
  authenticate,
  authorize(ROLES.STAFF, ROLES.ADMIN),
  validate(queryIssuesSchema, 'query'),
  issueController.getStaffIssues
);

// Admin triage queue
router.get(
  '/admin/triage',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(queryIssuesSchema, 'query'),
  issueController.getTriageIssues
);

// Issue creation by authenticated citizen
router.post('/', authenticate, validate(createIssueSchema), issueController.createIssue);

// Individual issue details & timeline (supports public safe DTO and authenticated views)
router.get('/:id', optionalAuthenticate, issueController.getIssueById);
router.get('/:id/timeline', optionalAuthenticate, issueController.getIssueTimeline);

// Citizen report updates and controlled withdrawal
router.patch('/:id', authenticate, validate(updateIssueSchema), issueController.updateIssue);
router.delete('/:id', authenticate, issueController.withdrawIssue);

// Assignment and Reassignment (Admin only)
router.post(
  '/:id/assign',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(assignIssueSchema),
  issueController.assignIssue
);

router.post(
  '/:id/reassign',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(reassignIssueSchema),
  issueController.reassignIssue
);

// Lifecycle state transitions
router.post(
  '/:id/transition',
  authenticate,
  validate(transitionIssueSchema),
  issueController.transitionIssue
);

// Resolution submission (Staff / Admin)
router.post(
  '/:id/resolve',
  authenticate,
  authorize(ROLES.STAFF, ROLES.ADMIN),
  validate(resolveIssueSchema),
  issueController.resolveIssue
);

// Verification and Closure (Citizen reporter / Admin)
router.post(
  '/:id/verify',
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.ADMIN),
  issueController.verifyAndCloseIssue
);

// Reopening resolved report (Citizen reporter / Admin)
router.post(
  '/:id/reopen',
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.ADMIN),
  validate(reopenIssueSchema),
  issueController.reopenIssue
);

// Citizen resolution feedback
router.post(
  '/:id/feedback',
  authenticate,
  validate(submitFeedbackSchema),
  feedbackController.submitFeedback
);
router.get('/:id/feedback', authenticate, feedbackController.getIssueFeedback);

export default router;

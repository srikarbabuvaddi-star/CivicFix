import * as issueService from './issue.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function createIssue(req, res, next) {
  try {
    const issue = await issueService.createIssue(req.body, req.user.id);
    return sendSuccess(res, issue, 'Civic issue reported successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function getPublicIssues(req, res, next) {
  try {
    const result = await issueService.getPublicIssues(req.query);
    return sendSuccess(res, result, 'Public civic reports retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getMyIssues(req, res, next) {
  try {
    const result = await issueService.getCitizenIssues(req.user.id, req.query);
    return sendSuccess(res, result, 'Your issue reports retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getIssueById(req, res, next) {
  try {
    const issue = await issueService.getIssueById(req.params.id, req.user || null);
    return sendSuccess(res, issue, 'Issue details retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function updateIssue(req, res, next) {
  try {
    const updated = await issueService.updateIssue(req.params.id, req.body, req.user.id);
    return sendSuccess(res, updated, 'Issue report updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function withdrawIssue(req, res, next) {
  try {
    const withdrawn = await issueService.withdrawIssue(req.params.id, req.user.id);
    return sendSuccess(res, withdrawn, 'Issue report withdrawn successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function assignIssue(req, res, next) {
  try {
    const assigned = await issueService.assignIssue(req.params.id, req.body, req.user, false);
    return sendSuccess(res, assigned, 'Issue assigned successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function reassignIssue(req, res, next) {
  try {
    const reassigned = await issueService.assignIssue(req.params.id, req.body, req.user, true);
    return sendSuccess(res, reassigned, 'Issue reassigned successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function transitionIssue(req, res, next) {
  try {
    const transitioned = await issueService.transitionIssue(
      req.params.id,
      req.body.status,
      req.body.reason || '',
      req.user
    );
    return sendSuccess(res, transitioned, 'Issue status updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function resolveIssue(req, res, next) {
  try {
    const resolved = await issueService.resolveIssue(
      req.params.id,
      {
        resolutionNotes: req.body.resolutionNotes,
        evidenceNotes: req.body.evidenceNotes
      },
      req.user
    );
    return sendSuccess(res, resolved, 'Issue marked as resolved', 200);
  } catch (error) {
    next(error);
  }
}

export async function verifyAndCloseIssue(req, res, next) {
  try {
    const closed = await issueService.verifyAndCloseIssue(req.params.id, req.user);
    return sendSuccess(res, closed, 'Issue resolution verified and report closed', 200);
  } catch (error) {
    next(error);
  }
}

export async function reopenIssue(req, res, next) {
  try {
    const reopened = await issueService.reopenIssue(req.params.id, req.body.reason, req.user);
    return sendSuccess(res, reopened, 'Issue reopened for further attention', 200);
  } catch (error) {
    next(error);
  }
}

export async function getIssueTimeline(req, res, next) {
  try {
    const timeline = await issueService.getIssueTimeline(req.params.id, req.user || null);
    return sendSuccess(res, timeline, 'Issue audit timeline retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getStaffIssues(req, res, next) {
  try {
    const result = await issueService.getStaffIssues(req.user.id, req.query);
    return sendSuccess(res, result, 'Assigned staff work queue retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getTriageIssues(req, res, next) {
  try {
    const result = await issueService.getTriageIssues(req.query);
    return sendSuccess(res, result, 'Issue triage queue retrieved', 200);
  } catch (error) {
    next(error);
  }
}

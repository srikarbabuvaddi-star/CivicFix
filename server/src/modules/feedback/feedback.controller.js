import * as feedbackService from './feedback.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function submitFeedback(req, res, next) {
  try {
    const feedback = await feedbackService.submitFeedback(
      req.params.id,
      req.body,
      req.user
    );
    return sendSuccess(res, feedback, 'Feedback submitted successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function getIssueFeedback(req, res, next) {
  try {
    const feedback = await feedbackService.getIssueFeedback(
      req.params.id,
      req.user || null
    );
    return sendSuccess(res, feedback, 'Feedback retrieved', 200);
  } catch (error) {
    next(error);
  }
}


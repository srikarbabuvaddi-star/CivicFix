import { z } from 'zod';
import { VALID_RESOLUTION_QUALITIES } from '../../config/constants.js';

export const submitFeedbackSchema = z.object({
  rating: z
    .number({ required_error: 'Rating is required' })
    .int('Rating must be an integer')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Comment cannot exceed 1000 characters')
    .optional()
    .default(''),
  resolutionQuality: z
    .enum(VALID_RESOLUTION_QUALITIES, {
      errorMap: () => ({ message: `Resolution quality must be one of: ${VALID_RESOLUTION_QUALITIES.join(', ')}` })
    })
    .optional()
});


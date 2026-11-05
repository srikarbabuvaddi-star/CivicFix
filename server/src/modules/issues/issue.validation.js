import { z } from 'zod';
import {
  VALID_ISSUE_CATEGORIES,
  VALID_ISSUE_STATUSES,
  VALID_ISSUE_VISIBILITIES,
  ISSUE_VISIBILITY
} from '../../config/constants.js';

// Coordinates validator: [longitude, latitude]
const coordinatesSchema = z
  .array(z.number({ required_error: 'Coordinates are required' }), {
    required_error: 'Coordinates array [longitude, latitude] is required'
  })
  .length(2, 'Coordinates must be an array of exactly [longitude, latitude]')
  .refine(
    ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
    {
      message: 'Longitude must be between -180 and 180, and latitude between -90 and 90'
    }
  );

const locationSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: coordinatesSchema,
  address: z.string().max(300, 'Address cannot exceed 300 characters').optional().default('')
});

const FORBIDDEN_CLIENT_FIELDS = [
  'issueNumber',
  'reporterId',
  'departmentId',
  'assigneeId',
  'status',
  'priority',
  'duplicateOf',
  'createdAt',
  'updatedAt'
];

function rejectPrivilegedFields(data, ctx) {
  for (const field of FORBIDDEN_CLIENT_FIELDS) {
    if (field in data) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Field '${field}' is privileged and cannot be directly assigned`,
        path: [field]
      });
    }
  }
}

export const createIssueSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(5, 'Title must be at least 5 characters long')
      .max(120, 'Title cannot exceed 120 characters'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters long')
      .max(2000, 'Description cannot exceed 2000 characters'),
    category: z.enum(VALID_ISSUE_CATEGORIES, {
      errorMap: () => ({ message: `Category must be one of: ${VALID_ISSUE_CATEGORIES.join(', ')}` })
    }),
    location: locationSchema,
    visibility: z.enum(VALID_ISSUE_VISIBILITIES).default(ISSUE_VISIBILITY.PUBLIC)
  })
  .passthrough()
  .superRefine(rejectPrivilegedFields);

export const updateIssueSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, 'Title must be at least 5 characters long')
      .max(120, 'Title cannot exceed 120 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters long')
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional(),
    category: z.enum(VALID_ISSUE_CATEGORIES).optional(),
    location: locationSchema.optional(),
    visibility: z.enum(VALID_ISSUE_VISIBILITIES).optional()
  })
  .passthrough()
  .superRefine((data, ctx) => {
    rejectPrivilegedFields(data, ctx);
    const hasAnyField = ['title', 'description', 'category', 'location', 'visibility'].some(
      (f) => data[f] !== undefined
    );
    if (!hasAnyField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one editable field (title, description, category, location, visibility) must be provided'
      });
    }
  });

export const queryIssuesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  category: z.enum(VALID_ISSUE_CATEGORIES).optional(),
  status: z.enum(VALID_ISSUE_STATUSES).optional(),
  timePeriod: z.enum(['all', '7d', '30d', '90d']).optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const assignIssueSchema = z.object({
  departmentId: z
    .string({ required_error: 'Department ID is required' })
    .regex(objectIdRegex, 'Invalid Department ID format'),
  assigneeId: z
    .string({ required_error: 'Assignee ID is required' })
    .regex(objectIdRegex, 'Invalid Assignee ID format'),
  reason: z.string().trim().max(500).optional()
});

export const reassignIssueSchema = z.object({
  departmentId: z
    .string({ required_error: 'Department ID is required' })
    .regex(objectIdRegex, 'Invalid Department ID format'),
  assigneeId: z
    .string({ required_error: 'Assignee ID is required' })
    .regex(objectIdRegex, 'Invalid Assignee ID format'),
  reason: z
    .string({ required_error: 'Reassignment reason is required' })
    .trim()
    .min(5, 'Reassignment reason must be at least 5 characters')
    .max(500, 'Reassignment reason cannot exceed 500 characters')
});

export const transitionIssueSchema = z.object({
  status: z.enum(VALID_ISSUE_STATUSES, {
    errorMap: () => ({ message: `Invalid status. Must be one of: ${VALID_ISSUE_STATUSES.join(', ')}` })
  }),
  reason: z.string().trim().max(1000).optional()
});

export const resolveIssueSchema = z.object({
  resolutionNotes: z
    .string({ required_error: 'Resolution notes are required' })
    .trim()
    .min(10, 'Resolution notes must be at least 10 characters long')
    .max(2000, 'Resolution notes cannot exceed 2000 characters'),
  evidenceNotes: z.string().trim().max(1000).optional()
});

export const reopenIssueSchema = z.object({
  reason: z
    .string({ required_error: 'Reason for reopening is required' })
    .trim()
    .min(10, 'Reopen reason must be at least 10 characters long')
    .max(1000, 'Reopen reason cannot exceed 1000 characters')
});

export const rejectIssueSchema = z.object({
  reason: z
    .string({ required_error: 'Reason for rejection is required' })
    .trim()
    .min(10, 'Rejection reason must be at least 10 characters long')
    .max(1000, 'Rejection reason cannot exceed 1000 characters')
});



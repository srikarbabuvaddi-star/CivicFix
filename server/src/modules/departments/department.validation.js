import { z } from 'zod';
import { VALID_ISSUE_CATEGORIES } from '../../config/constants.js';

export const createDepartmentSchema = z.object({
  name: z
    .string({ required_error: 'Department name is required' })
    .trim()
    .min(2, 'Department name must be at least 2 characters long')
    .max(100, 'Department name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .default(''),
  categoriesHandled: z
    .array(z.enum(VALID_ISSUE_CATEGORIES), {
      required_error: 'At least one handled category must be provided'
    })
    .min(1, 'At least one category must be handled by this department'),
  serviceArea: z
    .string()
    .trim()
    .max(150, 'Service area cannot exceed 150 characters')
    .optional()
    .default('Municipality-Wide')
});

export const updateDepartmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Department name must be at least 2 characters long')
      .max(100, 'Department name cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
    categoriesHandled: z
      .array(z.enum(VALID_ISSUE_CATEGORIES))
      .min(1, 'At least one category must be handled by this department')
      .optional(),
    serviceArea: z
      .string()
      .trim()
      .max(150, 'Service area cannot exceed 150 characters')
      .optional(),
    isActive: z.boolean().optional()
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  );

export const queryDepartmentsSchema = z.object({
  isActive: z
    .enum(['true', 'false', 'all'])
    .optional()
    .transform((val) => (val === undefined ? 'all' : val)),
  search: z.string().trim().max(100).optional()
});

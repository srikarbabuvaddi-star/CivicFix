import { z } from 'zod';
import { VALID_ACCOUNT_STATUSES } from '../../config/constants.js';

export const assignStaffDepartmentSchema = z.object({
  departmentId: z
    .string({ required_error: 'Department ID is required' })
    .nullable()
    .refine((val) => val === null || /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Department ID must be a valid 24-character hexadecimal ObjectId or null'
    })
});

export const updateStaffStatusSchema = z
  .object({
    status: z.enum(VALID_ACCOUNT_STATUSES).optional(),
    accountStatus: z.enum(VALID_ACCOUNT_STATUSES).optional()
  })
  .refine((data) => data.status || data.accountStatus, {
    message: 'Status must be provided via status or accountStatus'
  });

export const queryStaffSchema = z.object({
  departmentId: z.string().optional(),
  status: z.enum(VALID_ACCOUNT_STATUSES).optional(),
  search: z.string().trim().max(100).optional()
});

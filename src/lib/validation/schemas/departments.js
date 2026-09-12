import { z } from 'zod';
import { academicLabelField, codeField } from '../fields';

const optionalUuid = z
  .string()
  .optional()
  .default('')
  .transform((v) => (String(v || '').trim() ? String(v).trim() : ''));

/** POST /api/v1/departments */
export const departmentCreateSchema = z.object({
  college_id: z.string().min(1, 'Select a college'),
  name: academicLabelField('Department name'),
  code: codeField('Department code', { required: false }),
  hod_user_id: optionalUuid,
});

/** PATCH /api/v1/departments/{id} — college_id immutable */
export const departmentUpdateSchema = z.object({
  name: academicLabelField('Department name'),
  code: codeField('Department code', { required: false }),
  hod_user_id: optionalUuid,
});

/** CA create — college forced by session, no college picker */
export const tenantDepartmentCreateSchema = z.object({
  name: academicLabelField('Department name'),
  code: codeField('Department code', { required: false }),
  hod_user_id: optionalUuid,
});

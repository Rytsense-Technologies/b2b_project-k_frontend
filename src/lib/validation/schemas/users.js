import { z } from 'zod';
import { academicLabelField, emailField, personNameField, phoneField } from '../fields';

export const platformUserCreateSchema = z
  .object({
    first_name: personNameField('First name'),
    last_name: personNameField('Last name', { required: false }),
    email: emailField('Email'),
    phone_number: phoneField('Phone number', { required: false }),
    role: z.enum(['superadmin', 'college_admin', 'faculty', 'student'], {
      required_error: 'Select a role',
    }),
    college_id: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.role !== 'superadmin' && !String(data.college_id || '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select an institution',
        path: ['college_id'],
      });
    }
  });

/** College Admin creates a student or faculty in their own tenant (no college picker). */
export const tenantMemberCreateSchema = z.object({
  first_name: personNameField('First name'),
  last_name: personNameField('Last name', { required: false }),
  email: emailField('Email'),
  department: academicLabelField('Department', { required: false }),
});

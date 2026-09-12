import { z } from 'zod';
import {
  academicLabelField,
  emailField,
  personNameField,
  phoneField,
  positiveIntField,
} from '../fields';

/** Matches backend `MAX_COURSE_DURATION_YEARS` / teaching-scope bounds. */
export const MAX_COURSE_DURATION_YEARS = 8;
export const MAX_ASSIGNED_YEAR = MAX_COURSE_DURATION_YEARS;
export const MAX_ASSIGNED_SEMESTER = MAX_COURSE_DURATION_YEARS * 2;
export const MAX_ASSIGNED_ENTRIES = 16;

const PLATFORM_ROLES = ['superadmin', 'college_admin', 'hod', 'faculty', 'student'];

/**
 * Optional comma-separated or array of ints (teaching scope).
 * Empty → null. Caps length and per-item max to mirror BE validators.
 */
function optionalIntListField(label, { maxItem, maxEntries = MAX_ASSIGNED_ENTRIES } = {}) {
  return z
    .union([z.string(), z.array(z.union([z.string(), z.number()])), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null || v === '') return null;
      const parts = Array.isArray(v)
        ? v.map((x) => String(x).trim()).filter(Boolean)
        : String(v)
            .split(/[,;\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);
      if (!parts.length) return null;
      return parts.map((p) => Number(String(p).replace(/\D/g, ''))).filter((n) => Number.isFinite(n));
    })
    .superRefine((list, ctx) => {
      if (list == null) return;
      if (list.length > maxEntries) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Enter at most ${maxEntries} ${label.toLowerCase()} values`,
        });
        return;
      }
      for (const n of list) {
        if (!Number.isInteger(n) || n < 1 || n > maxItem) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Each ${label.toLowerCase()} must be a whole number from 1 to ${maxItem}`,
          });
          return;
        }
      }
      if (new Set(list).size !== list.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} cannot contain duplicate values`,
        });
      }
    });
}

function yearWithinDurationRefine(data, ctx) {
  if (
    data.year_of_study != null
    && data.course_duration_years != null
    && data.year_of_study > data.course_duration_years
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Current year cannot exceed program duration',
      path: ['year_of_study'],
    });
  }
}

const academicOptionalFields = {
  department: academicLabelField('Department', { required: false }),
  course_duration_years: positiveIntField('Program duration (years)', {
    required: false,
    max: MAX_COURSE_DURATION_YEARS,
  }),
  year_of_study: positiveIntField('Current year of study', {
    required: false,
    max: MAX_COURSE_DURATION_YEARS,
  }),
  assigned_years: optionalIntListField('Assigned years', { maxItem: MAX_ASSIGNED_YEAR }),
  assigned_semesters: optionalIntListField('Assigned semesters', {
    maxItem: MAX_ASSIGNED_SEMESTER,
  }),
};

export const platformUserCreateSchema = z
  .object({
    first_name: personNameField('First name'),
    last_name: personNameField('Last name'),
    email: emailField('Email'),
    phone_number: phoneField('Phone number', { required: false }),
    role: z.enum(PLATFORM_ROLES, {
      required_error: 'Select a role',
    }),
    college_id: z.string().optional().default(''),
    ...academicOptionalFields,
  })
  .superRefine((data, ctx) => {
    if (data.role !== 'superadmin' && !String(data.college_id || '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select an institution',
        path: ['college_id'],
      });
    }
    yearWithinDurationRefine(data, ctx);
  });

const optionalDepartmentId = z
  .string()
  .optional()
  .default('')
  .transform((v) => (String(v || '').trim() ? String(v).trim() : ''));

/** College Admin creates a student in their own tenant (no college picker). */
export const tenantStudentCreateSchema = z
  .object({
    first_name: personNameField('First name'),
    last_name: personNameField('Last name'),
    email: emailField('Email'),
    phone_number: phoneField('Phone number', { required: false }),
    department_id: optionalDepartmentId,
    course_duration_years: positiveIntField('Program duration (years)', {
      required: false,
      max: MAX_COURSE_DURATION_YEARS,
    }),
    year_of_study: positiveIntField('Current year of study', {
      required: false,
      max: MAX_COURSE_DURATION_YEARS,
    }),
  })
  .superRefine(yearWithinDurationRefine);

/** College Admin creates faculty or HOD (optional teaching scope). */
export const tenantFacultyCreateSchema = z.object({
  first_name: personNameField('First name'),
  last_name: personNameField('Last name'),
  email: emailField('Email'),
  phone_number: phoneField('Phone number', { required: false }),
  role: z.enum(['faculty', 'hod'], { required_error: 'Select a role' }),
  department_id: optionalDepartmentId,
  assigned_years: optionalIntListField('Assigned years', { maxItem: MAX_ASSIGNED_YEAR }),
  assigned_semesters: optionalIntListField('Assigned semesters', {
    maxItem: MAX_ASSIGNED_SEMESTER,
  }),
});

/** @deprecated Prefer tenantStudentCreateSchema / tenantFacultyCreateSchema */
export const tenantMemberCreateSchema = tenantStudentCreateSchema;

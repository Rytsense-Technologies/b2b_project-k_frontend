import { z } from 'zod';
import {
  codeField,
  emailField,
  institutionNameField,
  personNameField,
  phoneField,
  positiveIntField,
} from '../fields';
import { indiaLocationFields, refineIndiaDistrict } from './indiaLocation';

const collegeAdminSchema = z.object({
  name: personNameField('Admin name'),
  email: emailField('Admin email'),
  mobile: phoneField('Mobile', { required: false }),
});

/** Matches POST /api/v1/colleges — plan + student_seat_cap; India location fields. */
export const collegeCreateSchema = z
  .object({
    university_id: z.string().min(1, 'Select a university'),
    name: institutionNameField('College name'),
    code: codeField('College code'),
    ...indiaLocationFields,
    plan: z.enum(['standard', 'premium'], {
      required_error: 'Select a plan',
    }),
    student_seat_cap: positiveIntField('Seat cap', { required: true, max: 500000 }),
    admins: z.array(collegeAdminSchema).min(1, 'Add at least one administrator'),
  })
  .superRefine(refineIndiaDistrict);

/** PATCH — code and university_id are immutable. */
export const collegeUpdateSchema = z
  .object({
    name: institutionNameField('College name'),
    ...indiaLocationFields,
    plan: z.enum(['standard', 'premium'], {
      required_error: 'Select a plan',
    }),
    student_seat_cap: positiveIntField('Seat cap', { required: true, max: 500000 }),
  })
  .superRefine(refineIndiaDistrict);

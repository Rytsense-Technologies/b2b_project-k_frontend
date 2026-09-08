import { z } from 'zod';
import {
  addressField,
  codeField,
  institutionNameField,
} from '../fields';
import { indiaLocationFieldsOptionalState, refineIndiaDistrict } from './indiaLocation';

export const universityCreateSchema = z
  .object({
    name: institutionNameField('University name'),
    code: codeField('University code'),
    ...indiaLocationFieldsOptionalState,
    address: addressField('Address', { required: false }),
  })
  .superRefine(refineIndiaDistrict);

/** Code is immutable after create — kept optional for display-only form state. */
export const universityUpdateSchema = z
  .object({
    name: institutionNameField('University name'),
    code: z.string().optional(),
    ...indiaLocationFieldsOptionalState,
    address: addressField('Address', { required: false }),
  })
  .superRefine(refineIndiaDistrict);

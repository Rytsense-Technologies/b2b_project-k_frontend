import { z } from 'zod';
import {
  INDIA_COUNTRY,
  getDistrictsForState,
  INDIA_STATES,
} from '@/lib/india';
import {
  pincodeField,
  placeNameField,
} from '../fields';

const STATE_NAMES = INDIA_STATES.map((s) => s.name);

/**
 * Shared India location shape for institution forms.
 * Country is always IN — never collect another country.
 */
export const indiaLocationFields = {
  country: z.literal(INDIA_COUNTRY.code).default(INDIA_COUNTRY.code),
  state: z
    .string({ required_error: 'Select a state' })
    .transform((v) => String(v ?? '').trim())
    .refine((v) => STATE_NAMES.includes(v), 'Select a state from the list'),
  district: z
    .string()
    .transform((v) => String(v ?? '').trim())
    .optional()
    .default(''),
  city: placeNameField('City', { required: false }),
  pincode: pincodeField('Pincode', { required: false }),
};

/** Optional state (universities historically had free-text state). Prefer list. */
export const indiaLocationFieldsOptionalState = {
  country: z.literal(INDIA_COUNTRY.code).default(INDIA_COUNTRY.code),
  state: z
    .string()
    .transform((v) => String(v ?? '').trim())
    .pipe(
      z.union([
        z.literal(''),
        z.string().refine((v) => STATE_NAMES.includes(v), 'Select a state from the list'),
      ]),
    ),
  district: z
    .string()
    .transform((v) => String(v ?? '').trim())
    .optional()
    .default(''),
  city: placeNameField('City', { required: false }),
  pincode: pincodeField('Pincode', { required: false }),
};

/** Cross-field: district must belong to selected state when both set. */
export function refineIndiaDistrict(data, ctx) {
  if (!data?.district) return;
  if (!data?.state) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a state before choosing a district',
      path: ['district'],
    });
    return;
  }
  const allowed = getDistrictsForState(data.state);
  if (!allowed.includes(data.district)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a district in the chosen state',
      path: ['district'],
    });
  }
}

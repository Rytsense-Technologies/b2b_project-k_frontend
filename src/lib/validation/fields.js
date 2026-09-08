import { z } from 'zod';
import {
  collapseSpaces,
  normalizeCode,
  normalizeEmail,
  normalizePhone,
  normalizeSearch,
  trimValue,
} from './normalize';

/**
 * Field Rules Catalog — single source of truth for charset, length, messages.
 * Compose page schemas from these helpers; do not invent regex in page files.
 *
 * Quirri §34: errors must be calm, specific, and actionable.
 */

const PERSON_NAME_RE = /^[\p{L}][\p{L}\s.'’-]*$/u;
const INSTITUTION_NAME_RE = /^[\p{L}\d][\p{L}\d\s&.,()\-’']*$/u;
const PLACE_NAME_RE = /^[\p{L}][\p{L}\s.'’-]*$/u;
const CODE_RE = /^[A-Za-z0-9_-]+$/;
const ADDRESS_RE = /^[\p{L}\d\s&.,#/\-()'’]+$/u;

function requiredString(message) {
  return z.string({ required_error: message }).transform(collapseSpaces);
}

/**
 * @typedef {object} FieldRule
 * @property {string} id
 * @property {string} labelHint
 * @property {number} [min]
 * @property {number} max
 * @property {RegExp} [pattern]
 * @property {string} [inputMode]
 * @property {string} [autoComplete]
 * @property {string} [type] HTML input type
 * @property {(incoming: string, current: string) => string} [filter]
 */

/** @type {Record<string, FieldRule>} */
export const FIELD_RULES = {
  personName: {
    id: 'personName',
    labelHint: 'Letters, spaces, and .\'- only',
    min: 1,
    max: 80,
    pattern: PERSON_NAME_RE,
    inputMode: 'text',
    autoComplete: 'name',
    type: 'text',
    filter: (incoming) => incoming.replace(/[^\p{L}\s.'’-]/gu, ''),
  },
  institutionName: {
    id: 'institutionName',
    labelHint: 'Letters, numbers, and limited punctuation',
    min: 2,
    max: 160,
    pattern: INSTITUTION_NAME_RE,
    inputMode: 'text',
    autoComplete: 'organization',
    type: 'text',
    filter: (incoming) => incoming.replace(/[^\p{L}\d\s&.,()\-’']/gu, ''),
  },
  placeName: {
    id: 'placeName',
    labelHint: 'City or place name',
    min: 2,
    max: 80,
    pattern: PLACE_NAME_RE,
    inputMode: 'text',
    autoComplete: 'address-level2',
    type: 'text',
    filter: (incoming) => incoming.replace(/[^\p{L}\s.'’-]/gu, ''),
  },
  /** Indian PIN — always 6 digits; country is India-only. */
  pincode: {
    id: 'pincode',
    labelHint: '6-digit Indian pincode',
    min: 6,
    max: 6,
    pattern: /^\d{6}$/,
    inputMode: 'numeric',
    autoComplete: 'postal-code',
    type: 'text',
    filter: (incoming) => String(incoming ?? '').replace(/\D/g, '').slice(0, 6),
  },
  code: {
    id: 'code',
    labelHint: 'Letters, numbers, underscore, hyphen',
    min: 2,
    max: 32,
    pattern: CODE_RE,
    inputMode: 'text',
    autoComplete: 'off',
    type: 'text',
    filter: (incoming) => incoming.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase(),
  },
  email: {
    id: 'email',
    labelHint: 'Work or institutional email',
    min: 5,
    max: 254,
    inputMode: 'email',
    autoComplete: 'email',
    type: 'email',
    filter: (incoming) => incoming.replace(/\s/g, '').toLowerCase(),
  },
  phone: {
    id: 'phone',
    labelHint: 'Indian mobile; defaults to +91',
    min: 10,
    max: 16,
    inputMode: 'tel',
    autoComplete: 'tel',
    type: 'tel',
    filter: (incoming) => {
      const next = String(incoming ?? '');
      if (next === '' || next === '+' || next === '+9') return '+91';
      if (!next.startsWith('+')) {
        const digits = next.replace(/\D/g, '').replace(/^91/, '');
        return `+91${digits}`.slice(0, 16);
      }
      return `+${next.replace(/\D/g, '')}`.slice(0, 16);
    },
  },
  password: {
    id: 'password',
    labelHint: 'At least 8 characters, one uppercase letter, one number',
    min: 8,
    max: 128,
    inputMode: 'text',
    autoComplete: 'new-password',
    type: 'password',
  },
  otp: {
    id: 'otp',
    labelHint: '6 digits',
    min: 6,
    max: 6,
    pattern: /^\d{6}$/,
    inputMode: 'numeric',
    autoComplete: 'one-time-code',
    type: 'text',
    filter: (incoming) => incoming.replace(/\D/g, '').slice(0, 6),
  },
  address: {
    id: 'address',
    labelHint: 'Street or campus address',
    min: 0,
    max: 240,
    pattern: ADDRESS_RE,
    inputMode: 'text',
    autoComplete: 'street-address',
    type: 'text',
    filter: (incoming) => incoming.replace(/[^\p{L}\d\s&.,#/\-()'’]/gu, ''),
  },
  search: {
    id: 'search',
    labelHint: 'Search',
    min: 0,
    max: 120,
    inputMode: 'search',
    autoComplete: 'off',
    type: 'search',
  },
  url: {
    id: 'url',
    labelHint: 'https://…',
    min: 0,
    max: 2048,
    inputMode: 'url',
    autoComplete: 'url',
    type: 'url',
  },
  academicLabel: {
    id: 'academicLabel',
    labelHint: 'Department, program, subject, or chapter title',
    min: 2,
    max: 160,
    pattern: INSTITUTION_NAME_RE,
    inputMode: 'text',
    autoComplete: 'off',
    type: 'text',
    filter: (incoming) => incoming.replace(/[^\p{L}\d\s&.,()\-’']/gu, ''),
  },
  positiveInt: {
    id: 'positiveInt',
    labelHint: 'Whole number greater than zero',
    min: 1,
    max: 9,
    inputMode: 'numeric',
    autoComplete: 'off',
    type: 'text',
    filter: (incoming) => incoming.replace(/\D/g, '').slice(0, 9),
  },
};

export function getFieldRule(fieldType) {
  const rule = FIELD_RULES[fieldType];
  if (!rule) {
    throw new Error(`Unknown field type "${fieldType}". Use a key from FIELD_RULES.`);
  }
  return rule;
}

export function personNameField(label = 'Name', { required = true } = {}) {
  const rule = FIELD_RULES.personName;
  const validName = z
    .string()
    .min(rule.min, `${label} is required`)
    .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
    .regex(rule.pattern, `Enter a valid ${label.toLowerCase()} using letters only`);

  if (!required) {
    return z
      .string()
      .transform(collapseSpaces)
      .pipe(z.union([z.literal(''), validName]));
  }

  return requiredString(`${label} is required`).pipe(validName);
}

export function institutionNameField(label = 'Name') {
  const rule = FIELD_RULES.institutionName;
  return requiredString(`${label} is required`).pipe(
    z
      .string()
      .min(rule.min, `${label} must be at least ${rule.min} characters`)
      .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
      .regex(rule.pattern, `Enter a valid ${label.toLowerCase()}`),
  );
}

export function placeNameField(label = 'Place', { required = false } = {}) {
  const rule = FIELD_RULES.placeName;
  if (!required) {
    return z
      .string()
      .transform(collapseSpaces)
      .pipe(
        z.union([
          z.literal(''),
          z
            .string()
            .min(rule.min, `${label} must be at least ${rule.min} characters`)
            .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
            .regex(rule.pattern, `Enter a valid ${label.toLowerCase()}`),
        ]),
      );
  }
  return requiredString(`${label} is required`).pipe(
    z
      .string()
      .min(rule.min, `${label} must be at least ${rule.min} characters`)
      .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
      .regex(rule.pattern, `Enter a valid ${label.toLowerCase()}`),
  );
}

/** Indian 6-digit PIN. Country is always India in this product. */
export function pincodeField(label = 'Pincode', { required = false } = {}) {
  const rule = FIELD_RULES.pincode;
  const valid = z
    .string()
    .length(rule.max, `${label} must be ${rule.max} digits`)
    .regex(rule.pattern, `Enter a valid 6-digit Indian ${label.toLowerCase()}`);

  if (!required) {
    return z
      .string()
      .transform((v) => String(v ?? '').replace(/\D/g, '').slice(0, 6))
      .pipe(z.union([z.literal(''), valid]));
  }
  return z
    .string({ required_error: `${label} is required` })
    .transform((v) => String(v ?? '').replace(/\D/g, '').slice(0, 6))
    .pipe(valid);
}

export function codeField(label = 'Code') {
  const rule = FIELD_RULES.code;
  return z
    .string({ required_error: `${label} is required` })
    .transform(normalizeCode)
    .pipe(
      z
        .string()
        .min(rule.min, `${label} must be at least ${rule.min} characters`)
        .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
        .regex(rule.pattern, `${label} may only contain letters, numbers, underscore, and hyphen`),
    );
}

export function emailField(label = 'Email') {
  const rule = FIELD_RULES.email;
  return z
    .string({ required_error: `${label} is required` })
    .transform(normalizeEmail)
    .pipe(
      z
        .string()
        .min(1, `Enter a valid ${label.toLowerCase()} address`)
        .max(rule.max, `${label} is too long`)
        .email(`Enter a valid ${label.toLowerCase()} address`),
    );
}

export function phoneField(label = 'Phone', { required = true } = {}) {
  const rule = FIELD_RULES.phone;
  const core = z
    .string()
    .transform(normalizePhone)
    .pipe(
      z
        .string()
        .refine((v) => {
          const digits = v.replace(/\D/g, '');
          return digits.length >= rule.min && digits.length <= 15;
        }, `Enter a valid ${label.toLowerCase()} number`),
    );

  if (!required) {
    return z
      .string()
      .transform((v) => normalizePhone(v))
      .pipe(z.union([z.literal(''), core]));
  }
  return z
    .string({ required_error: `${label} is required` })
    .transform(normalizePhone)
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .refine((v) => {
          const digits = v.replace(/\D/g, '');
          return digits.length >= rule.min && digits.length <= 15;
        }, `Enter a valid ${label.toLowerCase()} number`),
    );
}

export function passwordField(label = 'Password') {
  const rule = FIELD_RULES.password;
  return z
    .string({ required_error: `${label} is required` })
    .min(rule.min, `${label} must be at least ${rule.min} characters`)
    .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
    .regex(/[A-Z]/, `${label} must contain at least one uppercase letter`)
    .regex(/[0-9]/, `${label} must contain at least one number`);
}

export function otpField(label = 'OTP') {
  const rule = FIELD_RULES.otp;
  return z
    .string({ required_error: `${label} is required` })
    .transform(trimValue)
    .pipe(
      z
        .string()
        .length(rule.max, `${label} must be ${rule.max} digits`)
        .regex(/^\d+$/, `${label} must contain only digits`),
    );
}

export function addressField(label = 'Address', { required = false } = {}) {
  const rule = FIELD_RULES.address;
  if (!required) {
    return z
      .string()
      .transform(collapseSpaces)
      .pipe(
        z.union([
          z.literal(''),
          z
            .string()
            .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
            .regex(rule.pattern, `Enter a valid ${label.toLowerCase()}`),
        ]),
      );
  }
  return requiredString(`${label} is required`).pipe(
    z
      .string()
      .min(2, `${label} is required`)
      .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
      .regex(rule.pattern, `Enter a valid ${label.toLowerCase()}`),
  );
}

export function searchField() {
  const rule = FIELD_RULES.search;
  return z
    .string()
    .transform(normalizeSearch)
    .pipe(z.string().max(rule.max, `Search must be ${rule.max} characters or fewer`));
}

export function urlField(label = 'URL', { required = false } = {}) {
  const rule = FIELD_RULES.url;
  if (!required) {
    return z
      .string()
      .transform(trimValue)
      .pipe(
        z.union([
          z.literal(''),
          z.string().url(`Enter a valid ${label}`).max(rule.max),
        ]),
      );
  }
  return z
    .string({ required_error: `${label} is required` })
    .transform(trimValue)
    .pipe(z.string().url(`Enter a valid ${label}`).max(rule.max));
}

export function academicLabelField(label = 'Title', { required = true } = {}) {
  const rule = FIELD_RULES.academicLabel;
  const valid = z
    .string()
    .min(rule.min, `${label} must be at least ${rule.min} characters`)
    .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
    .regex(rule.pattern, `Enter a valid ${label.toLowerCase()}`);

  if (!required) {
    return z
      .string()
      .transform(collapseSpaces)
      .pipe(z.union([z.literal(''), valid]));
  }
  return requiredString(`${label} is required`).pipe(valid);
}

export function positiveIntField(label = 'Number', { required = false, max = 999999 } = {}) {
  return z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null || v === '') return '';
      return String(v).replace(/\D/g, '');
    })
    .superRefine((digits, ctx) => {
      if (!digits) {
        if (required) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is required` });
        }
        return;
      }
      const n = Number(digits);
      if (!Number.isFinite(n) || n < 1 || n > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Enter a ${label.toLowerCase()} between 1 and ${max.toLocaleString('en-IN')}`,
        });
      }
    })
    .transform((digits) => (digits ? Number(digits) : null));
}

/** Apply catalog filter for controlled inputs (keystroke / paste). */
export function applyFieldFilter(fieldType, nextValue, currentValue = '') {
  const rule = getFieldRule(fieldType);
  const raw = String(nextValue ?? '');
  if (!rule.filter) {
    return raw.slice(0, rule.max);
  }
  return rule.filter(raw, currentValue).slice(0, rule.max);
}

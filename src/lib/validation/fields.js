import { z } from 'zod';
import {
  collapseSpaces,
  normalizeCode,
  normalizeEmail,
  normalizePhone,
  normalizeSearch,
  formatIndianPhone,
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
    // Shown as "+91 89397 37644"; normalizePhone removes the spaces before saving.
    filter: (incoming) => {
      const next = String(incoming ?? '');
      if (next.trim() === '' || next === '+' || next === '+9') return '+91';
      if (!next.startsWith('+')) {
        const digits = next.replace(/\D/g, '').replace(/^91(?=\d{10})/, '');
        return formatIndianPhone(`+91${digits}`);
      }
      const digits = next.replace(/\D/g, '');
      if (digits.startsWith('91')) return formatIndianPhone(`+${digits}`);
      return `+${digits}`.slice(0, 16);
    },
  },
  password: {
    id: 'password',
    labelHint: 'At least 8 characters with upper- and lowercase letters and a number',
    min: 8,
    max: 72,
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
  /** Lesson-plan / slide copy (narration, bullet lists) — long free text */
  lessonText: {
    id: 'lessonText',
    labelHint: 'Lesson narration or slide points',
    min: 0,
    max: 4000,
    inputMode: 'text',
    autoComplete: 'off',
    type: 'text',
    filter: (incoming) => String(incoming ?? '').slice(0, 4000),
  },
  /** MCQ stem — unicode, 3–1000 chars (backend check_question). */
  mcqQuestion: {
    id: 'mcqQuestion',
    labelHint: 'Question text',
    min: 3,
    max: 1000,
    inputMode: 'text',
    autoComplete: 'off',
    type: 'text',
    filter: (incoming) => String(incoming ?? '').slice(0, 1000),
  },
  mcqOption: {
    id: 'mcqOption',
    labelHint: 'Answer option',
    min: 1,
    max: 500,
    inputMode: 'text',
    autoComplete: 'off',
    type: 'text',
    filter: (incoming) => String(incoming ?? '').slice(0, 500),
  },
  mcqExplanation: {
    id: 'mcqExplanation',
    labelHint: 'Explanation (optional)',
    min: 0,
    max: 1000,
    inputMode: 'text',
    autoComplete: 'off',
    type: 'text',
    filter: (incoming) => String(incoming ?? '').slice(0, 1000),
  },
  /** Staff reason when resetting a student quiz attempt. */
  resetReason: {
    id: 'resetReason',
    labelHint: 'Why you are resetting this attempt',
    min: 0,
    max: 300,
    inputMode: 'text',
    autoComplete: 'off',
    type: 'text',
    filter: (incoming) => String(incoming ?? '').slice(0, 300),
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
      .min(1, `${label} is required`)
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
            .min(1, `${label} is required`)
            .min(rule.min, `${label} must be at least ${rule.min} characters`)
            .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
            .regex(rule.pattern, `Enter a valid ${label.toLowerCase()}`),
        ]),
      );
  }
  return requiredString(`${label} is required`).pipe(
    z
      .string()
      .min(1, `${label} is required`)
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

export function codeField(label = 'Code', { required = true } = {}) {
  const rule = FIELD_RULES.code;
  const valid = z
    .string()
    .min(1, `${label} is required`)
    .min(rule.min, `${label} must be at least ${rule.min} characters`)
    .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
    .regex(rule.pattern, `${label} may only contain letters, numbers, underscore, and hyphen`);

  if (!required) {
    return z
      .string()
      .transform(normalizeCode)
      .pipe(z.union([z.literal(''), valid]));
  }

  return z
    .string({ required_error: `${label} is required` })
    .transform(normalizeCode)
    .pipe(valid);
}

export function emailField(label = 'Email') {
  const rule = FIELD_RULES.email;
  return z
    .string({ required_error: `${label} is required` })
    .transform(normalizeEmail)
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .max(rule.max, `${label} is too long`)
        .email(`Enter a valid ${/address$/i.test(label) ? label.toLowerCase() : `${label.toLowerCase()} address`}`),
    );
}

/**
 * Indian mobile → "+91XXXXXXXXXX", or null when it isn't one.
 * Accepts an optional "+91" / "91" / "0" prefix (spaces, hyphens, brackets ignored),
 * then exactly 10 digits starting with 6–9 (same rule as the backend import).
 */
export function toIndianMobile(value) {
  const s = String(value ?? '').replace(/[\s\-().]/g, '');
  let d;
  if (/^\+91\d{10}$/.test(s)) d = s.slice(3);
  else if (/^91\d{10}$/.test(s)) d = s.slice(2);
  else if (/^0\d{10}$/.test(s)) d = s.slice(1);
  else if (/^\d{10}$/.test(s)) d = s;
  else return null;
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

export const PHONE_RULE_MESSAGE = 'Enter a 10-digit Indian mobile number';

export function phoneField(label = 'Phone', { required = true } = {}) {
  const toMobile = (v, ctx) => {
    const m = toIndianMobile(v);
    if (!m) {
      ctx.addIssue({ code: 'custom', message: PHONE_RULE_MESSAGE });
      return z.NEVER;
    }
    return m;
  };

  if (!required) {
    return z
      .string()
      // The input pre-fills "+91"; a bare country code means the optional field was left empty.
      .transform((v, ctx) => {
        const p = normalizePhone(v);
        if (p === '' || p === '+' || p === '+91') return '';
        return toMobile(p, ctx);
      });
  }
  return z
    .string({ required_error: `${label} is required` })
    .transform((v, ctx) => {
      const p = normalizePhone(v);
      if (p === '' || p === '+' || p === '+91') {
        ctx.addIssue({ code: 'custom', message: `${label} is required` });
        return z.NEVER;
      }
      return toMobile(p, ctx);
    });
}

export function passwordField(label = 'Password') {
  const rule = FIELD_RULES.password;
  return z
    .string({ required_error: `${label} is required` })
    .min(1, `${label} is required`)
    .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
    // Mirrors the backend rule (8–72 chars, upper + lower + digit) with ONE
    // message, so the form never lists the rules piecemeal.
    .refine(
      (v) => v.length === 0 || v.length > rule.max || isStrongPassword(v),
      PASSWORD_RULE_MESSAGE,
    );
}

/** The single helper/error text for new passwords. */
export const PASSWORD_RULE_MESSAGE =
  'Use at least 8 characters with upper- and lowercase letters and a number';

/** True when `v` meets the backend password policy (8–72, A-Z, a-z, 0-9). */
export function isStrongPassword(v) {
  const s = String(v ?? '');
  const { min, max } = FIELD_RULES.password;
  return s.length >= min && s.length <= max && /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s);
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
    .min(1, `${label} is required`)
    .min(rule.min, `${label} must be at least ${rule.min} characters`)
    .max(rule.max, `${label} must be ${rule.max} characters or fewer`)
    .regex(rule.pattern, `Enter a valid ${label.toLowerCase()}`);

  if (!required) {
    return z
      .string()
      .transform(collapseSpaces)
      .pipe(z.union([z.literal(''), valid]));
  }
  return requiredString(`${label} is required`)
    .pipe(z.string().min(1, `${label} is required`))
    .pipe(valid);
}

export function mcqQuestionField(label = 'Question') {
  const rule = FIELD_RULES.mcqQuestion;
  return z
    .string({ required_error: `${label} is required` })
    .transform((v) => String(v ?? '').trim())
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .min(rule.min, 'The question is too short.')
        .max(rule.max, `Keep the ${label.toLowerCase()} to ${rule.max} characters or fewer`),
    );
}

export function mcqOptionField(label = 'Option', { required = true } = {}) {
  const rule = FIELD_RULES.mcqOption;
  const valid = z
    .string()
    .min(1, `${label} is required`)
    .max(rule.max, `Keep ${label} to ${rule.max} characters or fewer`);
  if (!required) {
    return z
      .string()
      .transform((v) => String(v ?? '').trim())
      .pipe(z.union([z.literal(''), valid]));
  }
  return z
    .string({ required_error: `${label} is required` })
    .transform((v) => String(v ?? '').trim())
    .pipe(valid);
}

export function mcqExplanationField(label = 'Explanation') {
  const rule = FIELD_RULES.mcqExplanation;
  return z
    .string()
    .transform((v) => String(v ?? '').trim())
    .pipe(z.string().max(rule.max, `Keep the ${label.toLowerCase()} to ${rule.max} characters or fewer`));
}

export function resetReasonField(label = 'Reason') {
  const rule = FIELD_RULES.resetReason;
  return z
    .string()
    .transform((v) => String(v ?? '').trim())
    .pipe(z.string().max(rule.max, `Keep the ${label.toLowerCase()} to ${rule.max} characters or fewer`));
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

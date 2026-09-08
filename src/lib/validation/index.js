/**
 * Field Rules & Validation — public API
 * Prefer importing from here in pages and components.
 */

export {
  FIELD_RULES,
  getFieldRule,
  applyFieldFilter,
  personNameField,
  institutionNameField,
  placeNameField,
  pincodeField,
  codeField,
  emailField,
  phoneField,
  passwordField,
  otpField,
  addressField,
  searchField,
  urlField,
  academicLabelField,
  positiveIntField,
} from './fields';

export {
  trimValue,
  collapseSpaces,
  normalizeEmail,
  normalizePhone,
  normalizeCode,
  normalizeSearch,
} from './normalize';

export {
  loginSchema,
  signupSchema,
  otpSchema,
  profileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schemas/auth';

export {
  universityCreateSchema,
  universityUpdateSchema,
} from './schemas/universities';

export { platformUserCreateSchema, tenantMemberCreateSchema } from './schemas/users';

export {
  collegeCreateSchema,
  collegeUpdateSchema,
} from './schemas/colleges';

export {
  settingsProfileSchema,
  settingsPasswordSchema,
} from './schemas/settings';

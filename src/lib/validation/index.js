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
  toIndianMobile,
  PHONE_RULE_MESSAGE,
  passwordField,
  PASSWORD_RULE_MESSAGE,
  isStrongPassword,
  otpField,
  addressField,
  searchField,
  urlField,
  academicLabelField,
  mcqQuestionField,
  mcqOptionField,
  mcqExplanationField,
  resetReasonField,
  positiveIntField,
} from './fields';

export {
  trimValue,
  collapseSpaces,
  normalizeEmail,
  normalizePhone,
  formatIndianPhone,
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

export {
  platformUserCreateSchema,
  tenantMemberCreateSchema,
  tenantStudentCreateSchema,
  tenantFacultyCreateSchema,
  studentDepartmentChangeSchema,
  MAX_COURSE_DURATION_YEARS,
  MAX_ASSIGNED_YEAR,
  MAX_ASSIGNED_SEMESTER,
} from './schemas/users';

export {
  collegeCreateSchema,
  collegeUpdateSchema,
} from './schemas/colleges';

export {
  departmentCreateSchema,
  departmentUpdateSchema,
  tenantDepartmentCreateSchema,
} from './schemas/departments';

export {
  MAX_PROGRAMME_SEMESTERS,
  programmeCreateSchema,
  programmeUpdateSchema,
  semesterSchema,
  subjectSchema,
  chapterSchema,
} from './schemas/academics';

export {
  settingsProfileSchema,
  settingsPasswordSchema,
} from './schemas/settings';

export {
  mcqSubmitSchema,
  mcqQuestionEditSchema,
  mcqQuestionCreateSchema,
  mcqResetReasonSchema,
} from './schemas/mcq';

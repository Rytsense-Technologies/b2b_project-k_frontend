// Owner decision 28 (QA-003): forms run on zod 4 with the resolver that supports it,
// and every custom "required" / "select" message survives the migration.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from './schemas/auth';
import { settingsPasswordSchema } from './schemas/settings';
import { tenantFacultyCreateSchema } from './schemas/users';
import { mcqQuestionCreateSchema } from './schemas/mcq';
import { codeField, phoneField } from './fields';

const pkg = (name) => JSON.parse(readFileSync(path.join(process.cwd(), 'node_modules', name, 'package.json'), 'utf8'));
const first = (schema, value, key) => {
  const r = schema.safeParse(value);
  expect(r.success).toBe(false);
  return r.error.issues.find((i) => i.path[0] === key)?.message;
};

describe('zod 4 migration', () => {
  it('installs zod 4 (advisory fixed in 4.x) and a resolver that supports it', () => {
    expect(Number(pkg('zod').version.split('.')[0])).toBe(4);
    expect(Number(pkg('@hookform/resolvers').version.split('.')[0])).toBeGreaterThanOrEqual(5);
    const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    expect(manifest.dependencies.zod).toMatch(/^\^?4\./);
  });

  it('keeps the custom message when a field is missing', () => {
    expect(first(loginSchema, {}, 'email')).toBe('Email is required');
    expect(first(loginSchema, { email: 'a@b.co' }, 'password')).toBe('Password is required');
    expect(first(forgotPasswordSchema, {}, 'email')).toBe('Email is required');
    expect(first(resetPasswordSchema, { password: 'Abcdef12' }, 'confirmPassword')).toBe('Confirm your password');
    expect(first(settingsPasswordSchema, {}, 'current_password')).toBe('Enter your current password');
    expect(first(tenantFacultyCreateSchema, {}, 'role')).toBe('Select a role');
    expect(first(mcqQuestionCreateSchema, {}, 'question_type')).toBe('Choose a question type.');
    expect(codeField('Code').safeParse(undefined).error.issues[0].message).toBe('Code is required');
    expect(phoneField('Phone number').safeParse(undefined).error.issues[0].message).toBe('Phone number is required');
  });

  it('still rejects with field messages through zodResolver', async () => {
    const out = await zodResolver(loginSchema)({ email: 'nope', password: '' }, undefined, { fields: {}, shouldUseNativeValidation: false });
    expect(out.values).toEqual({});
    expect(out.errors.email.message).toBe('Enter a valid email address');
    expect(out.errors.password.message).toBe('Password must be at least 6 characters');
  });

  it('accepts and normalises valid input through zodResolver', async () => {
    const out = await zodResolver(loginSchema)({ email: ' A@B.co ', password: 'secret1' }, undefined, { fields: {}, shouldUseNativeValidation: false });
    expect(out.errors).toEqual({});
    expect(out.values.email).toBe('a@b.co');
  });
});

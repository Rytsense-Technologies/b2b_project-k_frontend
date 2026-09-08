import { z } from 'zod';
import {
  emailField,
  otpField,
  passwordField,
  personNameField,
  phoneField,
} from '../fields';

export const loginSchema = z.object({
  email: emailField('Email'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be 128 characters or fewer'),
});

export const signupSchema = z
  .object({
    firstName: personNameField('First name'),
    lastName: personNameField('Last name'),
    email: emailField('Email'),
    phoneNumber: phoneField('Phone number'),
    password: passwordField('Password'),
    confirmPassword: z.string({ required_error: 'Confirm your password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const otpSchema = z.object({
  otp: otpField('OTP'),
});

export const profileSchema = z.object({
  targetRole: z.string().min(1, 'Target role is required'),
  experience: z.enum(['fresher', 'experienced']),
  college: z.string().optional(),
  company: z.string().optional(),
  skills: z.array(z.string()).min(1, 'Add at least one skill'),
});

export const forgotPasswordSchema = z.object({
  email: emailField('Email'),
});

export const resetPasswordSchema = z
  .object({
    password: passwordField('Password'),
    confirmPassword: z.string({ required_error: 'Confirm your password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

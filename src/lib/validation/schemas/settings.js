import { z } from 'zod';
import { emailField, passwordField, personNameField, phoneField } from '../fields';

export const settingsProfileSchema = z.object({
  first_name: personNameField('First name'),
  last_name: personNameField('Last name', { required: false }),
  email: emailField('Email'),
  phone: phoneField('Phone number', { required: false }),
  role: z.string().optional(),
});

export const settingsPasswordSchema = z
  .object({
    current_password: z
      .string({ required_error: 'Enter your current password' })
      .min(1, 'Enter your current password')
      .max(128),
    new_password: passwordField('New password'),
    confirm_password: z.string({ required_error: 'Confirm your new password' }),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'New passwords do not match',
    path: ['confirm_password'],
  });

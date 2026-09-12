import { z } from 'zod';
import { reqString, password, email, optString, optNumber, optBool, optEnum } from './common.js';
import { CURRENCIES, THEMES } from '../constants/enums.js';

export const registerSchema = z.object({
  name: reqString('Name', 80).refine((v) => v.length >= 2, 'Name must be at least 2 characters'),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(128),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password });
export const resetTokenParams = z.object({ token: z.string().regex(/^[a-f\d]{64}$/i, 'Invalid or expired reset link') });

export const updateProfileSchema = z.object({
  name: reqString('Name', 80).optional(),
  email: email.optional(),
  phone: optString(20),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: 'Current password is required' }).min(1, 'Current password is required'),
    newPassword: password,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

export const preferencesSchema = z.object({
  theme: optEnum(THEMES, 'Theme'),
  currency: optEnum(CURRENCIES, 'Currency'),
  distanceUnit: optEnum(['km', 'mi'], 'Distance unit'),
  reminderDaysBefore: optNumber({ min: 1, max: 365, int: true, label: 'Reminder days' }),
  emailNotifications: optBool,
});

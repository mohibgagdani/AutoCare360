import crypto from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLE_VALUES, ROLES, CURRENCIES, THEMES } from '../constants/enums.js';
import { toJSONOptions } from './schemas.js';

const SALT_ROUNDS = 12;

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, maxlength: 300 },
    rotatedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.USER, index: true },
    phone: { type: String, trim: true, maxlength: 20 },
    avatar: {
      url: String,
      publicId: String,
      provider: String,
    },
    isActive: { type: Boolean, default: true, index: true },
    blockedReason: { type: String, maxlength: 300 },
    lastLoginAt: Date,
    preferences: {
      theme: { type: String, enum: THEMES, default: 'system' },
      currency: { type: String, enum: CURRENCIES, default: 'INR' },
      distanceUnit: { type: String, enum: ['km', 'mi'], default: 'km' },
      reminderDaysBefore: { type: Number, min: 1, max: 365, default: 15 },
      emailNotifications: { type: Boolean, default: true },
    },
    refreshTokens: { type: [refreshTokenSchema], select: false, default: [] },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: Date,
    lastStatusSyncAt: Date,
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: { virtuals: true } }
);

userSchema.index({ createdAt: -1 });
userSchema.index({ name: 'text', email: 'text' });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** True when the password changed after the given JWT issued-at (seconds). */
userSchema.methods.passwordChangedAfter = function passwordChangedAfter(jwtIat) {
  if (!this.passwordChangedAt) return false;
  return Math.floor(this.passwordChangedAt.getTime() / 1000) > jwtIat;
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  return token;
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toJSON();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

export const User = mongoose.model('User', userSchema);

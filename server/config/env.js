import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

function secret(key) {
  const value = process.env[key];
  if (value) return value;
  if (isProd) throw new Error(`Environment variable ${key} is required in production`);
  // Development-only fallback so the API boots straight after cloning.
  console.warn(`[env] ${key} is not set — using an insecure development default.`);
  return `dev-only-${key.toLowerCase()}-change-me`;
}

const list = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

const port = Number(process.env.PORT || 5000);

const cloudinary = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',
};
cloudinary.enabled = Boolean(cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret);

const smtp = {
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
  from: process.env.EMAIL_FROM || 'AutoCare360 <no-reply@autocare360.app>',
};
smtp.secure = smtp.port === 465;
smtp.enabled = Boolean(smtp.host);

export const env = Object.freeze({
  nodeEnv,
  isProd,
  port,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/autocare360',
  jwtSecret: secret('JWT_SECRET'),
  jwtRefreshSecret: secret('JWT_REFRESH_SECRET'),
  accessTokenTtl: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshTokenDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 7),
  clientUrls: list(process.env.CLIENT_URL, 'http://localhost:5173'),
  serverUrl: (process.env.SERVER_URL || `http://localhost:${port}`).replace(/\/$/, ''),
  cookieSameSite: process.env.COOKIE_SAME_SITE || (isProd ? 'none' : 'lax'),
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
  cloudinary,
  smtp,
  enableJobs: process.env.ENABLE_JOBS !== 'false',
  trustProxy: Number(process.env.TRUST_PROXY || (isProd ? 1 : 0)),
});

export const primaryClientUrl = env.clientUrls[0];

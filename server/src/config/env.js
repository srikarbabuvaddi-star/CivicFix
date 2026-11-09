import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from current working directory and server directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isTest = process.env.NODE_ENV === 'test';

// In automated test environments (Vitest, CI), provide test-safe defaults if .env is not present
const defaultTestDbUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/civicfix_test_automated';
const defaultTestSecret = 'ci_test_session_secret_32_characters_minimum_required!';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z
    .string()
    .default(() => (isTest ? defaultTestDbUri : (process.env.TEST_MONGODB_URI || '')))
    .transform((val) => {
      if (!val) return val;
      let cleaned = val.trim();
      if (cleaned.startsWith('MONGODB_URI=')) {
        cleaned = cleaned.substring('MONGODB_URI='.length).trim();
      }
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      return cleaned;
    })
    .refine((val) => Boolean(val && val.length > 0), {
      message: 'MONGODB_URI is required. Please set MONGODB_URI in your environment or .env file.'
    }),
  SESSION_SECRET: z
    .string()
    .default(() => (isTest ? defaultTestSecret : ''))
    .transform((val) => {
      if (!val) return val;
      let cleaned = val.trim();
      if (cleaned.startsWith('SESSION_SECRET=')) {
        cleaned = cleaned.substring('SESSION_SECRET='.length).trim();
      }
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      return cleaned;
    })
    .refine((val) => Boolean(val && val.length >= 32), {
      message: 'SESSION_SECRET must be at least 32 characters long for cryptographic security'
    }),
  SESSION_COOKIE_NAME: z.string().default('civicfix.sid'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(24),
  CLIENT_ORIGIN: z
    .string()
    .transform((val) =>
      val && !val.startsWith('http://') && !val.startsWith('https://') ? `https://${val}` : val
    )
    .pipe(z.string().url())
    .default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().optional().default(''),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  TRUST_PROXY: z.coerce.number().default(1),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(15 * 60 * 1000), // 15 mins
  RATE_LIMIT_MAX: z.coerce.number().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().positive().default(10), // stricter for login
  EMAIL_ENABLED: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),
  SMTP_HOST: z.string().optional().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('CivicFix Notifications <notifications@civicfix.org>')
});

let isConfigValid = true;
let configErrors = [];
let missingVars = [];

const parseResult = envSchema.safeParse(process.env);
let parsedEnv;

if (parseResult.success) {
  parsedEnv = parseResult.data;

  // Production credential & secret validation safeguard
  if (parsedEnv.NODE_ENV === 'production') {
    const insecurePatterns = ['change_me', 'production_session_secret', 'example', 'test_secret', 'civicfix_production_session'];
    const isSecretInsecure = insecurePatterns.some((pattern) =>
      parsedEnv.SESSION_SECRET.toLowerCase().includes(pattern)
    );
    if (isSecretInsecure) {
      isConfigValid = false;
      configErrors.push('Insecure SESSION_SECRET: template or example secret used in production. A cryptographically random secret is required.');
    }
  }
} else {
  isConfigValid = false;
  configErrors = parseResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
  missingVars = parseResult.error.errors.map(err => err.path.join('.'));

  // Helper to sanitize accidental prefixing in env values (e.g. "KEY=value")
  const sanitizeValue = (val, prefix) => {
    if (!val) return '';
    let cleaned = String(val).trim();
    if (cleaned.startsWith(prefix)) cleaned = cleaned.substring(prefix.length).trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    return cleaned;
  };

  const rawMongoUri = sanitizeValue(process.env.MONGODB_URI, 'MONGODB_URI=');
  const rawSessionSecret = sanitizeValue(process.env.SESSION_SECRET, 'SESSION_SECRET=');

  // Safe fallback to prevent serverless container termination (status 128) during module import
  parsedEnv = {
    NODE_ENV: process.env.NODE_ENV || 'production',
    PORT: Number(process.env.PORT) || 5000,
    MONGODB_URI: rawMongoUri,
    SESSION_SECRET: rawSessionSecret && rawSessionSecret.length >= 32
      ? rawSessionSecret
      : crypto.randomBytes(32).toString('hex'),
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'civicfix.sid',
    SESSION_TTL_HOURS: Number(process.env.SESSION_TTL_HOURS) || 24,
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'https://civicfix-web.onrender.com',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
    COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || 'lax',
    TRUST_PROXY: Number(process.env.TRUST_PROXY) || 1,
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
    RATE_LIMIT_MAX: 100,
    AUTH_RATE_LIMIT_MAX: 10,
    EMAIL_ENABLED: false,
    SMTP_HOST: 'localhost',
    SMTP_PORT: 587,
    SMTP_USER: '',
    SMTP_PASS: '',
    EMAIL_FROM: 'CivicFix Notifications <notifications@civicfix.org>'
  };
}

export const env = {
  isConfigValid,
  configErrors,
  missingVars,
  isProduction: parsedEnv.NODE_ENV === 'production',
  isDevelopment: parsedEnv.NODE_ENV === 'development',
  isTest: parsedEnv.NODE_ENV === 'test',
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  mongoUri: parsedEnv.MONGODB_URI,
  sessionSecret: parsedEnv.SESSION_SECRET,
  sessionCookieName: parsedEnv.SESSION_COOKIE_NAME,
  sessionTtlMs: parsedEnv.SESSION_TTL_HOURS * 60 * 60 * 1000,
  cookieSameSite: parsedEnv.COOKIE_SAME_SITE,
  trustProxy: parsedEnv.TRUST_PROXY,
  clientOrigin: parsedEnv.CLIENT_ORIGIN,
  allowedOrigins: parsedEnv.ALLOWED_ORIGINS
    ? parsedEnv.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [parsedEnv.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  rateLimitWindowMs: parsedEnv.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: parsedEnv.RATE_LIMIT_MAX,
  authRateLimitMax: parsedEnv.AUTH_RATE_LIMIT_MAX,
  emailEnabled: parsedEnv.EMAIL_ENABLED,
  smtpHost: parsedEnv.SMTP_HOST,
  smtpPort: parsedEnv.SMTP_PORT,
  smtpUser: parsedEnv.SMTP_USER,
  smtpPass: parsedEnv.SMTP_PASS,
  emailFrom: parsedEnv.EMAIL_FROM
};

import dotenv from 'dotenv';

dotenv.config();

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var ${key}`);
  }
  return value;
};

const parseCommaList = (raw: string | undefined, fallback: string): string[] => {
  const source = raw && raw.trim().length > 0 ? raw : fallback;
  return source
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const parseAdminEmails = (raw: string | undefined): string[] =>
  parseCommaList(raw, 'kunaldsingh26@gmail.com').map((email) => email.toLowerCase());

const parseCorsOrigins = (raw: string | undefined): string[] =>
  parseCommaList(raw, 'http://localhost:3000');

export const env = {
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  DATABASE_URL: requireEnv('DATABASE_URL'),
  REDIS_URL: requireEnv('REDIS_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  ADMIN_EMAILS: parseAdminEmails(process.env.ADMIN_EMAILS),
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGIN)
};

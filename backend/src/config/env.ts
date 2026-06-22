import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'change-this-secret-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  dbFile: path.resolve(process.cwd(), process.env.DB_FILE ?? './data/cash-register.db'),
  redisUrl: process.env.REDIS_URL ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};

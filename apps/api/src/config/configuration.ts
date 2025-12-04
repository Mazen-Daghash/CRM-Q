import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  PORT: z.coerce.number().optional(),
  API_URL: z.string().optional().default('http://localhost:4000'),
  BASE_URL: z.string().optional().default('http://localhost:3000'),
  CLIENT_URL: z.string().optional(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().optional().default(587),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional().default('crm@company.local'),
  STORAGE_ROOT: z.string().optional().default('./storage'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): EnvConfig => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  return parsed.data;
};

export default () => {
  const env = validateEnv(process.env);

  return {
    env,
    app: {
      env: env.NODE_ENV,
      port: env.PORT ?? 4000,
      apiUrl: env.API_URL,
      clientUrl: env.CLIENT_URL ?? env.BASE_URL,
    },
    auth: {
      jwtSecret: env.JWT_SECRET,
      jwtRefreshSecret: env.JWT_REFRESH_SECRET,
      accessTokenTtl: '15m',
      refreshTokenTtl: '7d',
    },
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL,
    },
    mail: {
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      user: env.EMAIL_USER,
      password: env.EMAIL_PASSWORD,
      from: env.EMAIL_FROM,
    },
    storage: {
      root: env.STORAGE_ROOT,
    },
  };
};


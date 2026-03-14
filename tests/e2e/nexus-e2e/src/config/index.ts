import { z } from 'zod'

const configSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  TWITTER_BEARER_TOKEN: z.string().min(1),
  TWITTER_API_KEY: z.string().min(1),
  TWITTER_API_SECRET: z.string().min(1),
  TWITTER_ACCESS_TOKEN: z.string().min(1),
  TWITTER_ACCESS_TOKEN_SECRET: z.string().min(1),
  SENDGRID_API_KEY: z.string().min(1),
  GOOGLE_CSE_API_KEY: z.string().min(1),
  GOOGLE_CSE_ID: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  // Optional
  PORT: z.coerce.number().default(3001),
  FRONTEND_PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGINS: z.string().default('*'),
  RATE_LIMIT_RPM: z.coerce.number().default(60),
  WEBHOOK_SECRET: z.string().optional(),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
})

function loadConfig() {
  const result = configSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Missing required environment variables: ${missing}`)
  }
  return result.data
}

export const config = loadConfig()
export type Config = typeof config

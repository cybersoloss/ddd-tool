import rateLimit from 'express-rate-limit'
import { config } from '@/config'
import { createError } from '@/errors'

export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.RATE_LIMIT_RPM,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const err = createError('RATE_LIMITED', `Too many requests, try again in 60s`)
    res.status(429).json(err.toJSON())
  },
})

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const err = createError('RATE_LIMITED', 'Too many requests')
    res.status(429).json(err.toJSON())
  },
})

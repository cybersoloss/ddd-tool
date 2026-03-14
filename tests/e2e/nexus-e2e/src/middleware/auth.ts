import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '@/config'
import { createError } from '@/errors'
import type { JwtPayload } from '@/types/shared'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(createError('UNAUTHORIZED'))
  }
  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload
    req.user = payload
    next()
  } catch {
    next(createError('UNAUTHORIZED', 'Invalid or expired token'))
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(createError('UNAUTHORIZED'))
    if (!roles.includes(req.user.role)) return next(createError('FORBIDDEN'))
    next()
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return next()
  const token = authHeader.slice(7)
  try {
    req.user = jwt.verify(token, config.JWT_SECRET) as JwtPayload
  } catch {
    // ignore invalid token for optional auth
  }
  next()
}

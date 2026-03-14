import { Request, Response, NextFunction } from 'express'
import { AppError } from '@/errors'
import { logger } from '@/utils/logger'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    const logFn = err.httpStatus >= 500 ? logger.error : logger.warn
    logFn({ code: err.code, message: err.message, details: err.details }, 'AppError')
    return res.status(err.httpStatus).json(err.toJSON())
  }

  if (err instanceof Error) {
    logger.error({ message: err.message, stack: err.stack }, 'UnhandledError')
  } else {
    logger.error({ err }, 'UnknownError')
  }

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  })
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
}

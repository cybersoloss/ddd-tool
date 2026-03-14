export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'DUPLICATE_ENTRY'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'CONTENT_NOT_FOUND'
  | 'INVALID_CONTENT_STATUS'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'AI_PROCESSING_FAILED'
  | 'PUBLISH_FAILED'
  | 'CIRCUIT_BREAKER_OPEN'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_API_KEY'

const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  DUPLICATE_ENTRY: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  CONTENT_NOT_FOUND: 404,
  INVALID_CONTENT_STATUS: 422,
  WEBHOOK_SIGNATURE_INVALID: 401,
  AI_PROCESSING_FAILED: 502,
  PUBLISH_FAILED: 502,
  CIRCUIT_BREAKER_OPEN: 503,
  QUOTA_EXCEEDED: 429,
  INVALID_API_KEY: 401,
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly details?: unknown,
    public readonly httpStatus: number = ERROR_HTTP_STATUS[code],
  ) {
    super(message)
    this.name = 'AppError'
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined && { details: this.details }),
      },
    }
  }
}

export function createError(code: ErrorCode, message?: string, details?: unknown): AppError {
  const defaultMessages: Record<ErrorCode, string> = {
    VALIDATION_ERROR: 'Validation failed',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Insufficient permissions',
    NOT_FOUND: 'Resource not found',
    DUPLICATE_ENTRY: 'Resource already exists',
    RATE_LIMITED: 'Too many requests',
    INTERNAL_ERROR: 'An unexpected error occurred',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    CONTENT_NOT_FOUND: 'Content item not found',
    INVALID_CONTENT_STATUS: 'Invalid status transition',
    WEBHOOK_SIGNATURE_INVALID: 'Invalid webhook signature',
    AI_PROCESSING_FAILED: 'AI service error',
    PUBLISH_FAILED: 'Publication failed',
    CIRCUIT_BREAKER_OPEN: 'Circuit breaker open',
    QUOTA_EXCEEDED: 'API quota exceeded',
    INVALID_API_KEY: 'Invalid or expired API key',
  }
  return new AppError(code, message ?? defaultMessages[code], details)
}

export type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR';

const ERROR_DEFINITIONS: Record<ErrorCode, { httpStatus: number; message: string }> = {
  VALIDATION_ERROR: { httpStatus: 400, message: 'Validation failed' },
  NOT_FOUND:        { httpStatus: 404, message: 'Resource not found' },
  INTERNAL_ERROR:   { httpStatus: 500, message: 'An unexpected error occurred' },
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;

  constructor(code: ErrorCode, message?: string) {
    const def = ERROR_DEFINITIONS[code];
    super(message ?? def.message);
    this.code = code;
    this.httpStatus = def.httpStatus;
    this.name = 'AppError';
  }
}

export { ERROR_DEFINITIONS };

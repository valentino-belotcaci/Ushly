export type ErrorDetails = Record<string, unknown> | unknown[] | null;

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: ErrorDetails;

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details: ErrorDetails = null,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

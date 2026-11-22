export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export const handleError = (error: unknown) => {
  if (error instanceof AppError) {
    return { message: error.message, statusCode: error.statusCode };
  }

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    return { message: 'A record with that value already exists', statusCode: 409 };
  }

  if (typeof error === 'object' && error !== null && 'name' in error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return { message: 'The submitted data is invalid', statusCode: 400 };
    }
  }

  if (error instanceof Error) {
    return { message: 'Internal server error', statusCode: 500 };
  }

  return { message: 'Unexpected server error', statusCode: 500 };
};

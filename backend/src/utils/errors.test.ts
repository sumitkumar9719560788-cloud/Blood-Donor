import { describe, expect, it } from 'vitest';
import { AppError, handleError } from './errors.js';

describe('API error mapping', () => {
  it('maps duplicate key conflicts to 409', () => {
    expect(handleError({ code: 11000 })).toEqual({ message: 'A record with that value already exists', statusCode: 409 });
  });

  it('maps Mongoose validation and cast errors to 400', () => {
    expect(handleError({ name: 'ValidationError' }).statusCode).toBe(400);
    expect(handleError({ name: 'CastError' }).statusCode).toBe(400);
  });

  it('preserves application status codes', () => {
    expect(handleError(new AppError('Forbidden', 403))).toEqual({ message: 'Forbidden', statusCode: 403 });
  });
});

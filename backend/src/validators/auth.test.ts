import { describe, expect, it } from 'vitest';
import { donorSchema, loginSchema, registerSchema, requestSchema } from './auth.js';

describe('registration validation', () => {
  it('accepts a donor account without exposing admin self-registration', () => {
    expect(registerSchema.safeParse({
      name: 'Sample Donor',
      email: 'donor@example.test',
      password: 'a-secure-password',
      role: 'DONOR',
    }).success).toBe(true);

    expect(registerSchema.safeParse({
      name: 'Sample Admin',
      email: 'admin@example.test',
      password: 'a-secure-password',
      role: 'ADMIN',
    }).success).toBe(false);
  });

  it('rejects short passwords during login validation', () => {
    expect(loginSchema.safeParse({ email: 'user@example.test', password: 'short' }).success).toBe(false);
  });

  it('trims and lowercases email addresses for registration and login', () => {
    expect(registerSchema.parse({
      name: 'Sample User',
      email: '  USER@Example.Test ',
      password: 'a-secure-password',
    }).email).toBe('user@example.test');
    expect(loginSchema.parse({
      email: '  USER@Example.Test ',
      password: 'a-secure-password',
    }).email).toBe('user@example.test');
  });
});

describe('donation request validation', () => {
  const validRequest = {
    bloodGroup: 'O+',
    unitsNeeded: 2,
    urgency: 'Urgent',
    city: 'Bengaluru',
    hospitalName: 'Sample Hospital',
    contactMethod: '+910000000000',
    consentToShare: true,
  };

  it('accepts a valid request with explicit contact-sharing consent', () => {
    expect(requestSchema.safeParse(validRequest).success).toBe(true);
  });

  it('rejects invalid quantities, blood groups, and missing consent', () => {
    expect(requestSchema.safeParse({ ...validRequest, unitsNeeded: 0 }).success).toBe(false);
    expect(requestSchema.safeParse({ ...validRequest, bloodGroup: 'C+' }).success).toBe(false);
    expect(requestSchema.safeParse({ ...validRequest, consentToShare: false }).success).toBe(false);
  });
});

describe('donor profile validation', () => {
  it('allows donors to omit exact GPS coordinates', () => {
    expect(donorSchema.safeParse({
      bloodGroup: 'A+',
      city: 'Bengaluru',
      available: true,
      consentVisible: true,
    }).success).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { DonorProfile, User } from './models.js';

describe('Mongoose model security and defaults', () => {
  it('never serializes password hashes or reset token data', () => {
    const user = new User({
      name: 'Test User', email: 'test@example.test', passwordHash: 'hash-value',
      passwordResetTokenHash: 'reset-hash', passwordResetExpiresAt: new Date(),
    });
    const serialized = user.toJSON();
    expect(serialized.id).toBeTruthy();
    expect(serialized.active).toBe(true);
    expect(serialized).not.toHaveProperty('passwordHash');
    expect(serialized).not.toHaveProperty('passwordResetTokenHash');
    expect(serialized).not.toHaveProperty('passwordResetExpiresAt');
  });

  it('keeps new donor profiles unavailable for public search until approved', () => {
    const donor = new DonorProfile({ userId: '64b000000000000000000001', bloodGroup: 'O_POSITIVE', city: 'Bengaluru' });
    expect(donor.available).toBe(true);
    expect(donor.consentVisible).toBe(false);
    expect(donor.verificationStatus).toBe('PENDING');
  });
});

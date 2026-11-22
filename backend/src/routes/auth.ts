import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { loginSchema, registerSchema } from '../validators/auth.js';
import { loginUser, registerUser } from '../services/auth.js';
import { handleError } from '../utils/errors.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { BloodRequest, DonorProfile, Report, User } from '../models.js';
import { createHash, randomBytes } from 'node:crypto';
import { hashPassword } from '../services/auth.js';
import { sendPasswordResetEmail } from '../services/email.js';
import env from '../config/env.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts. Please try again later.' },
});

router.post('/register', authLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const user = await registerUser(parsed);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten() });
    }
    const handled = handleError(error);
    return res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await loginUser(parsed.email, parsed.password);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten() });
    }
    const handled = handleError(error);
    return res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()) }).parse(req.body);
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
      return res.status(503).json({ message: 'Password reset is not configured. Please contact the site administrator.' });
    }
    const user = await User.findOne({ email }).select('_id email');
    if (user) {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      try { await sendPasswordResetEmail(user.email, token); }
      catch (error) {
        user.passwordResetTokenHash = undefined;
        user.passwordResetExpiresAt = undefined;
        await user.save();
        console.error('Password reset email delivery failed', error);
      }
    }
    res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: 'Enter a valid email address.' });
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.statusCode >= 500 ? 'Password reset email is currently unavailable.' : handled.message });
  }
});

router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = z.object({ token: z.string().min(32).max(128), password: z.string().min(8).max(128) }).parse(req.body);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'This password reset link is invalid or expired.' });
    user.passwordHash = await hashPassword(password);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    res.json({ message: 'Password updated. You can now sign in with your new password.' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: 'A valid reset link and password of at least 8 characters are required.' });
    const handled = handleError(error); res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await User.findById(req.user!.id).select('name email phone city role createdAt');
    res.json({ user: user?.toJSON() || null });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.delete('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const donor = await DonorProfile.findOne({ userId: req.user!.id }).select('_id');
    if (donor) await BloodRequest.updateMany({ donorId: donor._id }, { $set: { donorId: null } });
    await Promise.all([
      DonorProfile.deleteOne({ userId: req.user!.id }),
      BloodRequest.deleteMany({ userId: req.user!.id }),
      Report.deleteMany({ authorId: req.user!.id }),
      User.deleteOne({ _id: req.user!.id }),
    ]);
    res.status(204).end();
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

export default router;

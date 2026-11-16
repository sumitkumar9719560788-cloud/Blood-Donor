import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { loginSchema, registerSchema } from '../validators/auth.js';
import { loginUser, registerUser } from '../services/auth.js';
import { handleError } from '../utils/errors.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../database/prisma.js';

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

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, phone: true, city: true, role: true, createdAt: true },
    });
    res.json({ user });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.delete('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.user.delete({ where: { id: req.user!.id } });
    res.status(204).end();
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

export default router;

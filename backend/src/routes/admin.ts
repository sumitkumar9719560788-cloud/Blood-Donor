import { Router } from 'express';
import prisma from '../database/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { handleError } from '../utils/errors.js';
import { z } from 'zod';
import { VerificationStatus } from '@prisma/client';

const router = Router();

router.get('/stats', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const [donors, banks, requests, users] = await Promise.all([
      prisma.donorProfile.count(),
      prisma.bloodBank.count(),
      prisma.bloodRequest.count(),
      prisma.user.count(),
    ]);
    res.json({ stats: { donors, banks, requests, users } });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/reports', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: { author: { select: { name: true, email: true } }, bank: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reports });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/banks/pending', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const banks = await prisma.bloodBank.findMany({
      where: { verificationStatus: VerificationStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ banks });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.post('/banks', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const bankInput = z.object({
      name: z.string().min(2).max(120),
      city: z.string().min(2).max(80),
      address: z.string().min(4).max(240),
      phone: z.string().min(7).max(24),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      bloodInventory: z.record(z.string(), z.number().int().min(0)).refine((inventory) => {
        const validGroups = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
        return Object.keys(inventory).length > 0
          && Object.keys(inventory).length <= validGroups.size
          && Object.keys(inventory).every((group) => validGroups.has(group));
      }, 'Inventory must use valid blood-group keys'),
      operatingHours: z.string().min(2).max(120),
    }).parse(req.body);
    const bank = await prisma.bloodBank.create({
      data: {
        ...bankInput,
        verified: false,
        verificationStatus: VerificationStatus.PENDING,
      },
    });
    res.status(201).json({ message: 'Blood bank added for verification', bank });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten() });
    }
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.patch('/banks/:id/verification', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { verificationStatus } = z.object({
      verificationStatus: z.nativeEnum(VerificationStatus),
    }).parse(req.body);
    const bank = await prisma.bloodBank.update({
      where: { id: req.params.id },
      data: {
        verificationStatus,
        verified: verificationStatus === VerificationStatus.VERIFIED,
        lastVerifiedAt: new Date(),
      },
    });
    res.json({ message: 'Blood bank verification updated', bank });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten() });
    }
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

export default router;

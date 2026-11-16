import { Router } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma.js';
import { donorSchema } from '../validators/auth.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { handleError } from '../utils/errors.js';
import { BloodGroup } from '@prisma/client';

const bloodGroupValues: Record<string, BloodGroup> = {
  'A+': BloodGroup.A_POSITIVE,
  'A-': BloodGroup.A_NEGATIVE,
  'B+': BloodGroup.B_POSITIVE,
  'B-': BloodGroup.B_NEGATIVE,
  'AB+': BloodGroup.AB_POSITIVE,
  'AB-': BloodGroup.AB_NEGATIVE,
  'O+': BloodGroup.O_POSITIVE,
  'O-': BloodGroup.O_NEGATIVE,
};

const router = Router();

router.get('/nearby', async (req, res) => {
  try {
    const { city, bloodGroup } = req.query as { city?: string; bloodGroup?: string };
    if (bloodGroup && !bloodGroupValues[bloodGroup]) {
      return res.status(400).json({ message: 'Invalid blood group' });
    }
    const donors = await prisma.donorProfile.findMany({
      where: {
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
        ...(bloodGroup ? { bloodGroup: bloodGroupValues[bloodGroup] } : {}),
        available: true,
        consentVisible: true,
      },
      include: { user: { select: { name: true } } },
      take: 20,
    });
    res.json({ donors: donors.map((donor) => ({
      id: donor.id,
      name: donor.user.name,
      city: donor.city,
      bloodGroup: donor.bloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-'),
      available: donor.available,
      isDemo: donor.isDemo,
      lastVerifiedAt: donor.lastVerifiedAt,
    }))});
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.post('/', requireAuth, requireRole(['DONOR', 'ADMIN']), async (req, res) => {
  try {
    const parsed = donorSchema.parse(req.body);

    const existing = await prisma.donorProfile.findUnique({ where: { userId: req.user!.id } });
    if (existing) {
      const updated = await prisma.donorProfile.update({
        where: { userId: req.user!.id },
        data: {
          bloodGroup: bloodGroupValues[parsed.bloodGroup],
          city: parsed.city,
          latitude: parsed.latitude ?? null,
          longitude: parsed.longitude ?? null,
          available: parsed.available ?? true,
          consentVisible: parsed.consentVisible ?? false,
        },
      });
      return res.json({ message: 'Donor profile updated', donor: updated });
    }

    const donor = await prisma.donorProfile.create({
      data: {
        userId: req.user!.id,
        bloodGroup: bloodGroupValues[parsed.bloodGroup],
        city: parsed.city,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        available: parsed.available ?? true,
        consentVisible: parsed.consentVisible ?? false,
      },
    });

    res.status(201).json({ message: 'Donor profile created', donor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten() });
    }
    const handled = handleError(error);
    return res.status(handled.statusCode).json({ message: handled.message });
  }
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { DonorProfile, BloodGroup, VerificationStatus, type BloodGroupValue } from '../models.js';
import { donorSchema } from '../validators/auth.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { handleError } from '../utils/errors.js';

const bloodGroupValues: Record<string, BloodGroupValue> = {
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

router.get('/me', requireAuth, requireRole(['DONOR', 'ADMIN']), async (req, res) => {
  try {
    const donor = await DonorProfile.findOne({ userId: req.user!.id }).select('bloodGroup city latitude longitude available consentVisible verificationStatus lastVerifiedAt updatedAt');
    res.json({ donor: donor?.toJSON() || null });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    const { city, bloodGroup } = req.query as { city?: string; bloodGroup?: string };
    if (bloodGroup && !bloodGroupValues[bloodGroup]) {
      return res.status(400).json({ message: 'Invalid blood group' });
    }
    const donors = await DonorProfile.find({
        ...(city ? { city: { $regex: city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {}),
        ...(bloodGroup ? { bloodGroup: bloodGroupValues[bloodGroup] } : {}),
        available: true,
        consentVisible: true,
        verificationStatus: VerificationStatus.VERIFIED,
      }).populate('user', 'name').limit(20);
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

    const existing = await DonorProfile.findOne({ userId: req.user!.id });
    if (existing) {
      Object.assign(existing, {
          bloodGroup: bloodGroupValues[parsed.bloodGroup],
          city: parsed.city,
          latitude: parsed.latitude ?? null,
          longitude: parsed.longitude ?? null,
          available: parsed.available ?? true,
          consentVisible: parsed.consentVisible ?? false,
          verificationStatus: VerificationStatus.PENDING,
        });
      await existing.save();
      return res.json({ message: 'Donor profile updated', donor: existing });
    }

    const donor = await DonorProfile.create({
        userId: req.user!.id,
        bloodGroup: bloodGroupValues[parsed.bloodGroup],
        city: parsed.city,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        available: parsed.available ?? true,
        consentVisible: parsed.consentVisible ?? false,
        verificationStatus: VerificationStatus.PENDING,
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

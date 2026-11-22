import { Router } from 'express';
import mongoose from 'mongoose';
import { BloodBank, BloodRequest, DonorProfile, Report, User, VerificationStatus } from '../models.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { handleError } from '../utils/errors.js';
import { z } from 'zod';

const router = Router();

router.get('/donors/pending', requireAuth, requireRole(['ADMIN']), async (_req, res) => {
  try {
    const donors = await DonorProfile.find({ verificationStatus: VerificationStatus.PENDING }).populate('user', 'name email phone').sort({ createdAt: 1 });
    res.json({ donors });
  } catch (error) { const handled = handleError(error); res.status(handled.statusCode).json({ message: handled.message }); }
});

router.patch('/donors/:id/verification', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { verificationStatus } = z.object({ verificationStatus: z.nativeEnum(VerificationStatus) }).parse(req.body);
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid donor id' });
    const donor = await DonorProfile.findByIdAndUpdate(req.params.id, { verificationStatus, lastVerifiedAt: new Date() }, { new: true });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    res.json({ donor });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: 'Validation failed', errors: error.flatten() });
    const handled = handleError(error); res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/users', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const members = await User.find().select('name email phone city role active createdAt').sort({ createdAt: -1 }).limit(100);
    const donors = await DonorProfile.find({ userId: { $in: members.map((member) => member._id) } }).select('userId bloodGroup available consentVisible lastVerifiedAt verificationStatus');
    const donorByUser = new Map(donors.map((donor) => [String(donor.userId), donor]));
    const users = members.map((member) => ({ ...member.toJSON(), donorProfile: donorByUser.get(String(member._id))?.toJSON() || null }));
    res.json({ users });
  } catch (error) { const handled = handleError(error); res.status(handled.statusCode).json({ message: handled.message }); }
});

router.patch('/users/:id/role', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { role } = z.object({ role: z.enum(['USER', 'DONOR', 'REQUESTER', 'ADMIN']) }).parse(req.body);
    if (req.params.id === req.user!.id && role !== 'ADMIN') return res.status(400).json({ message: 'You cannot remove your own administrator role' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('name email role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: 'Validation failed', errors: error.flatten() });
    const handled = handleError(error); res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.patch('/users/:id/active', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    if (req.params.id === req.user!.id && !active) return res.status(400).json({ message: 'You cannot deactivate your own administrator account' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    const user = await User.findByIdAndUpdate(req.params.id, { active }, { new: true }).select('name email role active');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: 'Validation failed', errors: error.flatten() });
    const handled = handleError(error); res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/requests', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const records = await BloodRequest.find().select('bloodGroup unitsNeeded urgency city hospitalName contactMethod consentToShare status createdAt userId').populate('userId', 'name email').sort({ createdAt: -1 }).limit(100);
    const requests = records.map((record) => ({ ...record.toJSON(), user: record.userId }));
    res.json({ requests });
  } catch (error) { const handled = handleError(error); res.status(handled.statusCode).json({ message: handled.message }); }
});

router.get('/stats', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const [donors, banks, requests, users] = await Promise.all([
      DonorProfile.countDocuments(), BloodBank.countDocuments(), BloodRequest.countDocuments(), User.countDocuments(),
    ]);
    res.json({ stats: { donors, banks, requests, users } });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/reports', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const records = await Report.find().populate('authorId', 'name email').populate('bankId').sort({ createdAt: -1 });
    const reports = records.map((record) => ({ ...record.toJSON(), author: record.authorId, bank: record.bankId }));
    res.json({ reports });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/banks/pending', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const banks = await BloodBank.find({ verificationStatus: VerificationStatus.PENDING }).sort({ createdAt: 1 });
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
      phone: z.string().trim().regex(/^\+?[0-9()\s.-]{7,24}$/),
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
    const bank = await BloodBank.create({
        ...bankInput,
        verified: false,
        verificationStatus: VerificationStatus.PENDING,
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
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid bank id' });
    const bank = await BloodBank.findByIdAndUpdate(req.params.id, { verificationStatus, verified: verificationStatus === VerificationStatus.VERIFIED, lastVerifiedAt: new Date() }, { new: true });
    if (!bank) return res.status(404).json({ message: 'Blood bank not found' });
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

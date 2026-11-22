import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { BloodRequest, DonorProfile, RequestStatus } from '../models.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requestSchema } from '../validators/auth.js';
import { handleError } from '../utils/errors.js';
import rateLimit from 'express-rate-limit';

const bloodGroupValues = {
  'A+': 'A_POSITIVE',
  'A-': 'A_NEGATIVE',
  'B+': 'B_POSITIVE',
  'B-': 'B_NEGATIVE',
  'AB+': 'AB_POSITIVE',
  'AB-': 'AB_NEGATIVE',
  'O+': 'O_POSITIVE',
  'O-': 'O_NEGATIVE',
} as const;

const router = Router();
const requestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many request submissions. Please try again later.' },
});

router.get('/opportunities', requireAuth, requireRole(['DONOR']), async (req, res) => {
  try {
    const profile = await DonorProfile.findOne({ userId: req.user!.id });
    if (!profile || !profile.available || !profile.consentVisible || profile.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ message: 'Set your donor profile as available and opt in to receive requests' });
    }
    const requests = await BloodRequest.find({
      status: RequestStatus.SUBMITTED,
      consentToShare: true,
      bloodGroup: profile.bloodGroup,
      city: { $regex: profile.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    }).select('bloodGroup unitsNeeded urgency city hospitalName details isDemo createdAt').sort({ createdAt: -1 }).limit(20);
    res.json({ requests });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/assigned', requireAuth, requireRole(['DONOR']), async (req, res) => {
  try {
    const profile = await DonorProfile.findOne({ userId: req.user!.id });
    if (!profile) return res.status(403).json({ message: 'Create a donor profile to view your accepted requests' });
    const requests = await BloodRequest.find({
        donorId: profile.id,
        status: { $in: [RequestStatus.CONTACTING, RequestStatus.FULFILLED] },
      }).select('bloodGroup unitsNeeded urgency city hospitalName contactMethod details isDemo status createdAt').sort({ updatedAt: -1 });
    res.json({ requests });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const requests = await BloodRequest.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.post('/', requestLimiter, requireAuth, async (req, res) => {
  try {
    const parsed = requestSchema.parse(req.body);
    const request = await BloodRequest.create({
        userId: req.user!.id,
        bloodGroup: bloodGroupValues[parsed.bloodGroup],
        unitsNeeded: parsed.unitsNeeded,
        urgency: parsed.urgency,
        city: parsed.city,
        hospitalName: parsed.hospitalName,
        contactMethod: parsed.contactMethod,
        details: parsed.details,
        consentToShare: parsed.consentToShare,
    });
    res.status(201).json({ message: 'Blood request created successfully', request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten() });
    }
    const handled = handleError(error);
    return res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.post('/:id/respond', requireAuth, requireRole(['DONOR']), async (req, res) => {
  try {
    const profile = await DonorProfile.findOne({ userId: req.user!.id });
    if (!profile || !profile.available || !profile.consentVisible || profile.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ message: 'Your donor profile is not opted in for requests' });
    }
    const changed = await BloodRequest.findOneAndUpdate({
        _id: req.params.id,
        status: RequestStatus.SUBMITTED,
        consentToShare: true,
        bloodGroup: profile.bloodGroup,
        city: { $regex: profile.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      },
      { $set: { status: RequestStatus.CONTACTING, donorId: profile._id } },
    );
    if (!changed) {
      return res.status(409).json({ message: 'This request is no longer available or does not match your donor profile' });
    }
    res.json({ message: 'You are now connected to this request. The requester contact is available in your assigned requests.' });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const parsed = z.object({
      status: z.nativeEnum(RequestStatus),
    }).parse(req.body);
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid request id' });
    const request = await BloodRequest.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    const isTerminal = request.status === RequestStatus.FULFILLED || request.status === RequestStatus.CANCELLED;
    if (isTerminal) return res.status(409).json({ message: 'Completed or cancelled requests cannot be changed' });
    const isOwnerCancellation = String(request.userId) === req.user!.id
      && parsed.status === RequestStatus.CANCELLED
      && request.status !== RequestStatus.FULFILLED
      && request.status !== RequestStatus.CANCELLED;
    let isAssignedDonorFulfilment = false;
    if (req.user!.role === 'DONOR' && parsed.status === RequestStatus.FULFILLED) {
      const donor = await DonorProfile.findOne({ userId: req.user!.id });
      isAssignedDonorFulfilment = String(donor?._id) === String(request.donorId) && request.status === RequestStatus.CONTACTING;
    }
    if (req.user!.role !== 'ADMIN' && !isOwnerCancellation && !isAssignedDonorFulfilment) {
      return res.status(403).json({ message: 'You may only cancel your own request or complete a request assigned to you' });
    }
    if (req.user!.role === 'ADMIN' && parsed.status !== RequestStatus.CANCELLED && parsed.status !== RequestStatus.FULFILLED) {
      return res.status(400).json({ message: 'Admins may cancel or fulfill an active request' });
    }
    request.status = parsed.status;
    const update = await request.save();
    res.json({ message: 'Request status updated', request: update });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten() });
    }
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

export default router;

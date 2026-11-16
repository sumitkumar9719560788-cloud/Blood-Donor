import { Router } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requestSchema } from '../validators/auth.js';
import { handleError } from '../utils/errors.js';
import { RequestStatus } from '@prisma/client';
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
    const profile = await prisma.donorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile || !profile.available || !profile.consentVisible) {
      return res.status(403).json({ message: 'Set your donor profile as available and opt in to receive requests' });
    }
    const requests = await prisma.bloodRequest.findMany({
      where: {
        status: RequestStatus.SUBMITTED,
        consentToShare: true,
        bloodGroup: profile.bloodGroup,
        city: { contains: profile.city, mode: 'insensitive' },
      },
      select: {
        id: true,
        bloodGroup: true,
        unitsNeeded: true,
        urgency: true,
        city: true,
        hospitalName: true,
        contactMethod: true,
        details: true,
        isDemo: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ requests });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/assigned', requireAuth, requireRole(['DONOR']), async (req, res) => {
  try {
    const profile = await prisma.donorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(403).json({ message: 'Create a donor profile to view your accepted requests' });
    const requests = await prisma.bloodRequest.findMany({
      where: {
        donorId: profile.id,
        status: { in: [RequestStatus.CONTACTING, RequestStatus.FULFILLED] },
      },
      select: {
        id: true,
        bloodGroup: true,
        unitsNeeded: true,
        urgency: true,
        city: true,
        hospitalName: true,
        contactMethod: true,
        details: true,
        isDemo: true,
        status: true,
        createdAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ requests });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const requests = await prisma.bloodRequest.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ requests });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

router.post('/', requestLimiter, requireAuth, async (req, res) => {
  try {
    const parsed = requestSchema.parse(req.body);
    const request = await prisma.bloodRequest.create({
      data: {
        userId: req.user!.id,
        bloodGroup: bloodGroupValues[parsed.bloodGroup],
        unitsNeeded: parsed.unitsNeeded,
        urgency: parsed.urgency,
        city: parsed.city,
        hospitalName: parsed.hospitalName,
        contactMethod: parsed.contactMethod,
        details: parsed.details,
        consentToShare: parsed.consentToShare,
      },
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
    const profile = await prisma.donorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile || !profile.available || !profile.consentVisible) {
      return res.status(403).json({ message: 'Your donor profile is not opted in for requests' });
    }
    const changed = await prisma.bloodRequest.updateMany({
      where: {
        id: req.params.id,
        status: RequestStatus.SUBMITTED,
        consentToShare: true,
        bloodGroup: profile.bloodGroup,
        city: { contains: profile.city, mode: 'insensitive' },
      },
      data: { status: RequestStatus.CONTACTING, donorId: profile.id },
    });
    if (changed.count === 0) {
      return res.status(409).json({ message: 'This request is no longer available or does not match your donor profile' });
    }
    const request = await prisma.bloodRequest.findUnique({ where: { id: req.params.id } });
    res.json({ message: 'You are now connected to this request. Contact the requester directly.', request });
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
    const request = await prisma.bloodRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    const isOwnerCancellation = request.userId === req.user!.id
      && parsed.status === RequestStatus.CANCELLED
      && request.status !== RequestStatus.FULFILLED
      && request.status !== RequestStatus.CANCELLED;
    let isAssignedDonorFulfilment = false;
    if (req.user!.role === 'DONOR' && parsed.status === RequestStatus.FULFILLED) {
      const donor = await prisma.donorProfile.findUnique({ where: { userId: req.user!.id } });
      isAssignedDonorFulfilment = donor?.id === request.donorId && request.status === RequestStatus.CONTACTING;
    }
    if (req.user!.role !== 'ADMIN' && !isOwnerCancellation && !isAssignedDonorFulfilment) {
      return res.status(403).json({ message: 'You may only cancel your own request or complete a request assigned to you' });
    }
    const update = await prisma.bloodRequest.update({
      where: { id },
      data: { status: parsed.status },
    });
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

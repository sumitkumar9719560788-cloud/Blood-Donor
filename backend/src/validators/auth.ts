import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128),
  phone: z.string().trim().regex(/^\+?[0-9()\s.-]{7,20}$/).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  role: z.enum(['USER', 'DONOR', 'REQUESTER']).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const donorSchema = z.object({
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  city: z.string().trim().min(2).max(80),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  available: z.boolean().optional(),
  consentVisible: z.boolean().optional(),
});

export const requestSchema = z.object({
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  unitsNeeded: z.number().int().min(1).max(20),
  urgency: z.string().min(2).max(40),
  city: z.string().min(2).max(80),
  hospitalName: z.string().min(2).max(120),
  contactMethod: z.string().trim().regex(/^\+?[0-9()\s.-]{7,24}$/),
  details: z.string().max(500).optional(),
  consentToShare: z.literal(true),
});

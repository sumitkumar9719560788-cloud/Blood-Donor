import { Router } from 'express';
import { z } from 'zod';
import { Report } from '../models.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const reportSchema = z.object({
	title: z.string().min(3).max(100),
	description: z.string().min(10).max(1000),
  bankId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

router.post('/', requireAuth, async (req, res) => {
	try {
		const parsed = reportSchema.parse(req.body);
    const report = await Report.create({
				authorId: req.user!.id,
				title: parsed.title,
				description: parsed.description,
				bankId: parsed.bankId,
		});
		res.status(201).json({ message: 'Report submitted for review', report });
	} catch (error) {
      if (error instanceof z.ZodError) {
			return res.status(400).json({ message: 'Validation failed', errors: error.flatten() });
		}
    res.status(500).json({ message: 'Unable to submit report' });
	}
});

export default router;

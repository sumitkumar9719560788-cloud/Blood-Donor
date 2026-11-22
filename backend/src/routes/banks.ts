import { Router } from 'express';
import { BloodBank } from '../models.js';
import { handleError } from '../utils/errors.js';
import { BloodGroup, type BloodGroupValue } from '../models.js';

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

router.get('/', async (req, res) => {
  try {
    const { city, bloodGroup } = req.query as { city?: string; bloodGroup?: string };
    if (bloodGroup && !bloodGroupValues[bloodGroup]) {
      return res.status(400).json({ message: 'Invalid blood group' });
    }
    const banks = await BloodBank.find({
      ...(city ? { city: { $regex: city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {}), verified: true,
    }).limit(25);

    const filtered = bloodGroup
      ? banks.filter((bank) => {
          const inventory = bank.bloodInventory as Record<string, number>;
          return inventory[bloodGroup] > 0;
        })
      : banks;

    res.json({ banks: filtered });
  } catch (error) {
    const handled = handleError(error);
    res.status(handled.statusCode).json({ message: handled.message });
  }
});

export default router;

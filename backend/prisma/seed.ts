import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import env from '../src/config/env.js';
import { BloodBank, BloodRequest, DonorProfile, User } from '../src/models.js';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed data must never be loaded in production');
  }

  const adminPassword = await bcrypt.hash('admin123', 10);

  await mongoose.connect(env.DATABASE_URL);
  const admin = await User.findOneAndUpdate({ email: 'admin@lifelink.app' }, { $setOnInsert: {
      name: 'Admin User',
      email: 'admin@lifelink.app',
      passwordHash: adminPassword,
      role: 'ADMIN',
      city: 'Bengaluru',
      phone: '+91 90000 00001',
    } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  const donorUser = await User.findOneAndUpdate({ email: 'donor@lifelink.app' }, { $setOnInsert: {
      name: 'Sample Donor',
      email: 'donor@lifelink.app',
      passwordHash: await bcrypt.hash('donor123', 10),
      role: 'DONOR',
      city: 'Bengaluru',
      phone: '+91 90000 00002',
    } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  await DonorProfile.findOneAndUpdate({ userId: donorUser!._id }, { $setOnInsert: {
      userId: donorUser!._id,
      bloodGroup: 'O_POSITIVE',
      city: 'Koramangala',
      latitude: 12.9352,
      longitude: 77.6245,
      available: true,
      consentVisible: true,
      verificationStatus: 'VERIFIED',
      isDemo: true,
    } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  await BloodBank.findOneAndUpdate({ _id: '64b000000000000000000001' }, { $setOnInsert: {
      name: 'Bengaluru Red Cross Blood Bank',
      city: 'Bengaluru',
      address: 'MG Road, Bengaluru',
      phone: '+91 80444 22001',
      latitude: 12.9716,
      longitude: 77.5946,
      operatingHours: 'Open 24/7',
      bloodInventory: { 'A+': 18, 'O+': 24, 'B+': 9, 'AB+': 7 },
      verified: true,
      verificationStatus: 'VERIFIED',
      lastVerifiedAt: new Date(),
      isDemo: true,
    } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  await BloodBank.findOneAndUpdate({ _id: '64b000000000000000000002' }, { $setOnInsert: {
      name: 'City General Hospital Blood Centre',
      city: 'Bengaluru',
      address: 'Indiranagar, Bengaluru',
      phone: '+91 80444 22002',
      latitude: 12.9784,
      longitude: 77.6408,
      operatingHours: '8 AM - 8 PM',
      bloodInventory: { 'A-': 5, 'O-': 4, 'AB+': 8, 'B-': 3 },
      verified: true,
      verificationStatus: 'VERIFIED',
      lastVerifiedAt: new Date(),
      isDemo: true,
    } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  await BloodRequest.findOneAndUpdate({ _id: '64b000000000000000000003' }, { $setOnInsert: {
      userId: admin!._id,
      bloodGroup: 'A_POSITIVE',
      unitsNeeded: 2,
      urgency: 'Urgent',
      city: 'Bengaluru',
      hospitalName: 'Vijaya Hospital',
      contactMethod: 'Phone',
      details: 'Sample request for demonstration',
      status: 'SUBMITTED',
      isDemo: true,
    } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  console.log('Seed data inserted');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => { await mongoose.disconnect(); });

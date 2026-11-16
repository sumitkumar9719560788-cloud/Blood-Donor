import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed data must never be loaded in production');
  }

  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lifelink.app' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@lifelink.app',
      passwordHash: adminPassword,
      role: 'ADMIN',
      city: 'Bengaluru',
      phone: '+91 90000 00001',
    },
  });

  const donorUser = await prisma.user.upsert({
    where: { email: 'donor@lifelink.app' },
    update: {},
    create: {
      name: 'Sample Donor',
      email: 'donor@lifelink.app',
      passwordHash: await bcrypt.hash('donor123', 10),
      role: 'DONOR',
      city: 'Bengaluru',
      phone: '+91 90000 00002',
    },
  });

  await prisma.donorProfile.upsert({
    where: { userId: donorUser.id },
    update: {},
    create: {
      userId: donorUser.id,
      bloodGroup: 'O_POSITIVE',
      city: 'Koramangala',
      latitude: 12.9352,
      longitude: 77.6245,
      available: true,
      consentVisible: true,
      isDemo: true,
    },
  });

  await prisma.bloodBank.upsert({
    where: { id: '64b000000000000000000001' },
    update: {},
    create: {
      id: '64b000000000000000000001',
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
    },
  });

  await prisma.bloodBank.upsert({
    where: { id: '64b000000000000000000002' },
    update: {},
    create: {
      id: '64b000000000000000000002',
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
    },
  });

  await prisma.bloodRequest.upsert({
    where: { id: '64b000000000000000000003' },
    update: {},
    create: {
      id: '64b000000000000000000003',
      userId: admin.id,
      bloodGroup: 'A_POSITIVE',
      unitsNeeded: 2,
      urgency: 'Urgent',
      city: 'Bengaluru',
      hospitalName: 'Vijaya Hospital',
      contactMethod: 'Phone',
      details: 'Sample request for demonstration',
      status: 'SUBMITTED',
      isDemo: true,
    },
  });

  console.log('Seed data inserted');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

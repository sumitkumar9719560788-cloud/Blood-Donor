import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import env from './config/env.js';
import { User } from './models.js';

const name = process.env.ADMIN_NAME?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!name || name.length < 2 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12) {
  throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters before running this command.');
}

try {
  await mongoose.connect(env.DATABASE_URL);
  if (await User.exists({ role: 'ADMIN' })) throw new Error('An administrator already exists; bootstrap is allowed only for the first admin.');
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN', active: true });
  console.log(`Created initial administrator account: ${user.email}`);
} finally {
  await mongoose.disconnect();
}

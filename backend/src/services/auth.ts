import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../database/prisma.js';
import env from '../config/env.js';
import { AppError } from '../utils/errors.js';

export const hashPassword = async (password: string) => bcrypt.hash(password, 10);

export const registerUser = async (input: { name: string; email: string; password: string; phone?: string; city?: string; role?: 'USER' | 'DONOR' | 'REQUESTER' }) => {
  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new AppError('Email already registered', 409);

  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
      phone: input.phone,
      city: input.city,
      role: input.role || 'USER',
    },
    select: { id: true, name: true, email: true, phone: true, city: true, role: true, createdAt: true },
  });
};

export const loginUser = async (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw new AppError('Invalid email or password', 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401);

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: '7d' });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      role: user.role,
    },
  };
};

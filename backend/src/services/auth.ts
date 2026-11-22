import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models.js';
import env from '../config/env.js';
import { AppError } from '../utils/errors.js';

export const hashPassword = async (password: string) => bcrypt.hash(password, 10);

export const registerUser = async (input: { name: string; email: string; password: string; phone?: string; city?: string; role?: 'USER' | 'DONOR' | 'REQUESTER' }) => {
  const email = input.email.trim().toLowerCase();
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new AppError('Email already registered', 409);

  const passwordHash = await hashPassword(input.password);

  const user = await User.create({
      name: input.name,
      email,
      passwordHash,
      phone: input.phone,
      city: input.city,
      role: input.role || 'USER',
    });
  return user.toJSON();
};

export const loginUser = async (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.active) throw new AppError('Invalid email or password', 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401);

  const token = jwt.sign({ id: String(user._id), email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: '7d' });

  return {
    token,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      role: user.role,
    },
  };
};

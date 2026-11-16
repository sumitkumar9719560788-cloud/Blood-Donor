import dotenv from 'dotenv';

dotenv.config();

const env = {
  PORT: Number(process.env.PORT || 5000),
  JWT_SECRET: process.env.JWT_SECRET || '',
  DATABASE_URL: process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/lifelink?replicaSet=rs0',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a secret of at least 32 characters in backend/.env');
}

if (!env.DATABASE_URL.startsWith('mongodb://') && !env.DATABASE_URL.startsWith('mongodb+srv://')) {
  throw new Error('DATABASE_URL must be a MongoDB connection string (mongodb:// or mongodb+srv://)');
}

export default env;

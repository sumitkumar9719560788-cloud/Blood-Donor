import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import env from './config/env.js';
import authRoutes from './routes/auth.js';
import donorRoutes from './routes/donors.js';
import bankRoutes from './routes/banks.js';
import requestRoutes from './routes/requests.js';
import adminRoutes from './routes/admin.js';
import reportRoutes from './routes/reports.js';
import mongooseConnection, { connectDatabase } from './database/mongoose.js';

const app = express();
const allowedOrigins = env.CLIENT_URL.split(',').map((origin) => origin.trim()).filter(Boolean);

app.set('trust proxy', 1);
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)), credentials: true }));
app.use(express.json({ limit: '16kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', async (_req, res) => {
  try {
    await mongooseConnection.db?.admin().ping();
    res.json({ status: 'ok', database: 'connected', message: 'LifeLink API is ready' });
  } catch {
    res.status(503).json({ status: 'unavailable', database: 'disconnected', message: 'LifeLink API cannot reach its database' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const errorRecord = typeof error === 'object' && error !== null ? error as { statusCode?: number; status?: number } : {};
  const status = errorRecord.statusCode || errorRecord.status || 500;
  const message = status >= 500
    ? 'Internal server error'
    : error instanceof Error ? error.message : 'Request failed';
  res.status(status).json({ message });
});

connectDatabase(env.DATABASE_URL).then(() => {
  app.listen(env.PORT, () => console.log(`LifeLink API listening on http://localhost:${env.PORT}`));
}).catch((error: unknown) => {
  console.error('Unable to connect to MongoDB', error instanceof Error ? error.message : 'Unknown database error');
  process.exit(1);
});

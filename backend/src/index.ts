import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import authRoutes from './routes/auth.js';
import donorRoutes from './routes/donors.js';
import bankRoutes from './routes/banks.js';
import requestRoutes from './routes/requests.js';
import adminRoutes from './routes/admin.js';
import reportRoutes from './routes/reports.js';

const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'LifeLink API is running' });
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

app.listen(env.PORT, () => {
  console.log(`LifeLink API listening on http://localhost:${env.PORT}`);
});

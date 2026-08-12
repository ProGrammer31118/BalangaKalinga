import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import authRoutes from './routes_auth.js';
import assessmentRoutes from './routes_assessment.js';
import scheduleRoutes from './routes_schedules.js';
import adminRoutes from './routes_admin.js';
import aiRoutes from './routes_ai.js';
import downloadRoutes from './routes_download.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'Balanga Kalinga API', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/download', downloadRoutes);

// Serve built React app in production
const clientDir = join(__dirname, '..', 'client', 'dist');
if (existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(join(clientDir, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Unexpected error' });
});

app.listen(PORT, () => {
  console.log(`Balanga Kalinga server running at http://localhost:${PORT}`);
});
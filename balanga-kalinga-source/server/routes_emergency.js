import { Router } from 'express';
import db from './db.js';

const router = Router();

router.get('/resources', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM emergency_resources ORDER BY is_primary DESC, category').all();
  res.json({ resources: rows });
});

export default router;
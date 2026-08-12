import { Router } from 'express';
import db from './db.js';
import { authRequired } from './middleware.js';

const router = Router();

router.use(authRequired);

router.get('/', async (req, res) => {
  const rows = await db
    .prepare('SELECT * FROM self_care_activities ORDER BY id')
    .all();
  const logs = await db
    .prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY completed_at DESC LIMIT 50')
    .all(req.user.id);
  const completedActivityIds = new Set(logs.filter((l) => l.status === 'completed').map((l) => l.activity_id));
  const categories = [...new Set(rows.map((a) => a.category))];
  res.json({
    categories,
    activities: rows.map((a) => ({
      ...a,
      instructions: (() => { try { return JSON.parse(a.instructions); } catch { return []; } })(),
      completed: completedActivityIds.has(a.id),
    })),
  });
});

router.get('/logs', async (req, res) => {
  const rows = await db
    .prepare(
      `SELECT l.*, a.title AS activity_title, a.category, a.emoji
       FROM activity_logs l JOIN self_care_activities a ON a.id = l.activity_id
       WHERE l.user_id = ? ORDER BY l.completed_at DESC`
    )
    .all(req.user.id);
  res.json({ logs: rows });
});

router.post('/:id/complete', async (req, res) => {
  const activity = await db.prepare('SELECT * FROM self_care_activities WHERE id = ?').get(req.params.id);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });
  const existing = await db
    .prepare('SELECT id FROM activity_logs WHERE user_id = ? AND activity_id = ? AND status = ?')
    .get(req.user.id, activity.id, 'completed');
  if (!existing) {
    await db.prepare('INSERT INTO activity_logs (user_id, activity_id, status) VALUES (?, ?, ?)').run(req.user.id, activity.id, 'completed');
  }
  // subtle: echo encouragement
  res.status(201).json({ ok: true, message: 'Activity completed. Small steps count!' });
});

export default router;
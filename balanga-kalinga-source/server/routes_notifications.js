import { Router } from 'express';
import db from './db.js';
import { authRequired } from './middleware.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const rows = await db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user.id);
  const unread = rows.filter((n) => !n.is_read).length;
  res.json({ notifications: rows, unread });
});

router.patch('/:id/read', async (req, res) => {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.patch('/read-all', async (req, res) => {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
  res.json({ ok: true });
});

// Demo-reset: restore unread counts (used by "Get Help Now" flows etc.)
router.post('/trigger', async (req, res) => {
  const { type } = req.body || {};
  if (type === 'wellness') {
    await db.prepare(
      "INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)"
    ).run(
      req.user.id,
      'Wellness check reminder',
      'A quick check-in helps you notice patterns early. It only takes a minute.',
      'reminder',
      '/app/wellness'
    );
  }
  res.json({ ok: true });
});

export default router;
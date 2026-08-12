import { Router } from 'express';
import db from './db.js';
import { authMiddleware } from './middleware.js';

const router = Router();

router.use(authMiddleware);

// Get user notifications
router.get('/', (req, res) => {
  const { unread_only, limit = 50 } = req.query;
  
  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  const params = [req.user.id];
  
  if (unread_only === 'true') {
    query += ' AND is_read = 0';
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  const notifications = db.prepare(query).all(...params);
  const unreadCount = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).c;
  
  res.json({ notifications, unreadCount });
});

// Mark notification as read
router.patch('/:id/read', (req, res) => {
  const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  res.json({ success: true });
});

// Mark all notifications as read
router.patch('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
  res.json({ success: true });
});

// Delete notification
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  res.json({ success: true });
});

export default router;
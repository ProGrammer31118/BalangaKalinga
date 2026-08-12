import { Router } from 'express';
import db from './db.js';
import { authRequired, adminOnly } from './middleware.js';

const router = Router();
router.use(authRequired, adminOnly);

function stats() {
  const users = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  const students = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'student'").get().c;
  const assessments = db.prepare('SELECT COUNT(*) c FROM assessments').get().c;
  const pending = db.prepare("SELECT COUNT(*) c FROM schedules WHERE status = 'available'").get().c;
  const byCategory = db.prepare(
    'SELECT category, COUNT(*) c FROM assessments GROUP BY category'
  ).all();
  const recent = db.prepare(
    `SELECT a.*, u.name AS student_name FROM assessments a
     JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 8`
  ).all();
  return { users, students, assessments, pending, byCategory, recent };
}

router.get('/stats', (req, res) => res.json(stats()));

router.get('/users', (req, res) => {
  const rows = db
    .prepare('SELECT id, name, email, role, grade_level, strand, school, created_at FROM users ORDER BY created_at DESC')
    .all();
  res.json({ users: rows });
});

router.patch('/users/:id/role', (req, res) => {
  const { role } = req.body || {};
  if (!['student', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ ok: true });
});

export default router;
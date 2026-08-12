import { Router } from 'express';
import db from './db.js';
import { authRequired, adminOnly } from './middleware.js';

const router = Router();

router.use(authRequired);

// Student: schedules assigned to me
router.get('/mine', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM schedules WHERE student_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ schedules: rows });
});

// Admin: all schedules
router.get('/', adminOnly, (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*, u.name AS student_name FROM schedules s
       LEFT JOIN users u ON u.id = s.student_id
       ORDER BY s.created_at DESC`
    )
    .all();
  res.json({ schedules: rows });
});

// Admin: create schedule (optionally assign a student)
router.post('/', adminOnly, (req, res) => {
  const { title, student_id = null, scheduled_at = '', duration_minutes = 45, method = 'In-person', location = '', notes = '' } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const info = db
    .prepare(
      `INSERT INTO schedules (title, student_id, scheduled_at, duration_minutes, method, location, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'available', ?)`
    )
    .run(title, student_id || null, scheduled_at, duration_minutes, method, location, notes, req.user.id);
  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ schedule: row });
});

// Update a schedule (assign student / change status / reschedule)
router.patch('/:id', adminOnly, (req, res) => {
  const { title, student_id, scheduled_at, duration_minutes, method, location, notes, status } = req.body || {};
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Schedule not found' });

  db.prepare(
    `UPDATE schedules SET title = ?, student_id = ?, scheduled_at = ?, duration_minutes = ?,
       method = ?, location = ?, notes = ?, status = ? WHERE id = ?`
  ).run(
    title ?? existing.title,
    student_id === undefined ? existing.student_id : student_id,
    scheduled_at ?? existing.scheduled_at,
    duration_minutes ?? existing.duration_minutes,
    method ?? existing.method,
    location ?? existing.location,
    notes ?? existing.notes,
    status ?? existing.status,
    existing.id
  );
  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(existing.id);
  res.json({ schedule: row });
});

router.delete('/:id', adminOnly, (req, res) => {
  db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
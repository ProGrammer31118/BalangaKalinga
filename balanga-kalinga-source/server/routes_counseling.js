import { Router } from 'express';
import db from './db.js';
import { authRequired } from './middleware.js';
import { sendEmail, appointmentRequestEmail, appointmentDecisionEmail } from './email.js';

const router = Router();
router.use(authRequired);

async function notifyAdmins(title, message, link = '/admin?tab=appointments') {
  const admins = await db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
  const ins = db.prepare('INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)');
  for (const a of admins) {
    await ins.run(a.id, title, message, 'info', link);
  }
}

// Available counselors (public catalog for students)
router.get('/counselors', async (req, res) => {
  const rows = await db
    .prepare('SELECT * FROM counselors ORDER BY is_available DESC, id')
    .all();
  res.json({
    counselors: rows.map((c) => ({
      id: c.id,
      name: c.name,
      specialization: c.specialization,
      description: c.description,
      schedule: (() => { try { return JSON.parse(c.schedule); } catch { return []; } })(),
      avatar: c.avatar,
      color: c.color,
      is_available: c.is_available,
    })),
  });
});

// My appointments
router.get('/appointments/mine', async (req, res) => {
  const rows = await db
    .prepare(
      `SELECT a.*, c.name AS counselor_name, c.specialization, c.color, c.avatar
       FROM appointments a JOIN counselors c ON c.id = a.counselor_id
       WHERE a.user_id = ? ORDER BY a.requested_date DESC`
    )
    .all(req.user.id);
  res.json({ appointments: rows });
});

// Request an appointment
router.post('/appointments', async (req, res) => {
  const { counselor_id, requested_date, requested_time, method = 'In-person', notes = '' } = req.body || {};
  const counselor = await db.prepare('SELECT * FROM counselors WHERE id = ?').get(counselor_id);
  if (!counselor) return res.status(404).json({ error: 'Counselor not found' });
  if (!requested_date || !requested_time) {
    return res.status(400).json({ error: 'Please choose a date and time' });
  }
  const info = await db
    .prepare(
      `INSERT INTO appointments (user_id, counselor_id, requested_date, requested_time, method, notes, status, status_note)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(req.user.id, counselor_id, requested_date, requested_time, method, notes, 'Waiting for counselor confirmation');
  const row = await db
    .prepare(
      `SELECT a.*, c.name AS counselor_name, c.specialization, c.color, c.avatar
       FROM appointments a JOIN counselors c ON c.id = a.counselor_id WHERE a.id = ?`
    )
    .get(info.lastInsertRowid);
  // Confirmation notification
  await db.prepare(
    'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)'
  ).run(
    req.user.id,
    'Appointment requested',
    `Your appointment request with ${counselor.name} on ${requested_date} at ${requested_time} has been sent. You will be notified once it is confirmed.`,
    'info',
    '/app/counseling'
  );
  // Email confirmation + alert admins (only if email notifications are enabled)
  const user = await db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id);
  const prefs = (() => { try { return JSON.parse(user.notif_prefs || '{}'); } catch { return {}; } })();
  if (prefs.appointments !== false && user.email) {
    const { subject, html } = appointmentRequestEmail(user.name, counselor.name, requested_date, requested_time, method);
    await sendEmail(user.email, subject, html);
  }
  await notifyAdmins(
    'New appointment request',
    `${user.name} requested an appointment with ${counselor.name} on ${requested_date} at ${requested_time}.`
  );
  res.status(201).json({ appointment: row });
});

// Cancel my appointment
router.patch('/appointments/:id/cancel', async (req, res) => {
  const existing = await db
    .prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Appointment not found' });
  if (existing.status === 'cancelled') return res.status(400).json({ error: 'Appointment already cancelled' });
  await db.prepare("UPDATE appointments SET status = 'cancelled', status_note = 'Cancelled by student' WHERE id = ?").run(existing.id);
  const counselorRow = await db.prepare('SELECT name FROM counselors WHERE id = ?').get(existing.counselor_id);
  await notifyAdmins(
    'Appointment cancelled',
    `A student cancelled their appointment with ${counselorRow ? counselorRow.name : 'a counselor'} scheduled for ${existing.requested_date} at ${existing.requested_time}.`
  );
  res.json({ ok: true });
});

// Reschedule my appointment
router.patch('/appointments/:id/reschedule', async (req, res) => {
  const { requested_date, requested_time, method } = req.body || {};
  const existing = await db
    .prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Appointment not found' });
  if (!requested_date || !requested_time) return res.status(400).json({ error: 'Please choose a new date and time' });
  await db.prepare(
    `UPDATE appointments SET requested_date = ?, requested_time = ?, method = ?, status = 'pending', status_note = 'Rescheduled by student — waiting for reconfirmation' WHERE id = ?`
  ).run(requested_date, requested_time, method ?? existing.method, existing.id);
  const row = await db
    .prepare(
      `SELECT a.*, c.name AS counselor_name, c.specialization, c.color, c.avatar
       FROM appointments a JOIN counselors c ON c.id = a.counselor_id WHERE a.id = ?`
    )
    .get(existing.id);
  await db.prepare(
    'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)'
  ).run(
    req.user.id,
    'Appointment rescheduled',
    `Your appointment with ${row.counselor_name} is now set for ${requested_date} at ${requested_time}.`,
    'info',
    '/app/counseling'
  );
  const user = await db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id);
  const prefs = (() => { try { return JSON.parse(user.notif_prefs || '{}'); } catch { return {}; } })();
  if (prefs.appointments !== false && user.email) {
    const { subject, html } = appointmentRequestEmail(user.name, row.counselor_name, requested_date, requested_time, row.method);
    await sendEmail(user.email, 'Your appointment was rescheduled — Balanga Kalinga', html.replace(/received\./i, 'was updated.'));
  }
  await notifyAdmins(
    'Appointment rescheduled',
    `${user.name} rescheduled their appointment with ${row.counselor_name} to ${requested_date} at ${requested_time}.`
  );
  res.json({ appointment: row });
});

export default router;
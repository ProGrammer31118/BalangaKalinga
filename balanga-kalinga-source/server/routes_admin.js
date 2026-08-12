import { Router } from 'express';
import db from './db.js';
import { authRequired, adminOnly } from './middleware.js';

const router = Router();
router.use(authRequired, adminOnly);

function parse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// Aggregated overview — deliberately no private journal/conversation content.
router.get('/overview', async (req, res) => {
  const studentsRow = await db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'student'").get();
  const totalUsersRow = await db.prepare('SELECT COUNT(*) c FROM users').get();
  const assessmentsRow = await db.prepare('SELECT COUNT(*) c FROM wellness_assessments').get();
  const appointmentsTotalRow = await db.prepare('SELECT COUNT(*) c FROM appointments').get();
  const appointmentsPendingRow = await db.prepare("SELECT COUNT(*) c FROM appointments WHERE status = 'pending'").get();
  const appointmentsApprovedRow = await db.prepare("SELECT COUNT(*) c FROM appointments WHERE status = 'approved'").get();
  const selfCareRow = await db.prepare("SELECT COUNT(*) c FROM activity_logs WHERE status = 'completed'").get();
  const journalCountRow = await db.prepare('SELECT COUNT(*) c FROM journal_entries').get();
  const moodsTodayRow = await db.prepare("SELECT COUNT(*) c FROM moods WHERE substr(created_at,1,10) = CURDATE()").get();

  // Aggregated wellness distribution across students
  const byLevel = await db.prepare(
    'SELECT overall_level, COUNT(*) c FROM wellness_assessments GROUP BY overall_level'
  ).all();

  // Latest assessment per student → aggregate levels (only counts, no names/ids)
  const levelCounts = {};
  for (const row of byLevel) levelCounts[row.overall_level] = row.c;

  // Common weak areas across all assessments (aggregated)
  const areaCounts = {};
  const allAreas = await db.prepare('SELECT areas FROM wellness_assessments').all();
  for (const a of allAreas) {
    const areas = parse(a.areas, { weakAreas: [] });
    for (const w of areas.weakAreas || []) areaCounts[w] = (areaCounts[w] || 0) + 1;
  }
  const topAreas = Object.entries(areaCounts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 6);

  // Most-used self-care activities (aggregated)
  const topActivities = await db.prepare(
    `SELECT a.title, a.emoji, COUNT(*) c FROM activity_logs l
     JOIN self_care_activities a ON a.id = l.activity_id
     WHERE l.status = 'completed' GROUP BY a.id ORDER BY c DESC LIMIT 6`
  ).all();

  // Weekly assessment trend (aggregated)
  const weekTrend = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = await db.prepare('SELECT COUNT(*) c FROM wellness_assessments WHERE substr(created_at,1,10) = ?').get(key);
    weekTrend.push({ date: key, label: d.toLocaleDateString('en-US', { weekday: 'short' }), count: row ? row.c : 0 });
  }

  // Pending appointments (need approval)
  const pendingAppointments = await db.prepare(
    `SELECT a.id, a.requested_date, a.requested_time, a.method, a.created_at,
            u.name AS student_name, c.name AS counselor_name
     FROM appointments a JOIN users u ON u.id = a.user_id JOIN counselors c ON c.id = a.counselor_id
     WHERE a.status = 'pending' ORDER BY a.created_at ASC`
  ).all();

  res.json({
    totals: {
      students: studentsRow ? studentsRow.c : 0,
      totalUsers: totalUsersRow ? totalUsersRow.c : 0,
      assessments: assessmentsRow ? assessmentsRow.c : 0,
      appointmentsTotal: appointmentsTotalRow ? appointmentsTotalRow.c : 0,
      appointmentsPending: appointmentsPendingRow ? appointmentsPendingRow.c : 0,
      appointmentsApproved: appointmentsApprovedRow ? appointmentsApprovedRow.c : 0,
      selfCare: selfCareRow ? selfCareRow.c : 0,
      journalCount: journalCountRow ? journalCountRow.c : 0,
      moodsToday: moodsTodayRow ? moodsTodayRow.c : 0,
    },
    byLevel: Object.entries(levelCounts).map(([label, count]) => ({ label, count })),
    topAreas,
    topActivities,
    weekTrend,
    pendingAppointments,
  });
});

// Student list (aggregated, no wellness content)
router.get('/students', async (req, res) => {
  const rows = await db
    .prepare(
      `SELECT u.id, u.name, u.email, u.course, u.year_level, u.school, u.student_id, u.created_at,
        (SELECT COUNT(*) FROM wellness_assessments a WHERE a.user_id = u.id) AS checks,
        (SELECT COUNT(*) FROM activity_logs l WHERE l.user_id = u.id) AS activities,
        (SELECT COUNT(*) FROM appointments ap WHERE ap.user_id = u.id) AS appointments
       FROM users u WHERE u.role = 'student' ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ students: rows });
});

// ---------- Counseling management ----------
router.get('/counselors', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM counselors ORDER BY id').all();
  res.json({
    counselors: rows.map((c) => ({ ...c, schedule: parse(c.schedule, []) })),
  });
});

router.post('/counselors', async (req, res) => {
  const { name, specialization, description, schedule = [], color = '#4338ca', is_available = 1 } = req.body || {};
  if (!name || !specialization) return res.status(400).json({ error: 'Name and specialization are required' });
  const info = await db.prepare(
    'INSERT INTO counselors (name, specialization, description, schedule, color, is_available) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, specialization, description || '', JSON.stringify(schedule), color, is_available ? 1 : 0);
  const row = await db.prepare('SELECT * FROM counselors WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ counselor: row });
});

router.patch('/counselors/:id', async (req, res) => {
  const { name, specialization, description, schedule, color, is_available } = req.body || {};
  const existing = await db.prepare('SELECT * FROM counselors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Counselor not found' });
  await db.prepare(
    `UPDATE counselors SET name = ?, specialization = ?, description = ?, schedule = ?, color = ?, is_available = ? WHERE id = ?`
  ).run(
    name ?? existing.name,
    specialization ?? existing.specialization,
    description ?? existing.description,
    schedule ? JSON.stringify(schedule) : existing.schedule,
    color ?? existing.color,
    is_available === undefined ? existing.is_available : (is_available ? 1 : 0),
    existing.id
  );
  const row = await db.prepare('SELECT * FROM counselors WHERE id = ?').get(existing.id);
  res.json({ counselor: row });
});

router.delete('/counselors/:id', async (req, res) => {
  await db.prepare('DELETE FROM counselors WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Appointments: list all + approve/decline
router.get('/appointments', async (req, res) => {
  const rows = await db.prepare(
    `SELECT a.*, u.name AS student_name, u.email AS student_email, c.name AS counselor_name
     FROM appointments a JOIN users u ON u.id = a.user_id JOIN counselors c ON c.id = a.counselor_id
     ORDER BY a.created_at DESC`
  ).all();
  res.json({ appointments: rows });
});

router.patch('/appointments/:id', async (req, res) => {
  const { status, status_note } = req.body || {};
  const existing = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Appointment not found' });
  if (!['approved', 'declined', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  await db.prepare('UPDATE appointments SET status = ?, status_note = ? WHERE id = ?').run(status, status_note || '', existing.id);
  // Notify student of decision
  const title = status === 'approved' ? 'Appointment approved' : status === 'declined' ? 'Appointment declined' : status === 'completed' ? 'Appointment completed' : 'Appointment cancelled';
  const msg = status === 'approved'
    ? `Great news! Your appointment with ${existing.counselor_name || 'your counselor'} has been confirmed.`
    : status === 'declined'
      ? 'Your appointment request was not approved this time. Please request a new slot when ready.'
      : 'Your appointment status has been updated.';
  await db.prepare('INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)').run(
    existing.user_id, title, msg, status === 'approved' ? 'success' : 'info', '/app/counseling'
  );
  res.json({ ok: true });
});

export default router;
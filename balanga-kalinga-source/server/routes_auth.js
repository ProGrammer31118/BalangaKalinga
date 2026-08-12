import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from './db.js';
import { signToken, authRequired } from './middleware.js';

const router = Router();

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    student_id: u.student_id,
    role: u.role,
    course: u.course,
    year_level: u.year_level,
    school: u.school,
    avatar: u.avatar,
    notif_prefs: (() => {
      try { return JSON.parse(u.notif_prefs || '{}'); } catch { return {}; }
    })(),
    consent_at: u.consent_at,
    created_at: u.created_at,
  };
}

router.post('/register', async (req, res) => {
  const {
    name, email, password, student_id = '', course = '', year_level = '', school = '',
    consent = false, role = 'student',
  } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (role !== 'student' && role !== 'admin') {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (role === 'student' && !consent) {
    return res.status(400).json({ error: 'Consent to the privacy policy is required to create an account.' });
  }
  const emailKey = String(email).toLowerCase().trim();
  const exists = await db.prepare('SELECT id FROM users WHERE email = ?').get(emailKey);
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  if (student_id) {
    const sid = await db.prepare('SELECT id FROM users WHERE student_id = ?').get(student_id);
    if (sid) return res.status(409).json({ error: 'Student ID already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = await db
    .prepare(
      `INSERT INTO users (name, email, student_id, password_hash, role, course, year_level, school, consent_at, notif_prefs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      emailKey,
      student_id || null,
      hash,
      role,
      course,
      year_level,
      school,
      role === 'student' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null,
      JSON.stringify({ appointments: true, wellness: true, counselors: true, activities: true })
    );
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, student_id, password } = req.body || {};
  if ((!email && !student_id) || !password) {
    return res.status(400).json({ error: 'Email/Student ID and password are required' });
  }
  const col = email ? 'email' : 'student_id';
  const val = email ? String(email).toLowerCase().trim() : String(student_id).trim();
  const user = await db.prepare(`SELECT * FROM users WHERE ${col} = ?`).get(val);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', authRequired, async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

router.patch('/me', authRequired, async (req, res) => {
  const {
    name, course, year_level, school, avatar, student_id, notif_prefs,
  } = req.body || {};
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const shouldUpdateAvatar = typeof avatar === 'string';
  await db.prepare(
    `UPDATE users SET name = ?, course = ?, year_level = ?, school = ?,
     avatar = ?, student_id = ?, notif_prefs = ? WHERE id = ?`
  ).run(
    name ?? user.name,
    course ?? user.course,
    year_level ?? user.year_level,
    school ?? user.school,
    shouldUpdateAvatar ? avatar : user.avatar,
    student_id === undefined ? user.student_id : (student_id || null),
    notif_prefs ? JSON.stringify(notif_prefs) : user.notif_prefs,
    user.id
  );
  const updated = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ user: publicUser(updated) });
});

router.post('/change-password', authRequired, async (req, res) => {
  const { current, next } = req.body || {};
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!current || !next) return res.status(400).json({ error: 'Current and new password are required' });
  if (next.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  if (!bcrypt.compareSync(current, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 10), user.id);
  res.json({ ok: true });
});

// Full data deletion (GDPR-style). Removes all wellness records for the user.
router.delete('/me/data', authRequired, async (req, res) => {
  const userId = req.user.id;
  await db.prepare('DELETE FROM wellness_assessments WHERE user_id = ?').run(userId);
  await db.prepare('DELETE FROM moods WHERE user_id = ?').run(userId);
  await db.prepare('DELETE FROM journal_entries WHERE user_id = ?').run(userId);
  await db.prepare('DELETE FROM appointments WHERE user_id = ?').run(userId);
  await db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  const conversations = await db.prepare('SELECT id FROM ai_conversations WHERE user_id = ?').all(userId);
  for (const c of conversations) await db.prepare('DELETE FROM ai_messages WHERE conversation_id = ?').run(c.id);
  await db.prepare('DELETE FROM ai_conversations WHERE user_id = ?').run(userId);
  await db.prepare('DELETE FROM activity_logs WHERE user_id = ?').run(userId);
  res.json({ ok: true, message: 'All personal wellness data has been deleted.' });
});

// Full account deletion
router.delete('/me/account', authRequired, async (req, res) => {
  await db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.json({ ok: true, message: 'Account and all associated data deleted.' });
});

export default router;
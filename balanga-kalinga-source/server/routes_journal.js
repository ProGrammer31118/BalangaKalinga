import { Router } from 'express';
import db from './db.js';
import { authRequired } from './middleware.js';

const router = Router();
router.use(authRequired);

const TAGS = ['School', 'Family', 'Friends', 'Relationships', 'Money', 'Future', 'Personal'];

function parseTags(r) {
  try { return JSON.parse(r.tags || '[]'); } catch { return []; }
}

router.get('/', async (req, res) => {
  const { q = '', tag = '' } = req.query;
  let rows;
  if (tag) {
    rows = await db
      .prepare('SELECT * FROM journal_entries WHERE user_id = ? AND tags LIKE ? ORDER BY created_at DESC')
      .all(req.user.id, `%"${tag}"%`);
  } else {
    rows = await db
      .prepare('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user.id);
  }
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((r) => (r.content + ' ' + r.title).toLowerCase().includes(needle));
  }
  res.json({
    tags: TAGS,
    entries: rows.map((r) => ({ ...r, tags: parseTags(r) })),
  });
});

router.get('/calendar', async (req, res) => {
  const rows = await db
    .prepare('SELECT id, entry_date, mood, title FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC')
    .all(req.user.id);
  res.json({ entries: rows });
});

router.post('/', async (req, res) => {
  const { title = '', content, mood = 'okay', tags = [], entry_date } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: 'Entry content is required' });
  const info = await db
    .prepare(
      `INSERT INTO journal_entries (user_id, title, content, mood, tags, entry_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      title,
      content,
      mood,
      JSON.stringify(tags.filter((t) => TAGS.includes(t))),
      entry_date || new Date().toISOString().slice(0, 10)
    );
  const row = await db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ entry: { ...row, tags: parseTags(row) } });
});

router.patch('/:id', async (req, res) => {
  const { title, content, mood, tags, entry_date } = req.body || {};
  const existing = await db
    .prepare('SELECT * FROM journal_entries WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Entry not found' });
  await db.prepare(
    `UPDATE journal_entries SET title = ?, content = ?, mood = ?, tags = ?, entry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(
    title ?? existing.title,
    content ?? existing.content,
    mood ?? existing.mood,
    tags ? JSON.stringify(tags.filter((t) => TAGS.includes(t))) : existing.tags,
    entry_date ?? existing.entry_date,
    existing.id
  );
  const row = await db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(existing.id);
  res.json({ entry: { ...row, tags: parseTags(row) } });
});

router.delete('/:id', async (req, res) => {
  const info = await db
    .prepare('DELETE FROM journal_entries WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Entry not found' });
  res.json({ ok: true });
});

// Gentle AI reflection on recent entries (non-diagnostic)
router.post('/reflect', async (req, res) => {
  const recent = await db
    .prepare('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 12')
    .all(req.user.id);
  if (!recent.length) {
    return res.json({
      reflection: 'You have not written any journal entries yet. That is okay — every journey begins with one line. Whenever you are ready, a couple of sentences can help you make sense of your day.',
      hasReflection: false,
    });
  }
  const text = recent.map((r) => r.content).join(' ').toLowerCase();
  const themes = [];
  const counts = {};
  for (const t of ['school', 'exam', 'deadline', 'work', 'grade', 'test']) {
    const c = (text.match(new RegExp(t, 'g')) || []).length;
    if (c > 0) { themes.push('school pressure'); counts['school'] = (counts['school'] || 0) + 1; }
    break;
  }
  for (const t of ['friend', 'family', 'relat', 'mom', 'dad', 'argument', 'fight']) {
    if ((text.match(new RegExp(t, 'g')) || []).length > 0) { themes.push('relationships'); break; }
  }
  for (const t of ['tired', 'sleep', 'insomnia', 'exhausted', 'energy']) {
    if ((text.match(new RegExp(t, 'g')) || []).length > 0) { themes.push('sleep and energy'); break; }
  }
  for (const t of ['anxious', 'worry', 'nervous', 'panic', 'overwhelm', 'stress']) {
    if ((text.match(new RegExp(t, 'g')) || []).length > 0) { themes.push('stress and worry'); break; }
  }
  const unique = [...new Set(themes)].slice(0, 2);

  const reflection = unique.length
    ? `Looking back at your recent entries, I noticed ${unique.join(' and ')} showing up a few times. That is a pattern worth noticing, not judging. Want to explore a coping activity together, or write down one small step you could take this week?`
    : 'Reading through your recent entries, I notice you are giving space to what is on your mind — that in itself is a form of self-care. Is there a small win from this week you can carry with you?';

  res.json({ reflection, hasReflection: true, themes: unique });
});

export default router;
import { Router } from 'express';
import db from './db.js';
import { authRequired } from './middleware.js';

const router = Router();
router.use(authRequired);

const MOOD_ORDER = [
  { key: 'great', label: 'Great', emoji: '😊', value: 5 },
  { key: 'good', label: 'Good', emoji: '🙂', value: 4 },
  { key: 'okay', label: 'Okay', emoji: '😐', value: 3 },
  { key: 'stressed', label: 'Stressed', emoji: '😟', value: 2 },
  { key: 'overwhelmed', label: 'Overwhelmed', emoji: '😣', value: 1 },
  { key: 'low', label: 'Low', emoji: '😔', value: 0 },
];
const MOOD_BY_KEY = Object.fromEntries(MOOD_ORDER.map((m) => [m.key, m]));

// A single endpoint powering the Progress analytics page.
router.get('/overview', async (req, res) => {
  const uid = req.user.id;

  // 1. Weekly mood series (last 7 days)
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceIso = since.toISOString().slice(0, 10);
  const moodRows = await db
    .prepare(
      `SELECT id, mood, note, created_at FROM moods
       WHERE user_id = ? AND substr(created_at, 1, 10) >= ?
       ORDER BY created_at ASC`
    )
    .all(uid, sinceIso);
  const byDay = {};
  for (const m of moodRows) {
    const d = m.created_at.slice(0, 10);
    byDay[d] = m.mood;
  }
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const emoji = byDay[iso] ? MOOD_BY_KEY[byDay[iso]].emoji : null;
    days.push({
      date: iso,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      mood: byDay[iso] || null,
      emoji,
      value: byDay[iso] ? MOOD_BY_KEY[byDay[iso]].value : null,
    });
  }
  const weekTrend = days.filter((d) => d.value !== null).map((d) => d.value);
  const trend =
    weekTrend.length >= 2
      ? weekTrend[weekTrend.length - 1] - weekTrend[0]
      : 0;

  // 2. Assessment history (wellness checks)
  const assessments = await db
    .prepare(
      `SELECT id, overall_level, created_at FROM wellness_assessments
       WHERE user_id = ? ORDER BY created_at ASC`
    )
    .all(uid);
  const assessmentMap = assessments.map((a) => ({
    id: a.id,
    overall: a.overall_level,
    date: a.created_at.slice(0, 10),
  }));

  // 3. Self-care completions
  const selfCare = await db
    .prepare(
      `SELECT a.category, COUNT(*) c FROM activity_logs l
       JOIN self_care_activities a ON a.id = l.activity_id
       WHERE l.user_id = ? AND l.status = 'completed' GROUP BY a.category`
    )
    .all(uid);

  // 4. Journal activity (entries per week, last 8 weeks)
  const journalRows = await db
    .prepare('SELECT created_at FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC')
    .all(uid);
  const journalPerWeek = [];
  const now = new Date();
  for (let w = 7; w >= 0; w--) {
    const start = new Date(now);
    start.setDate(start.getDate() - (w + 1) * 7);
    const end = new Date(now);
    end.setDate(end.getDate() - w * 7);
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const c = journalRows.filter(
      (j) => j.created_at >= startIso && j.created_at < endIso
    ).length;
    journalPerWeek.push({ label: 'W' + (7 - w), count: c });
  }

  // 5. Common stress triggers from journal tags + moods notes
  const tagCounts = {};
  const journalTags = await db.prepare('SELECT tags FROM journal_entries WHERE user_id = ?').all(uid);
  for (const j of journalTags) {
    try {
      for (const t of JSON.parse(j.tags || '[]')) tagCounts[t] = (tagCounts[t] || 0) + 1;
    } catch {}
  }
  const moodNotes = await db
    .prepare('SELECT mood, note FROM moods WHERE user_id = ? AND note != ?')
    .all(uid, '');
  const stressKeywords = {
    'Academic pressure': ['project', 'deadline', 'exam', 'class', 'study', 'school', 'grade', 'test'],
    'Sleep': ['sleep', 'tired', 'insomnia', 'slept'],
    'Relationships': ['friend', 'family', 'argument', 'relationship'],
    'Overwhelm': ['overwhelm', 'everything', 'too much'],
    'Self-doubt': ['enough', 'good enough', 'worry'],
  };
  const triggerCounts = { ...tagCounts };
  for (const mn of moodNotes) {
    const t = (mn.note + ' ' + (mn.mood || '')).toLowerCase();
    for (const [k, words] of Object.entries(stressKeywords)) {
      if (words.some((w) => t.includes(w))) triggerCounts[k] = (triggerCounts[k] || 0) + 1;
    }
  }
  const triggers = Object.entries(triggerCounts)
    .map(([label, count]) => ({ label, count }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Quick stats
  const completion = await db
    .prepare("SELECT COUNT(*) c FROM activity_logs WHERE user_id = ? AND status = 'completed'")
    .get(uid);

  res.json({
    days,
    trend,
    assessments: assessmentMap,
    selfCare,
    journalPerWeek,
    triggers,
    totals: {
      checks: assessmentMap.length,
      selfCareCompleted: completion ? completion.c : 0,
      journalEntries: journalRows.length,
      moodChecks: moodRows.length,
    },
    moodMeta: MOOD_ORDER,
  });
});

export default router;
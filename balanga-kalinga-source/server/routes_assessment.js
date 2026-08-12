import { Router } from 'express';
import db from './db.js';
import { authRequired } from './middleware.js';

const router = Router();

const QUESTIONS = [
  { id: 1, text: 'How stressed do you feel about academic deadlines and workload right now?', area: 'Academic stress', short: 'Work' },
  { id: 2, text: 'In the last week, how has your sleep been?', area: 'Sleep', short: 'Sleep' },
  { id: 3, text: 'How is your energy level most days?', area: 'Energy', short: 'Energy' },
  { id: 4, text: 'How would you describe your overall mood lately?', area: 'Mood', short: 'Mood' },
  { id: 5, text: 'How connected do you feel to friends, family, or classmates?', area: 'Social connection', short: 'Connection' },
  { id: 6, text: 'How often do you feel anxious, nervous, or on edge?', area: 'Anxiety / Stress', short: 'Anxiety' },
  { id: 7, text: 'How is your motivation for schoolwork and daily tasks?', area: 'Motivation', short: 'Motivation' },
  { id: 8, text: 'How heavy does your current workload feel?', area: 'Workload', short: 'Workload' },
  { id: 9, text: 'How is your emotional well-being (hopeful vs. down) lately?', area: 'Emotional well-being', short: 'Emotions' },
  { id: 10, text: 'How well do you feel you are coping with everything right now?', area: 'Coping', short: 'Coping' },
];

const OPTIONS = [
  { value: 0, label: 'Very well / Rarely', emoji: '😊' },
  { value: 1, label: 'Okay sometimes', emoji: '🙂' },
  { value: 2, label: 'Somewhat difficult', emoji: '😟' },
  { value: 3, label: 'Very difficult', emoji: '😔' },
];

function levelFromScore(total, max) {
  const frac = total / max;
  if (frac <= 0.3) return 'Doing Well';
  if (frac <= 0.55) return 'Balanced';
  if (frac <= 0.8) return 'Needs Attention';
  return 'Stressed';
}

const LEVEL_META = {
  'Doing Well': {
    color: '#2e9e6b',
    summary:
      'Your check-in reflects a positive, steady balance. Keep up the healthy routines you have — small, consistent self-care keeps you resilient when busy weeks come.',
  },
  Balanced: {
    color: '#e8a23a',
    summary:
      'Your overall picture is fairly balanced, with a few areas that could use a little attention. Naming them now is a strong step toward feeling steadier.',
  },
  'Needs Attention': {
    color: '#e0643f',
    summary:
      'Your responses suggest a few areas are weighing on you. This is common during demanding seasons, and support is available. A counselor or a trusted adult can help you sort things out.',
  },
  Stressed: {
    color: '#d34d4d',
    summary:
      'Your check-in indicates significant strain right now. Please be gentle with yourself. Reaching out to a counselor, a trusted adult, or a mental health professional soon could make a real difference.',
  },
};

// Area-level guidance (non-diagnostic) matched by short area name.
const AREA_ACTIONS = {
  Work: 'Break large assignments into smaller tasks and schedule one at a time.',
  Sleep: 'Try a consistent sleep schedule and wind down without screens 30 minutes before bed.',
  Energy: 'Take short walks, hydrate regularly, and keep meals consistent.',
  Mood: 'Notice your moods without judgment and write them down in your journal.',
  Connection: 'Reach out to one friend, classmate, or family member this week.',
  Anxiety: 'Try the 5-4-3-2-1 grounding exercise or box breathing when worry spikes.',
  Motivation: 'Start with a tiny 5-minute task to build momentum, then keep going.',
  Workload: 'Use the Study Planner to spread tasks across the week instead of all at once.',
  Emotions: 'Give yourself grace. Gentle reflection and journaling can help you process feelings.',
  Coping: 'Prioritize rest and one small self-care activity each day.',
};

router.get('/questions', (req, res) => {
  res.json({ questions: QUESTIONS, options: OPTIONS, total: QUESTIONS.length });
});

router.post('/submit', authRequired, async (req, res) => {
  const answers = req.body?.answers;
  if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) {
    return res.status(400).json({ error: 'Please answer all questions' });
  }
  const values = QUESTIONS.map((q, i) => {
    const v = Number(answers[i]);
    if (!Number.isInteger(v) || v < 0 || v > 3) throw new Error('Invalid answer value');
    return { question: q.short, value: v };
  });
  const total = values.reduce((s, a) => s + a.value, 0);
  const maxScore = QUESTIONS.length * 3;
  const overall = levelFromScore(total, maxScore);
  const color = LEVEL_META[overall].color;
  const summary = LEVEL_META[overall].summary;

  // Areas that may need support: value >= 2
  const weakAreas = QUESTIONS.filter((q, i) => values[i].value >= 2).map((q) => q.short);
  const suggested = weakAreas.length
    ? weakAreas.map((a) => AREA_ACTIONS[a]).filter(Boolean)
    : ['Keep up your healthy routines', 'Reach out to a friend this week', 'Take one small self-care break each day'];
  const lowHighlight = QUESTIONS.filter((q, i) => values[i].value === 3).map((q) => q.short);

  const info = await db
    .prepare(
      'INSERT INTO wellness_assessments (user_id, answers, areas, overall_level, summary, suggested_actions) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      req.user.id,
      JSON.stringify(values),
      JSON.stringify({ areas: QUESTIONS.map((q) => q.short), weakAreas, lowHighlight, overall }),
      overall,
      summary,
      JSON.stringify(suggested)
    );

  // Auto-generate notifications for the student based on outcome
  if ((overall === 'Needs Attention' || overall === 'Stressed') && weakAreas.length) {
    const notif = db.prepare(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)'
    );
    await notif.run(
      req.user.id,
      'Your wellness check is ready',
      `Your check-in flagged ${weakAreas.join(', ')} as areas that may need support. You can view suggested actions and talk to a counselor any time.`,
      'reminder',
      '/app/wellness'
    );
  }

  const saved = await db.prepare('SELECT * FROM wellness_assessments WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({
    id: saved.id,
    score: total,
    maxScore,
    overall,
    color,
    summary,
    weakAreas,
    suggested,
    created_at: saved.created_at,
  });
});

router.get('/my', authRequired, async (req, res) => {
  const rows = await db
    .prepare('SELECT * FROM wellness_assessments WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({
    results: rows.map((r) => ({
      id: r.id,
      overall: r.overall_level,
      score: JSON.parse(r.answers || '[]').reduce((s, a) => s + a.value, 0),
      areas: JSON.parse(r.areas || '{}'),
      summary: r.summary,
      suggested: JSON.parse(r.suggested_actions || '[]'),
      created_at: r.created_at,
    })),
  });
});

// ---------- Mood records ----------
router.get('/moods', authRequired, async (req, res) => {
  const rows = await db
    .prepare('SELECT * FROM moods WHERE user_id = ? ORDER BY created_at DESC LIMIT 30')
    .all(req.user.id);
  res.json({ moods: rows });
});

router.post('/moods', authRequired, async (req, res) => {
  const { mood, note = '' } = req.body || {};
  const allowed = ['great', 'good', 'okay', 'stressed', 'low', 'overwhelmed'];
  if (!allowed.includes(mood)) return res.status(400).json({ error: 'Invalid mood' });
  const info = await db
    .prepare("INSERT INTO moods (user_id, mood, note) VALUES (?, ?, ?)")
    .run(req.user.id, mood, note);
  const row = await db.prepare('SELECT * FROM moods WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ mood: row });
});

// ---------- Recommendations (AI, supportive, non-diagnostic) ----------
const ACTIVITY_RECOMMENDATIONS = {
  'Academic stress': [
    { activity: 'Pomodoro Focus', emoji: '🍅', text: 'try using the Pomodoro timer to make study sessions feel lighter.' },
    { activity: 'Study Break Timer', emoji: '⏳', text: 'work in short blocks with breaks — your focus will thank you.' },
    { activity: 'Task Prioritizer', emoji: '🗂️', text: 'sort your assignments by priority so the important ones come first.' },
  ],
  Sleep: [
    { activity: 'Night Wind-Down', emoji: '🛏️', text: 'wind down with a calming pre-sleep routine tonight.' },
    { activity: 'Sleep Prep Checklist', emoji: '✅', text: 'run through the sleep prep checklist before bed.' },
  ],
  Energy: [
    { activity: 'Progressive Relaxation', emoji: '🪶', text: 'release tension with progressive relaxation when energy dips.' },
  ],
  Anxiety: [
    { activity: 'Breathe & Reset', emoji: '🌬️', text: 'reset your nervous system with the 4-7-8 breathing exercise.' },
    { activity: '5-4-3-2-1 Grounding', emoji: '🧭', text: 'ground yourself in the present with the 5-4-3-2-1 technique.' },
  ],
  'Social connection': [
    { activity: 'Gratitude Check', emoji: '✨', text: 'notice the good small things, and consider reaching out to a friend.' },
  ],
  Motivation: [
    { activity: 'Workload Planner', emoji: '📅', text: 'map your week with the workload planner to rebuild momentum.' },
    { activity: 'Journaling Prompts', emoji: '📓', text: 'start with a gentle journaling prompt to clear your head.' },
  ],
  Workload: [
    { activity: 'Workload Planner', emoji: '📅', text: 'spread your tasks across the week with the workload planner.' },
    { activity: 'Task Prioritizer', emoji: '🗂️', text: 'break down your workload into one small task at a time.' },
  ],
  'Emotional well-being': [
    { activity: 'Gentle Reflection', emoji: '🌙', text: 'take a few quiet minutes to name how you are feeling.' },
    { activity: 'Gratitude Check', emoji: '✨', text: 'try a gratitude check to gently shift your focus.' },
  ],
  Coping: [
    { activity: 'Breathe & Reset', emoji: '🌬️', text: 'a short breathing exercise can help you cope with the moment.' },
  ],
};

router.get('/recommendations', authRequired, async (req, res) => {
  const recent = await db
    .prepare('SELECT * FROM wellness_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 2')
    .all(req.user.id);
  const lines = [];

  if (recent.length) {
    const latest = recent[0];
    const areas = JSON.parse(latest.areas || '{}');
    const weak = areas.weakAreas || [];
    const seen = new Set();
    for (const area of weak) {
      const picks = ACTIVITY_RECOMMENDATIONS[area] || [];
      for (const p of picks) {
        if (!seen.has(p.activity)) {
          const acts = await db
            .prepare('SELECT title FROM self_care_activities WHERE title = ?')
            .get(p.activity);
          if (acts) {
            seen.add(p.activity);
            lines.push({
              emoji: p.emoji,
              activity: p.activity,
              reason: area,
              text: `You've mentioned ${area.toLowerCase()} recently — you may want to ${p.text}`,
            });
          }
        }
      }
      if (lines.length >= 3) break;
    }

    // Counselor suggestion for higher strain
    const high = latest.overall_level === 'Needs Attention' || latest.overall_level === 'Stressed';
    if (high) {
      lines.push({
        emoji: '🗓️',
        activity: 'Counselor check-in',
        reason: 'support',
        text: 'Your latest check-in flagged a few areas needing support — a short chat with a counselor could help you sort things out.',
      });
    }
  }

  // Journal-based suggestions
  const journalRows = await db
    .prepare("SELECT tags FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 5")
    .all(req.user.id);
  const schoolMentions = journalRows.filter((j) => {
    try { return JSON.parse(j.tags || '[]').includes('School'); } catch { return false; }
  }).length;
  if (schoolMentions >= 2) {
    lines.push({
      emoji: '📔',
      activity: 'Journaling reflection',
      reason: 'School',
      text: 'You mentioned school pressure several times this week. Would you like to explore ways to manage your workload?',
    });
  }

  res.json({ recommendations: lines.slice(0, 4) });
});

export default router;
export { QUESTIONS, OPTIONS };
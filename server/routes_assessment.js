import { Router } from 'express';
import db from './db.js';
import { authRequired } from './middleware.js';

const router = Router();

const QUESTIONS = [
  { id: 1, text: 'Over the past two weeks, how often have you felt down, depressed, or hopeless?', area: 'Mood' },
  { id: 2, text: 'How often have you had little interest or pleasure in doing things you usually enjoy?', area: 'Mood' },
  { id: 3, text: 'How often have you felt nervous, anxious, or on edge?', area: 'Anxiety' },
  { id: 4, text: 'How often have you had trouble relaxing or felt restless?', area: 'Anxiety' },
  { id: 5, text: 'How often have you felt tired or had little energy?', area: 'Energy' },
  { id: 6, text: 'How often have you had trouble concentrating on schoolwork or reading?', area: 'Energy' },
  { id: 7, text: 'How often have you had difficulty falling asleep or staying asleep?', area: 'Sleep' },
  { id: 8, text: 'How often have you lost appetite or overeaten these past two weeks?', area: 'Appetite' },
  { id: 9, text: 'How often have you felt that life is not worth living or that you feel overwhelmed?', area: 'Wellbeing' },
  { id: 10, text: 'How often have you found it hard to connect with family, friends, or classmates?', area: 'Wellbeing' },
];

const OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

function categorize(score) {
  const max = QUESTIONS.length * 3;
  if (score <= Math.floor(max * 0.3)) {
    return {
      category: 'Low',
      color: '#2e9e6b',
      summary:
        'Your responses indicate good overall well-being. Keep up healthy routines, stay active, and reach out to friends or guidance whenever you need support.',
    };
  }
  if (score <= Math.floor(max * 0.6)) {
    return {
      category: 'Moderate',
      color: '#e8a23a',
      summary:
        'Your responses suggest you may be experiencing some stress or difficulty lately. It is recommended to speak with a school guidance counselor or a trusted adult, and to book a check-in assessment.',
    };
  }
  return {
    category: 'High',
    color: '#d34d4d',
    summary:
      'Your responses indicate significant distress. Please reach out to a mental health professional or our Balanga Kalinga team as soon as possible. You are not alone - support is here for you.',
  };
}

router.get('/questions', (req, res) => {
  res.json({ questions: QUESTIONS, options: OPTIONS });
});

router.post('/submit', authRequired, (req, res) => {
  const answers = req.body?.answers;
  if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) {
    return res.status(400).json({ error: 'Please answer all questions' });
  }
  let score = 0;
  const normalized = QUESTIONS.map((q, i) => {
    const v = Number(answers[i]);
    if (!Number.isInteger(v) || v < 0 || v > 3) {
      throw new Error('Invalid answer value');
    }
    score += v;
    return { questionId: q.id, value: v };
  });

  const { category, color, summary } = categorize(score);
  const info = db
    .prepare('INSERT INTO assessments (user_id, total_score, category, summary, answers) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, score, category, summary, JSON.stringify(normalized));

  res.status(201).json({
    id: info.lastInsertRowid,
    score,
    category,
    color,
    summary,
    maxScore: QUESTIONS.length * 3,
  });
});

router.get('/my', authRequired, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ results: rows });
});

export default router;
export { QUESTIONS, OPTIONS, categorize };
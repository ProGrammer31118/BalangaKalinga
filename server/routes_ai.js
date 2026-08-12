import { Router } from 'express';
import { authRequired } from './middleware.js';

const router = Router();

const SAFETY_LINE =
  'If you are in crisis, please reach out to the National Center for Mental Health (NCMH) Crisis Hotline at 1553, or the Hopeline PH at 0917-558-4673. In an emergency, contact your school guidance office or call 911.';

const BOT_NAME = 'KaKalinga AI';

function respond(input) {
  const text = String(input || '').toLowerCase();

  const has = (...keywords) => keywords.some((k) => text.includes(k));

  if (has('suicide', 'kill myself', 'end my life', 'hurt myself', 'self harm', 'self-harm')) {
    return `I'm really glad you reached out. What you're feeling is heavy, and you do not have to carry it alone. ${SAFETY_LINE} Would you like me to connect you to a counselor session?`;
  }
  if (has('anxious', 'anxiety', 'panic', 'nervous', 'overwhelm', 'worried', 'stress')) {
    return `Feeling anxious is exhausting. Try this: breathe in slowly for 4 counts, hold for 4, and breathe out for 6. Repeat 5 times. ${BOT_NAME} also suggests booking a Kalinga check-in so a counselor can support you. Would you like to see your assessment schedule?`;
  }
  if (has('sad', 'down', 'depressed', 'hopeless', 'cry', 'lonely', 'empty', 'unhappy')) {
    return `I hear you. It's okay to feel sad - your feelings are valid. Please consider taking the wellness assessment or booking a session with our school counselor. ${SAFETY_LINE} Would you like me to walk you through the assessment?`;
  }
  if (has('sleep', 'insomnia', "can't sleep", 'tired', 'fatigue', 'energy')) {
    return `Sleep and energy matter a lot for your wellbeing. A few tips: keep a consistent sleep time, avoid gadgets 30 minutes before bed, and get morning sunlight. If this has lasted more than two weeks, a Kalinga counselor can help. Want me to list some wellness tips?`;
  }
  if (has('eat', 'appetite', 'food', 'hungry')) {
    return `Changes in appetite can be connected to stress. Small, regular meals and staying hydrated help. If you notice a big change, include it in your next assessment so we can check in on it.`;
  }
  if (has('study', 'homework', 'exam', 'test', 'grade', 'concentrate', 'focus', 'school', 'lesson', 'subject')) {
    return `School pressure is real. Try the Pomodoro technique: study for 25 minutes, then take a 5-minute break. Break big tasks into tiny steps and start with the easiest one. Would you like a simple study plan for your subject?`;
  }
  if (has('bully', 'bullying', 'bullied', 'harassed', 'teased')) {
    return `Nobody deserves to be bullied. Please report this to a trusted teacher, your guidance counselor, or the school office. You can also message the Kalinga team privately - we take this seriously and will help you.`;
  }
  if (has('friend', 'family', 'relationship', 'parents', 'conflict', 'argument')) {
    return `Relationship struggles can weigh on us. It helps to name what you're feeling, and to speak to someone you trust. A counselor can give you a safe space to sort things out. Would you like to book a session?`;
  }
  if (has('assessment', 'test', 'check', 'schedule', 'appointment', 'session', 'counsel', 'book')) {
    return `You can take the Wellness Self-Check in the Assessment tab anytime, and view or request an assessment schedule under "My Schedule". A Kalinga counselor will guide you through your results.`;
  }
  if (has('help', 'hi', 'hello', 'hey', 'kamusta', 'good morning', 'good afternoon', 'good evening')) {
    return `Hello! I'm ${BOT_NAME}, your AI wellness assistant from Balanga Kalinga. I can help you with the mental health assessment, your schedule, study tips, and coping strategies. How are you feeling today?`;
  }
  if (has('thank', 'salamat', 'thanks', 'appreciate')) {
    return `You're welcome! Remember, asking for help is a sign of strength. 💙 Is there anything else I can support you with?`;
  }
  if (has('who are you', 'what are you', 'kalinga', 'about')) {
    return `I'm ${BOT_NAME}, a demo AI wellness assistant for the Balanga Kalinga program. I provide supportive guidance, mental health information, and study help for students. Note: I am for guidance, not a replacement for professional care.`;
  }

  return `I'm here to support you. 💙 You can ask me about your feelings, stress, sleep, study habits, bullying, or your assessment schedule. For urgent concerns, I'll always point you to real human support: ${SAFETY_LINE}`;
}

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const hasOpenAI = Boolean(OPENAI_KEY);

const SYSTEM_PROMPT = `You are "KaKalinga AI", a caring, empathetic, and confidential AI wellness assistant for the Balanga Kalinga program in Balanga City, Philippines, built to support students.
Guidelines:
- Be warm, kind, and non-judgmental. Use simple language a Filipino student would understand.
- Offer practical coping tips, study support, and mental health guidance.
- Encourage students to take the in-app wellness assessment and to book a check-in session with a school counselor.
- If the user indicates crisis, distress, self-harm, or suicidal thoughts: respond with compassion and IMMEDIATELY share this crisis support line: "${SAFETY_LINE}". Encourage reaching out to a trusted adult or counselor.
- Keep responses to 3-6 sentences. Be concise but supportive.
- You are a supportive guide, NOT a replacement for professional care.
- Do not claim to be human; you are an AI assistant.`;

async function askOpenAI(messages) {
  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  ];
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({ model: OPENAI_MODEL, messages: apiMessages, max_tokens: 350 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not generate a response right now.';
}

router.post('/chat', authRequired, async (req, res) => {
  const messages = req.body?.messages;
  const last = Array.isArray(messages) ? messages[messages.length - 1] : null;
  const userMessage = last && last.role === 'user' ? last.content : '';

  if (!hasOpenAI) {
    return res.json({ reply: respond(userMessage), demo: true });
  }

  try {
    const reply = await askOpenAI(messages || []);
    res.json({ reply, demo: false, model: OPENAI_MODEL });
  } catch (err) {
    console.error('AI error:', err.message);
    res.json({ reply: respond(userMessage), demo: true, error: 'Falling back to offline assistant.' });
  }
});

// GET /status -> tells the frontend whether a real AI is configured
router.get('/status', authRequired, (req, res) => {
  res.json({ enabled: hasOpenAI, model: hasOpenAI ? OPENAI_MODEL : null, demoOnly: !hasOpenAI });
});

export default router;
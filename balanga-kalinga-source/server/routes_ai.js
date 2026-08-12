import { Router } from 'express';
import db from './db.js';
import { authRequired } from './middleware.js';

const router = Router();

const CRISIS_LINE =
  'If you feel you may be in immediate danger or unable to keep yourself safe, please seek immediate help from a trusted person, a qualified professional, or emergency services. You can call the NCMH Crisis Hotline at 1553, text Hopeline PH at 0917-558-4673, your school guidance office, or call 911.';
const BOT_NAME = 'Kalinga AI';
const DISCLAIMER = 'Kalinga AI provides supportive information and is not a replacement for a licensed mental health professional.';

const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'end it all', 'hurt myself', 'self harm', 'self-harm',
  'want to die', 'kms', 'better off dead', 'no reason to live', 'take my life', 'harm myself', 'selfharming',
  'dont want to live', 'don\'t want to live', 'hopeless', 'can\'t go on', 'give up on life', 'end it',
];

// Rich, structured empathy engine. Returns { text, risk, lowRisk } verdicts used for frontend safety UI.
function respond(input, userInfo = {}) {
  const text = String(input || '').toLowerCase();
  const name = userInfo.name ? userInfo.name.split(' ')[0] : 'there';
  const has = (...words) => words.some((w) => text.includes(w));

  // ---- High risk: prioritize human support immediately ----
  if (CRISIS_KEYWORDS.some((k) => text.includes(k))) {
    return {
      risk: 'high',
      text: `Thank you for telling me this, ${name}. What you are carrying is heavy, and you do not have to carry it alone. My role is to support you — but right now, the most caring next step is real human support. ${CRISIS_LINE} Please also reach out to someone you trust, your school guidance office, or the nearest hospital. I can help you grab the Get Help page if you like. I will stay right here with you. 💙`,
    };
  }

  // ---- Profanity / anger venting: normalize, de-escalate ----
  if (has('f*ck', 'shit', 'hate everything', 'so angry', 'pissed')) {
    return {
      risk: 'low',
      text: `It sounds like a lot is building up inside, and that anger is a signal — not a flaw. Let's try to release some of that pressure together. Inhale slowly for 4 counts, and exhale for 6, five times. Then, if you want, tell me what pushed you to this point.`,
    };
  }

  // ---- Deadline / project / exam stress (the brief's example) ----
  if (has('deadline', 'project', 'due', 'assignments', 'homework', 'exam', 'exams', 'test', 'midterm', 'finals', 'workload', 'overwhelmed with school')) {
    return {
      risk: 'moderate',
      text: `That sounds overwhelming, ${name} — especially with several deadlines happening at once. Let's break things down together. Which project or task is due first? Once you name it, we'll focus only on that first small step.`,
    };
  }

  // ---- Anxiety / panic / worry ----
  if (has('anxious', 'anxiety', 'panic', 'panic attack', 'nervous', 'worried', 'worry', 'racing heart', 'overthink', 'overthinking') && !has('stress a game')) {
    return {
      risk: 'moderate',
      text: `Feeling anxious is exhausting, ${name} — your mind is working so hard right now. Let's ground you in this moment. Look around and name 5 things you can see, then 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste. Then breathe in for your nose 4... hold... out 6. How is your body now?`,
    };
  }

  // ---- Sadness / loneliness / depression-ish ----
  if (has('sad', 'down', 'depressed', 'cry', 'crying', 'lonely', 'alone', 'empty', 'unhappy', 'worthless', 'numb') && !has('soccer')) {
    return {
      risk: 'moderate',
      text: `I hear you, ${name}, and I'm really glad you shared this with me. Feeling low or lonely is heavy, and it is not something to be fixed instantly — but you do not have to sit with it by yourself. Would you like to try a small grounding activity with me, or would it help more to talk about what has been weighing on you?`,
    };
  }

  // ---- Sleep / energy ----
  if (has('sleep', 'insomnia', "can't sleep", 'cannot sleep', 'tired', 'exhausted', 'fatigue', 'no energy', 'sleepy')) {
    return {
      risk: 'low',
      text: `Sleep and energy are the fuel your body and mind run on, ${name}. A few gentle tips: keep a consistent sleep time, put screens away 30 minutes before bed, and get a little morning sunlight. If this has lasted more than two weeks, it is worth mentioning to a counselor. Want me to walk you through the Night Wind-Down activity?`,
    };
  }

  // ---- Motivation / procrastination / focus ----
  if (has('motivat', 'procrastinat', 'focus', 'concentrate', 'distracted', 'can\'t focus', 'lazy', 'stuck')) {
    return {
      risk: 'low',
      text: `It is so easy to get stuck when a task feels big, ${name}. Here is a gentle trick: set a 5-minute timer and do just one tiny piece of the task. Five minutes is small enough to start. Often, starting is the hardest part — after that, momentum takes over. Want to try the Pomodoro timer together?`,
    };
  }

  // ---- Focus/study technique requests ----
  if (has('study', 'concentrate') && has('how', 'tip', 'technique', 'plan', 'help', 'better')) {
    return {
      risk: 'low',
      text: `Let's make studying feel lighter, ${name}. Try the Pomodoro technique: 25 minutes of focused work, then a 5-minute break. Break big topics into one page of notes first. And always start with the easiest task to build momentum. Would you like a mini study plan for one subject right now?`,
    };
  }

  // ---- Relationships/family ----
  if (has('friend', 'friendship', 'family', 'relationship', 'partner', 'boyfriend', 'girlfriend', 'parents', 'mom', 'dad', 'argument', 'fight with', 'conflict')) {
    return {
      risk: 'low',
      text: `Relationships matter so much to us, and they can also bring real stress, ${name}. It helps to name what you're feeling and to speak with someone you trust — including a counselor who can offer a non-judgmental space. Would you like to talk through what happened, or explore how to start that conversation?`,
    };
  }

  // ---- Money ----
  if (has('money', 'financ', 'bills', 'tuition', 'broke', 'poor')) {
    return {
      risk: 'low',
      text: `Financial worries can sit heavily in the background and drain your energy, ${name}. You do not have to figure it out alone. Many schools have financial aid and guidance offices — and talking to a counselor about the stress itself is completely valid too. What weighs on you most right now?`,
    };
  }

  // ---- Future / identity / "what will I do" ----
  if (has('future', 'career', 'what am i doing', 'lost', 'direction', 'purpose', 'not sure what')) {
    return {
      risk: 'low',
      text: `It is completely normal to feel unsure about the future, ${name}. Your academic and career counselors are literally trained to help with this exact feeling. Would you like to do a short exercise — say, writing down three things you enjoy and three strengths you have noticed in yourself?`,
    };
  }

  // ---- Counseling prep / help before session ----
  if (has('prepare', 'counselor session', 'before my session', 'what to say', 'nervous to talk', 'scared to talk', 'meet my counselor', 'help me prepare')) {
    return {
      risk: 'low',
      text: `Great step, ${name} — preparing can make a session feel so much easier. Try this: write down (1) what's been bothering you lately, (2) how it affects your day, and (3) what kind of support would feel helpful. You can bring those notes, or even read from them. Would you like to walk through each question now?`,
    };
  }

  // ---- Get help / crisis resources request ----
  if (has('get help', 'help now', 'emergency', 'crisis', 'hotline', 'safe now')) {
    return {
      risk: 'moderate',
      text: `Of course, ${name}. Your safety comes first. ${CRISIS_LINE} The Get Help page also has the school guidance office, hotline numbers, and trusted contact options saved. You can open it any time from the phone icon. Is there anything you want me to do to support you right now?`,
    };
  }

  // ---- Booking / counseling appointment ----
  if (has('counsel', 'appointment', 'book a session', 'schedule', 'guidance')) {
    return {
      risk: 'low',
      text: `You can request an appointment with a counselor under the Counseling tab any time — pick your counselor, choose a date and time, and it goes straight to them for approval. If it helps, I'd be happy to help you think about what you'd like to talk about first. Shall we?`,
    };
  }

  // ---- Assessment / wellness check ----
  if (has('wellness', 'assessment', 'check-in', 'check in', 'self-check', 'questionnaire')) {
    return {
      risk: 'low',
      text: `The Wellness Check is a gentle set of 10 questions that helps surface how you are doing — not a diagnosis, just a snapshot. It takes about two minutes. Afterward you get a personal wellness summary and suggested activities. Want to go do it now, or talk a little first?`,
    };
  }

  // ---- Suggested self-care ----
  if (has('self-care', 'self care', 'coping', 'activity', 'relax', 'tips', 'suggestion', 'what should i do')) {
    return {
      risk: 'low',
      text: `Small, kind actions add up, ${name}. You could try the Breathe & Reset exercise (4-7-8 breathing), the 5-4-3-2-1 grounding technique, a gratitude check, or a short Pomodoro study round. The Self-Care Center has all of these as guided activities. Which one sounds most doable right now?`,
    };
  }

  // ---- Gratitude / positivity ----
  if (has('thank', 'salamat', 'thanks', 'appreciate', 'helpful', 'that helps')) {
    return {
      risk: 'low',
      text: `You're so welcome, ${name}. Asking for support is a strength, and you showing up for yourself today is something to be proud of. I'm here whenever you need a listening ear. 💙`,
    };
  }

  // ---- Intro / who are you ----
  if (has('who are you', 'what are you', 'your name', 'introduce', 'about you', 'help me')) {
    return {
      risk: 'low',
      text: `Hello! I'm ${BOT_NAME}, an AI wellness companion from Balanga Kalinga. I'm here to listen, help you make sense of your feelings, suggest gentle coping activities, and connect you with counselors when human support would help most. I'm a supportive first point of contact — never a replacement for a licensed professional. ${DISCLAIMER}`,
    };
  }

  // ---- Greeting ----
  if (has('hi', 'hello', 'hey', 'kamusta', 'good morning', 'good afternoon', 'good evening', 'yo')) {
    return {
      risk: 'low',
      text: `Hi ${name}! 💙 I'm really glad you're here. How are you feeling right now? You can tell me anything — stress, deadlines, sleep, relationships, or just how your day has been. No judgment, just listening.`,
    };
  }

  // ---- Generic food/whatever fallback ----
  return {
    risk: 'low',
    text: `I'm here with you, ${name}. Tell me a little more about what's on your mind — is it school, your feelings, your relationships, or something else? Whatever it is, we can take it one small, kind step at a time. ${DISCLAIMER}`,
  };
}

// ---------- Live AI support (optional) ----------
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
// Works with any OpenAI-compatible API: OpenAI, Groq, OpenRouter, Ollama, LM Studio...
const OPENAI_BASE = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const hasOpenAI = Boolean(OPENAI_KEY);

const SYSTEM_PROMPT = `You are "Kalinga AI", a caring, empathetic, confidential AI wellness companion for Balanga Kalinga, supporting college students in the Philippines.
Rules:
- Be warm, kind, non-judgmental. Use simple, warm language.
- Offer practical coping tips, study support, and gentle follow-up questions.
- NEVER claim to diagnose mental illnesses, never claim to be a psychologist or doctor, never prescribe medication.
- State clearly you are an AI support tool when relevant.
- If the user signals immediate danger, self-harm, or suicidal thoughts: respond with deep compassion and IMMEDIATELY share crisis lines (NCMH 1553, Hopeline PH 0917-558-4673, or 911) and encourage reaching a trusted adult or professional. Keep responses short afterwards.
- For serious or persistent distress, gently encourage professional support and booking a counselor appointment.
- Keep responses to 4-6 sentences. Be concise.`;

router.post('/chat', authRequired, async (req, res) => {
  const { messages = [], conversation_id = null } = req.body || {};
  const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const last = messages[messages.length - 1];
  const userMessage = last && last.role === 'user' ? last.content : '';

  let convId = conversation_id;
  if (!convId) {
    const firstUser = messages.find((m) => m.role === 'user');
    const title = (firstUser?.content || 'Talk with Kalinga AI').slice(0, 40);
    const conv = await db.prepare('INSERT INTO ai_conversations (user_id, title) VALUES (?, ?)').run(req.user.id, title);
    convId = Number(conv.lastInsertRowid);
  }

  // Persist the user message
  const verdict = respond(userMessage, { name: userRow.name });
  if (userMessage) {
    await db.prepare('INSERT INTO ai_messages (conversation_id, role, content, risk) VALUES (?, ?, ?, ?)')
      .run(convId, 'user', userMessage, verdict.risk);
  }

  let reply = verdict.text;
  let usedOpenAI = false;
  let risk = verdict.risk;

  if (hasOpenAI && verdict.risk !== 'high') {
    try {
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      ];
      const openaiRes = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ model: OPENAI_MODEL, messages: apiMessages, max_tokens: 350 }),
      });
      if (openaiRes.ok) {
        const data = await openaiRes.json();
        reply = data.choices?.[0]?.message?.content?.trim() || reply;
        usedOpenAI = true;
      }
    } catch {
      // fall back to offline engine
    }
  }

  await db.prepare('INSERT INTO ai_messages (conversation_id, role, content, risk) VALUES (?, ?, ?, ?)')
    .run(convId, 'assistant', reply, 'low');

  res.json({ reply, risk, demo: !usedOpenAI, conversation_id: convId, disclaimer: DISCLAIMER });
});

router.get('/conversations', authRequired, async (req, res) => {
  const rows = await db
    .prepare('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20')
    .all(req.user.id);
  res.json({ conversations: rows });
});

router.get('/conversations/:id', authRequired, async (req, res) => {
  const conv = await db.prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const msgs = await db.prepare('SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY id').all(conv.id);
  res.json({ conversation: conv, messages: msgs });
});

router.delete('/conversations/:id', authRequired, async (req, res) => {
  await db.prepare('DELETE FROM ai_conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.get('/status', authRequired, (req, res) => {
  res.json({ enabled: hasOpenAI, model: hasOpenAI ? OPENAI_MODEL : null, demoOnly: !hasOpenAI });
});

export default router;
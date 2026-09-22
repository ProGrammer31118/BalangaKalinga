// Port of includes/ai_engine.php
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "qwen/qwen3.8-27b";
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

export const AI_MODEL = OPENAI_MODEL;
export const AI_LIVE = Boolean(OPENAI_API_KEY || GEMINI_API_KEY);

export function crisisCheck(text) {
  const low = (text || "").toLowerCase();
  const keywords = ["suicide","kill myself","end my life","end it all","hurt myself","self harm","self-harm","want to die","kms","better off dead","no reason to live","take my life","harm myself","dont want to live","don't want to live","hopeless","can't go on","give up on life"];
  return keywords.some((k) => low.includes(k));
}

export function offlineReply(text, name = "there") {
  const t = (text || "").toLowerCase();
  const first = (name || "there").trim().split(" ")[0] || "there";
  const has = (words) => words.some((w) => t.includes(w));
  const crisisLine = "If you feel you may be in immediate danger, please reach out right away to a trusted person, your school guidance office, or emergency services. You can call NCMH Crisis Hotline at 1553, Hopeline PH at 0917-558-4673, or call 911.";
  if (crisisCheck(text)) return [`Thank you for telling me this, ${first}. What you are carrying is heavy and you do not have to carry it alone. My role is to support you, but right now the kindest next step is real human support. ${crisisLine} Please reach out to someone you trust right away. I will stay here with you.`, "high"];
  if (has(["deadline","project","due","assignments","homework","exam","test","midterm","finals","workload","overwhelmed with school"])) return [`That sounds overwhelming, ${first}, especially with several things due at once. Let us break it down. Which task is due first? We can focus only on the first small step for five minutes.`, "moderate"];
  if (has(["anxious","anxiety","panic","nervous","worried","worry","racing heart","overthink"])) return [`Feeling anxious is exhausting, ${first}. Let us ground you for a moment. Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. Then breathe in for 4 counts and out for 6. How is your body now?`, "moderate"];
  if (has(["sad","down","depressed","cry","lonely","alone","empty","unhappy","worthless","numb"])) return [`I hear you, ${first}, and I am glad you shared this. Feeling low is heavy and does not need to be fixed instantly. You do not have to sit with it alone. Would you like to try a small grounding activity together, or talk more about what is weighing on you?`, "moderate"];
  if (has(["sleep","insomnia","can't sleep","cannot sleep","tired","exhausted","fatigue","no energy"])) return [`Sleep and energy are the fuel your body runs on, ${first}. Try keeping a consistent sleep time, putting screens away 30 minutes before bed, and getting a little morning light. If this lasts more than two weeks, it is worth mentioning to a counselor. Want to try the Night Wind-Down activity?`, "low"];
  if (has(["motivat","procrastinat","focus","concentrate","distracted","can't focus","lazy","stuck"])) return [`It is easy to get stuck when a task feels big, ${first}. Try setting a 5 minute timer and doing just one tiny piece. Often starting is the hardest part, then momentum helps. Want to try a Pomodoro round together?`, "low"];
  if (has(["friend","family","relationship","partner","boyfriend","girlfriend","parents","mom","dad","argument","conflict"])) return [`Relationships matter so much and can also bring real stress, ${first}. It helps to name what you feel and talk with someone you trust, including a counselor who can listen without judgment. Would you like to talk through what happened?`, "low"];
  if (has(["money","financ","bills","tuition","broke"])) return [`Financial worries can sit in the background and drain energy, ${first}. Many schools have guidance and financial aid offices that can help. Talking about the stress itself with a counselor is also valid. What weighs on you most right now?`, "low"];
  if (has(["future","career","lost","purpose","direction"])) return [`Feeling unsure about the future is very common, ${first}. Your academic and career counselors are trained for exactly this feeling. We could try a short exercise: list three things you enjoy and three strengths you have noticed in yourself.`, "low"];
  if (has(["get help","help now","emergency","crisis","hotline","safe now"])) return [`Of course, ${first}. Your safety comes first. ${crisisLine} Is there anything you want me to do to support you right now?`, "moderate"];
  if (has(["counsel","appointment","book a session","schedule","guidance"])) return [`You can request an appointment with a counselor in the Counseling tab. Pick a counselor, choose a date and time, and it goes to them for approval. If you want, I can help you think about what to say in your first meeting.`, "low"];
  if (has(["wellness","assessment","check-in","check in","questionnaire"])) return [`The Wellness Check is a gentle set of 10 questions that gives you a snapshot of how you are doing. It takes about two minutes and gives you a summary with suggested next steps. Want to try it now or talk a little first?`, "low"];
  if (has(["self-care","self care","coping","relax","tips","suggestion","what should i do"])) return [`Small kind actions add up, ${first}. You could try breathing slowly, a short grounding exercise, or a 5-minute walk. Which one sounds most doable right now?`, "low"];
  if (has(["thank","salamat","thanks","appreciate"])) return [`You are so welcome, ${first}. Reaching out is a strength, and showing up for yourself today matters. I am here whenever you need a listening ear.`, "low"];
  if (has(["who are you","what are you","your name","about you"])) return [`Hello! I am Kalinga AI, a wellness companion from Balanga Kalinga. I am here to listen, help you make sense of feelings, suggest gentle coping steps, and connect you with counselors when human support would help most. I am a supportive first point of contact, not a replacement for a licensed professional.`, "low"];
  if (has(["hi","hello","hey","kamusta","good morning","good afternoon","good evening"])) return [`Hi ${first}! I am really glad you are here. How are you feeling right now? You can tell me anything -- stress, deadlines, sleep, or just how your day has been. No judgment, just listening.`, "low"];
  return [`I am here with you, ${first}. Tell me a little more about what is on your mind -- is it school, your feelings, relationships, or something else? We can take it one small kind step at a time.`, "low"];
}

export async function liveReply(messages) {
  const systemPrompt = "You are Kalinga AI, a caring, empathetic AI wellness companion for Balanga Kalinga supporting college students in the Philippines.\nRules: Be warm, kind, non-judgmental. Use simple language. Offer practical coping tips and gentle follow-up questions.\nNEVER diagnose, never claim to be a doctor, never prescribe medication. Say you are an AI support tool when relevant.\nIf user signals danger or self-harm, respond with compassion and share crisis lines: NCMH 1553, Hopeline PH 0917-558-4673, 911, and encourage reaching a trusted adult or professional. Keep reply short.\nKeep replies to 4-6 sentences. Be concise. Add at the end: 'Note: I am an AI support companion, not a licensed professional.' if relevant.";
  if (OPENAI_API_KEY) {
    try {
      const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: OPENAI_MODEL, messages: [{ role: "system", content: systemPrompt }, ...messages], max_tokens: 350, temperature: 0.7 }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = (data?.choices?.[0]?.message?.content || "").trim();
        if (text) return text;
      }
    } catch (e) { console.error("[Kalinga AI] live error:", e?.message); }
  }
  if (GEMINI_API_KEY) {
    try {
      const contents = [];
      for (const m of messages) {
        const role = m.role === "assistant" ? "model" : "user";
        const txt = (m.content || "").trim();
        if (!txt) continue;
        if (contents.length && contents[contents.length - 1].role === role) contents[contents.length - 1].parts[0].text += "\n" + txt;
        else contents.push({ role, parts: [{ text: txt }] });
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 350 } }),
      });
      if (res.ok) {
        const data = await res.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const txt = parts.map((p) => p.text || "").join("").trim();
        if (txt) return txt;
      }
    } catch (e) { console.error("[Kalinga AI] gemini error:", e?.message); }
  }
  return null;
}

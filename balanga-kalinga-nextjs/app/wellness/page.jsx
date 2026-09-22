// Port of wellness.php
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "../../lib/db";
import { requireStudent } from "../../lib/auth";

const QUESTIONS = [
  { text: "How stressed do you feel about academic deadlines and workload right now?", area: "Work" },
  { text: "In the last week, how has your sleep been?", area: "Sleep" },
  { text: "How is your energy level most days?", area: "Energy" },
  { text: "How would you describe your overall mood lately?", area: "Mood" },
  { text: "How connected do you feel to friends, family, or classmates?", area: "Connection" },
  { text: "How often do you feel anxious, nervous, or on edge?", area: "Anxiety" },
  { text: "How is your motivation for schoolwork and daily tasks?", area: "Motivation" },
  { text: "How heavy does your current workload feel?", area: "Workload" },
  { text: "How is your emotional well-being (hopeful vs down) lately?", area: "Emotions" },
  { text: "How well do you feel you are coping with everything right now?", area: "Coping" },
];
const OPTIONS = [
  { value: 0, label: "Very well / Rarely" },
  { value: 1, label: "Okay sometimes" },
  { value: 2, label: "Somewhat difficult" },
  { value: 3, label: "Very difficult" },
];
const AREA_ACTIONS = {
  Work: "Break large assignments into smaller tasks and schedule one at a time.",
  Sleep: "Try a consistent sleep schedule and wind down without screens 30 minutes before bed.",
  Energy: "Take short walks, hydrate regularly, and keep meals consistent.",
  Mood: "Notice your moods without judgment and talk with someone you trust.",
  Connection: "Reach out to one friend, classmate, or family member this week.",
  Anxiety: "Try the grounding exercise or box breathing when worry spikes.",
  Motivation: "Start with a tiny 5-minute task to build momentum.",
  Workload: "Use the workload planner to spread tasks across the week.",
  Emotions: "Give yourself grace and consider talking to a counselor.",
  Coping: "Prioritize rest and reach out for support when needed.",
};

function badgeClass(level) {
  if (level === "Doing Well") return "badge-green";
  if (level === "Balanced") return "badge-yellow";
  if (level === "Needs Attention") return "badge-orange";
  return "badge-red";
}

export default async function WellnessPage({ searchParams }) {
  const user = await requireStudent();

  async function submitCheck(formData) {
    "use server";
    const { query: q } = await import("../../lib/db");
    const { getSessionUserId } = await import("../../lib/auth");
    const { redirect: red } = await import("next/navigation");
    const uid = getSessionUserId();
    if (!uid) red("/login");
    const answers = [];
    for (let i = 0; i < QUESTIONS.length; i++) {
      const v = formData.get(`answers_${i}`);
      if (v === null) red("/wellness?error=" + encodeURIComponent("Please answer all questions."));
      answers.push(Math.min(3, Math.max(0, parseInt(v, 10) || 0)));
    }
    const values = answers.map((val, i) => ({ question: QUESTIONS[i].area, value: val }));
    const total = answers.reduce((a, b) => a + b, 0);
    const max = QUESTIONS.length * 3;
    const frac = total / max;
    let overall = "Stressed";
    if (frac <= 0.3) overall = "Doing Well";
    else if (frac <= 0.55) overall = "Balanced";
    else if (frac <= 0.8) overall = "Needs Attention";
    const summaries = {
      "Doing Well": "Your check-in reflects a steady, positive balance. Keep up the healthy routines you have.",
      Balanced: "Your picture is fairly balanced, with a few areas that could use a little attention.",
      "Needs Attention": "Your responses suggest a few areas are weighing on you. This is common during demanding seasons, and support is available.",
      Stressed: "Your check-in indicates significant strain right now. Please be gentle with yourself and consider reaching out to a counselor soon.",
    };
    const weak = QUESTIONS.filter((_, i) => answers[i] >= 2).map((q) => q.area);
    const suggested = weak.length
      ? [...new Set(weak.map((a) => AREA_ACTIONS[a]).filter(Boolean))]
      : ["Keep up healthy routines", "Reach out to a friend this week", "Take one small self-care break each day"];
    await q("INSERT INTO wellness_assessments (user_id,answers,overall_level,summary,suggested_actions) VALUES (?,?,?,?,?)",
      [uid, JSON.stringify(values), overall, summaries[overall], JSON.stringify(suggested)]);
    const { revalidatePath: rev } = await import("next/cache");
    rev("/wellness");
    red("/wellness?result=" + encodeURIComponent(JSON.stringify({ overall, total, max, summary: summaries[overall], weak, suggested })));
  }

  const history = await query("SELECT * FROM wellness_assessments WHERE user_id=? ORDER BY created_at DESC LIMIT 10", [user.id]);
  let result = null;
  try { if (searchParams?.result) result = JSON.parse(searchParams.result); } catch {}

  return (
    <>
      <h1>Wellness Check</h1>
      <p className="muted">10 gentle questions, about 2 minutes. This is not a diagnosis, just a snapshot to help you notice patterns.</p>
      {searchParams?.error && <div className="notice notice-error" style={{ marginTop: 10 }}>{searchParams.error}</div>}
      {(searchParams?.saved || result) && <div className="notice notice-success" style={{ marginTop: 10 }}>Wellness check saved.</div>}
      {result && (
        <div className="card" style={{ marginTop: 16, borderColor: "#c7d7f7", background: "#eef4ff" }}>
          <h2>Your result: <span className={`badge ${badgeClass(result.overall)}`}>{result.overall}</span> ({result.total}/{result.max})</h2>
          <p style={{ marginTop: 8 }}>{result.summary}</p>
          {result.weak?.length > 0 && <p className="muted" style={{ marginTop: 8 }}>Areas that may need support: <strong>{result.weak.join(", ")}</strong></p>}
          <div style={{ marginTop: 10 }}><strong style={{ fontSize: 14 }}>Suggested next steps:</strong>
            <ul style={{ marginLeft: 18, fontSize: 14, marginTop: 6 }}>{result.suggested.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        </div>
      )}
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Answer each question honestly</h2>
          <form action={submitCheck}>
            {QUESTIONS.map((q, i) => (
              <div key={i} style={{ marginBottom: 14, padding: 12, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fcfcfd" }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{i + 1}. {q.text} <span className="muted" style={{ fontWeight: 400 }}>({q.area})</span></div>
                <div className="option-group">
                  {OPTIONS.map((opt) => (
                    <label key={opt.value}><input type="radio" name={`answers_${i}`} value={opt.value} required /> {opt.label}</label>
                  ))}
                </div>
              </div>
            ))}
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Submit check-in</button>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Your answers are private and used only to give you supportive feedback.</p>
          </form>
        </div>
        <div>
          <div className="card">
            <h2>Your history</h2>
            {history.length ? (
              <table><tbody>
                <tr><th>Date</th><th>Result</th><th>Score</th></tr>
                {history.map((r) => {
                  let score = 0;
                  try { score = (JSON.parse(r.answers) || []).reduce((a, x) => a + (x.value || 0), 0); } catch {}
                  return (
                    <tr key={r.id}>
                      <td>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td><span className={`badge ${badgeClass(r.overall_level)}`}>{r.overall_level}</span></td>
                      <td>{score}/30</td>
                    </tr>
                  );
                })}
              </tbody></table>
            ) : <p className="muted">No history yet. Take your first check-in on the left.</p>}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h3>What happens after?</h3>
            <p className="muted">You will see areas that may need support and simple actions like breathing exercises, study planners, or reaching out to a counselor. You can also talk to Kalinga AI any time.</p>
            <div style={{ marginTop: 10 }}><a href="/ai-chat" className="btn btn-secondary btn-small">Talk to Kalinga AI</a></div>
          </div>
        </div>
      </div>
    </>
  );
}

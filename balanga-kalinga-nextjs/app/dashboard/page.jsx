// Port of dashboard.php
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, timeAgo } from "../../lib/db";
import { requireStudent } from "../../lib/auth";

function badgeClass(level) {
  if (level === "Doing Well") return "badge-green";
  if (level === "Balanced") return "badge-yellow";
  if (level === "Needs Attention") return "badge-orange";
  return "badge-red";
}

export default async function DashboardPage({ searchParams }) {
  const user = await requireStudent();
  const uid = user.id;

  async function saveMood(formData) {
    "use server";
    const { query: q } = await import("../../lib/db");
    const { getSessionUserId } = await import("../../lib/auth");
    const id = getSessionUserId();
    if (!id) redirect("/login");
    const mood = (formData.get("mood") || "").toString();
    const note = (formData.get("note") || "").toString().trim();
    const allowed = ["great", "good", "okay", "stressed", "low", "overwhelmed"];
    if (allowed.includes(mood)) {
      await q("INSERT INTO moods (user_id, mood, note) VALUES (?,?,?)", [id, mood, note]);
    }
    revalidatePath("/dashboard");
    redirect("/dashboard?saved=1");
  }

  const recentMoods = await query("SELECT * FROM moods WHERE user_id = ? ORDER BY created_at DESC LIMIT 5", [uid]);
  const latestRows = await query("SELECT * FROM wellness_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", [uid]);
  const latest = latestRows[0] || null;
  const appts = await query("SELECT a.*, c.name as counselor_name FROM appointments a JOIN counselors c ON c.id=a.counselor_id WHERE a.user_id=? ORDER BY a.requested_date DESC LIMIT 3", [uid]);
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <h1>Hi, {firstName}</h1>
      <p className="muted">Here is a quick view of how you are doing. Small steps matter.</p>
      {searchParams?.saved && <div className="notice notice-success" style={{ marginTop: 10 }}>Mood saved. Thank you for checking in.</div>}
      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <div className="card stat">
          <div className="label">Latest wellness</div>
          <div className="value" style={{ fontSize: 16, marginTop: 6 }}>
            {latest ? (
              <>
                <span className={`badge ${badgeClass(latest.overall_level)}`}>{latest.overall_level}</span>
                <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>{latest.summary}</div>
              </>
            ) : (
              <><span className="muted">No check-in yet</span><br /><a href="/wellness" className="btn btn-secondary btn-small" style={{ marginTop: 8 }}>Take wellness check</a></>
            )}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Recent mood</div>
          <div className="value" style={{ fontSize: 15, marginTop: 6 }}>
            {recentMoods.length ? recentMoods.slice(0, 3).map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid #f2f4f7" }}>
                <span>{m.mood}</span><span className="muted">{timeAgo(m.created_at)}</span>
              </div>
            )) : <span className="muted" style={{ fontSize: 13 }}>No moods yet. Add one below.</span>}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Next appointment</div>
          <div className="value" style={{ fontSize: 13, marginTop: 6 }}>
            {appts.length ? (
              <><strong>{appts[0].counselor_name}</strong><br /><span className="muted">{String(appts[0].requested_date).slice(0, 10)} at {appts[0].requested_time} - {appts[0].status}</span></>
            ) : (
              <><span className="muted">No appointments yet.</span><br /><a href="/counseling" className="btn btn-secondary btn-small" style={{ marginTop: 8 }}>Book now</a></>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>How are you feeling right now?</h2>
          <form action={saveMood}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {["great", "good", "okay", "stressed", "low", "overwhelmed"].map((opt) => (
                <button key={opt} type="submit" name="mood" value={opt} className="btn btn-secondary btn-small">{opt.charAt(0).toUpperCase() + opt.slice(1)}</button>
              ))}
            </div>
            <div className="form-group"><input type="text" name="note" placeholder="Optional note - what is on your mind?" /></div>
            <p className="muted" style={{ fontSize: 12 }}>Pick a mood and optionally add a short note. You can see trends in your wellness history.</p>
          </form>
        </div>
        <div className="card">
          <h2>Quick actions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a href="/wellness" className="btn btn-primary">Take wellness check (2 min)</a>
            <a href="/ai-chat" className="btn btn-secondary">Talk to Kalinga AI</a>
            <a href="/counseling" className="btn btn-secondary">Book counseling</a>
          </div>
        </div>
      </div>
    </>
  );
}

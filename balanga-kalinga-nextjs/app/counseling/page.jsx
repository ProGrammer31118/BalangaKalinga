// Port of counseling.php
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "../../lib/db";
import { requireStudent } from "../../lib/auth";

function statusBadge(status) {
  if (status === "approved") return "badge-green";
  if (status === "pending") return "badge-yellow";
  if (status === "cancelled") return "badge-red";
  return "badge-blue";
}

export default async function CounselingPage({ searchParams }) {
  const user = await requireStudent();

  async function bookAction(formData) {
    "use server";
    const { query: q } = await import("../../lib/db");
    const { getSessionUserId } = await import("../../lib/auth");
    const { redirect: red } = await import("next/navigation");
    const uid = getSessionUserId();
    if (!uid) red("/login");
    const counselor_id = Number(formData.get("counselor_id"));
    const date = (formData.get("requested_date") || "").toString();
    const time = (formData.get("requested_time") || "").toString();
    const method = (formData.get("method") || "In-person").toString();
    const notes = (formData.get("notes") || "").toString().trim();
    if (!counselor_id || !date || !time) red("/counseling?error=" + encodeURIComponent("Please fill in date and time."));
    await q("INSERT INTO appointments (user_id,counselor_id,requested_date,requested_time,method,notes,status) VALUES (?,?,?,?,?,?,?)",
      [uid, counselor_id, date, time, method, notes, "pending"]);
    const { revalidatePath: rev } = await import("next/cache");
    rev("/counseling");
    red("/counseling?saved=1");
  }

  if (searchParams?.cancel) {
    await query("UPDATE appointments SET status='cancelled' WHERE id=? AND user_id=?", [Number(searchParams.cancel), user.id]);
    revalidatePath("/counseling");
    redirect("/counseling?saved=1");
  }

  const counselors = await query("SELECT * FROM counselors WHERE is_available=1");
  const appointments = await query("SELECT a.*, c.name as counselor_name, c.specialization FROM appointments a JOIN counselors c ON c.id=a.counselor_id WHERE a.user_id=? ORDER BY a.created_at DESC", [user.id]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1>Counseling</h1>
      <p className="muted">Request a time with a counselor. They will confirm your appointment. Your notes are private between you and the counselor.</p>
      {searchParams?.error && <div className="notice notice-error" style={{ marginTop: 10 }}>{searchParams.error}</div>}
      {searchParams?.saved && <div className="notice notice-success" style={{ marginTop: 10 }}>Appointment updated.</div>}
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div>
          <h2>Available counselors</h2>
          {counselors.map((c) => (
            <div key={c.id} className="card" style={{ marginBottom: 12 }}>
              <h3>{c.name}</h3>
              <div className="badge badge-blue" style={{ fontSize: 11 }}>{c.specialization}</div>
              <p className="muted" style={{ marginTop: 6 }}>{c.description}</p>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Schedule: {c.schedule}</p>
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#2b5ea6" }}>Request appointment with {c.name.split(" ")[0]}</summary>
                <form action={bookAction} style={{ marginTop: 10 }}>
                  <input type="hidden" name="counselor_id" value={c.id} />
                  <div className="form-row">
                    <div className="form-group"><label>Date</label><input type="date" name="requested_date" required min={today} /></div>
                    <div className="form-group"><label>Time</label><input type="time" name="requested_time" required /></div>
                  </div>
                  <div className="form-group"><label>Method</label><select name="method" defaultValue="In-person"><option>In-person</option><option>Video call</option><option>Phone</option></select></div>
                  <div className="form-group"><label>Notes (optional)</label><textarea name="notes" placeholder="What would you like to talk about?" /></div>
                  <button type="submit" className="btn btn-primary btn-small">Request appointment</button>
                </form>
              </details>
            </div>
          ))}
        </div>
        <div>
          <div className="card">
            <h2>Your appointments</h2>
            {appointments.length ? appointments.map((a) => (
              <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid #eef2f7" }}>
                <strong style={{ fontSize: 14 }}>{a.counselor_name}</strong> <span className="muted" style={{ fontSize: 12 }}>- {a.specialization}</span><br />
                <span style={{ fontSize: 13 }}>{String(a.requested_date).slice(0, 10)} at {a.requested_time} - {a.method}</span>
                <span className={`badge ${statusBadge(a.status)}`} style={{ marginLeft: 6, fontSize: 11 }}>{a.status}</span>
                {a.notes && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{a.notes}</p>}
                {a.status === "pending" && <div style={{ marginTop: 6 }}><a href={`/counseling?cancel=${a.id}`} onClick={(e) => undefined} style={{ fontSize: 12, color: "#b42318" }}>Cancel request</a></div>}
              </div>
            )) : <p className="muted">No appointments yet. Request one on the left.</p>}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h3>What to expect</h3>
            <ul style={{ marginLeft: 18, fontSize: 13, color: "#475467", lineHeight: 1.8 }}>
              <li>Counselor reviews your request (usually within a day)</li>
              <li>You will see the status update to approved</li>
              <li>Meet at the agreed time and place</li>
              <li>You can cancel a pending request any time</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

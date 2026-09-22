// Port of admin.php (dark staff theme, aggregated trends only — never AI chats)
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "../../lib/db";
import { requireAdmin } from "../../lib/auth";

export default async function AdminPage({ searchParams }) {
  const user = await requireAdmin();

  if (searchParams?.approve) {
    await query("UPDATE appointments SET status='approved' WHERE id=?", [Number(searchParams.approve)]);
    revalidatePath("/admin");
    redirect("/admin?saved=Appointment approved.");
  }
  if (searchParams?.decline) {
    await query("UPDATE appointments SET status='declined' WHERE id=?", [Number(searchParams.decline)]);
    revalidatePath("/admin");
    redirect("/admin?saved=Appointment declined.");
  }
  if (searchParams?.toggle_counselor) {
    await query("UPDATE counselors SET is_available = 1 - is_available WHERE id=?", [Number(searchParams.toggle_counselor)]);
    revalidatePath("/admin");
    redirect("/admin");
  }
  if (searchParams?.delete_user) {
    const delId = Number(searchParams.delete_user);
    if (delId !== user.id) await query("DELETE FROM users WHERE id=? AND role='student'", [delId]);
    revalidatePath("/admin");
    redirect("/admin");
  }

  const usersCount = (await query("SELECT COUNT(*) as c FROM users WHERE role='student'"))[0].c;
  const assessmentsCount = (await query("SELECT COUNT(*) as c FROM wellness_assessments"))[0].c;
  const pendingCount = (await query("SELECT COUNT(*) as c FROM appointments WHERE status='pending'"))[0].c;
  const totalAppts = (await query("SELECT COUNT(*) as c FROM appointments"))[0].c;
  const counselorsAvail = (await query("SELECT COUNT(*) as c FROM counselors WHERE is_available=1"))[0].c;
  const appointments = await query("SELECT a.*, u.name as student_name, u.email, c.name as counselor_name FROM appointments a JOIN users u ON u.id=a.user_id JOIN counselors c ON c.id=a.counselor_id ORDER BY a.created_at DESC LIMIT 20");
  const counselors = await query("SELECT * FROM counselors");
  const levels = await query("SELECT overall_level, COUNT(*) as c FROM wellness_assessments GROUP BY overall_level");
  const moods = await query("SELECT mood, COUNT(*) as c FROM moods GROUP BY mood");
  const students = await query("SELECT id,name,email,student_id,course,year_level,created_at FROM users WHERE role='student' ORDER BY created_at DESC LIMIT 20");

  return (
    <>
      <h1 style={{ fontSize: 22 }}>Admin Dashboard</h1>
      <p className="muted">Separate staff area. Student AI chats are never shown here - only aggregated trends.</p>
      {searchParams?.saved && <div className="notice notice-success" style={{ marginTop: 10 }}>{searchParams.saved}</div>}
      <div className="grid grid-3" style={{ marginTop: 14 }}>
        <div className="card stat" style={{ background: "#0f1f3a", color: "#fff", borderColor: "#0f1f3a" }}>
          <div className="label" style={{ color: "#b0bdd4" }}>Students</div>
          <div className="value" style={{ color: "#fff" }}>{Number(usersCount)}</div>
          <div className="muted" style={{ color: "#b0bdd4", fontSize: 12 }}>Registered accounts</div>
        </div>
        <div className="card stat"><div className="label">Pending appointments</div><div className="value">{Number(pendingCount)} / {Number(totalAppts)}</div><div className="muted" style={{ fontSize: 12 }}>Needs review</div></div>
        <div className="card stat"><div className="label">Available counselors</div><div className="value">{Number(counselorsAvail)}</div><div className="muted" style={{ fontSize: 12 }}>On duty</div></div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <div className="card stat"><div className="label">Wellness checks total</div><div className="value" style={{ fontSize: 18 }}>{Number(assessmentsCount)}</div></div>
        <div className="card" style={{ background: "#eef4ff", borderColor: "#c7d7f7" }}><strong style={{ fontSize: 13 }}>Staff note</strong><p className="muted" style={{ fontSize: 12, marginTop: 4 }}>This dashboard is separate from the student experience. Students use the light theme; staff use this dark administration theme.</p></div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <h2>Wellness levels (aggregated)</h2>
          {levels.length ? levels.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f2f4f7", fontSize: 13 }}>
              <span>{l.overall_level}</span><strong>{Number(l.c)}</strong>
            </div>
          )) : <p className="muted">No data yet.</p>}
          <h2 style={{ marginTop: 14 }}>Mood counts</h2>
          {moods.length ? moods.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f2f4f7", fontSize: 13 }}>
              <span>{m.mood}</span><strong>{Number(m.c)}</strong>
            </div>
          )) : <p className="muted">No moods yet.</p>}
        </div>
        <div className="card" id="counselors">
          <h2>Counselors</h2>
          {counselors.map((c) => (
            <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid #f2f4f7", display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div><strong style={{ fontSize: 13 }}>{c.name}</strong><br /><span className="muted" style={{ fontSize: 12 }}>{c.specialization} - {c.is_available ? "Available" : "Unavailable"}</span></div>
              <a href={`/admin?toggle_counselor=${c.id}`} className="btn btn-secondary btn-small" style={{ height: "fit-content" }}>{c.is_available ? "Set unavailable" : "Set available"}</a>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 14 }} id="appointments">
        <h2>Appointments (latest 20)</h2>
        {appointments.length ? (
          <div style={{ overflowX: "auto" }}>
            <table><tbody>
              <tr><th>Student</th><th>Counselor</th><th>Date / Time</th><th>Method</th><th>Status</th><th>Action</th></tr>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.student_name}<br /><span className="muted" style={{ fontSize: 12 }}>{a.email}</span></td>
                  <td>{a.counselor_name}</td>
                  <td>{String(a.requested_date).slice(0, 10)} {a.requested_time}</td>
                  <td>{a.method}</td>
                  <td><span className={`badge ${a.status === "approved" ? "badge-green" : a.status === "pending" ? "badge-yellow" : "badge-red"}`}>{a.status}</span></td>
                  <td>{a.status === "pending" ? (<><a href={`/admin?approve=${a.id}`} className="btn btn-primary btn-small">Approve</a> <a href={`/admin?decline=${a.id}`} className="btn btn-secondary btn-small">Decline</a></>) : <span className="muted" style={{ fontSize: 12 }}>No action</span>}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        ) : <p className="muted">No appointments yet.</p>}
      </div>
      <div className="card" style={{ marginTop: 14 }} id="students">
        <h2>Students (latest 20)</h2>
        <div style={{ overflowX: "auto" }}>
          <table><tbody>
            <tr><th>Name</th><th>Email</th><th>ID</th><th>Course</th><th>Joined</th><th></th></tr>
            {students.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.student_id}</td><td>{u.course}</td>
                <td>{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                <td><a href={`/admin?delete_user=${u.id}`} onClick={(e) => undefined} style={{ fontSize: 12, color: "#b42318" }}>Remove</a></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>Admin area - separate login via /admin-login. Student login at /login.</p>
    </>
  );
}

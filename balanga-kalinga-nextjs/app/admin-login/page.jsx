// Port of admin-login.php (separate dark staff theme)
import { redirect } from "next/navigation";
import { query } from "../../lib/db";
import { currentUser, setSessionCookie, verifyPassword } from "../../lib/auth";

export default async function AdminLoginPage({ searchParams }) {
  const me = await currentUser().catch(() => null);
  if (me) redirect(me.role === "admin" ? "/admin" : "/dashboard");
  const error = searchParams?.error || null;

  async function staffLogin(formData) {
    "use server";
    const login = (formData.get("login") || "").toString().trim();
    const password = (formData.get("password") || "").toString();
    if (!login || !password) redirect("/admin-login?error=" + encodeURIComponent("Please fill in all fields."));
    const rows = await query("SELECT * FROM users WHERE email = ? OR student_id = ? LIMIT 1", [login, login]);
    const u = rows[0];
    if (!u || !(await verifyPassword(password, u.password_hash))) redirect("/admin-login?error=" + encodeURIComponent("Invalid credentials."));
    if (u.role !== "admin") redirect("/admin-login?error=" + encodeURIComponent("This login is for staff only. Please use the student login."));
    await setSessionCookie(u.id);
    redirect("/admin");
  }

  return (
    <div style={{ maxWidth: 460, margin: "40px auto", padding: "0 20px" }}>
      <div className="card" style={{ padding: 28, borderRadius: 14 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div className="badge" style={{ background: "#0f1f3a", color: "#fff", fontWeight: 700, letterSpacing: 0.6, padding: "4px 10px", borderRadius: 20 }}>STAFF ONLY</div>
          <h1 style={{ fontSize: 22, color: "#0f1f3a", margin: "10px 0 0" }}>Administration</h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Balanga Kalinga - Staff access. For counselors and administrators.</p>
        </div>
        {error && <div className="notice notice-error">{error}</div>}
        <form action={staffLogin}>
          <div className="form-group"><label>Staff email or ID</label><input type="text" name="login" required placeholder="admin@kalinga.edu.ph" /></div>
          <div className="form-group"><label>Password</label><input type="password" name="password" required placeholder="Your staff password" /></div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", background: "#0f1f3a", borderColor: "#0f1f3a" }}>Sign in to dashboard</button>
        </form>
        <div className="notice notice-info" style={{ marginTop: 14, fontSize: 12 }}>Demo admin: admin@kalinga.edu.ph / admin123<br />Demo counselor: counselor@balanga.edu.ph / admin123</div>
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 13 }}><a href="/login">Student login</a> &middot; <a href="/">Back to home</a></p>
      </div>
      <p className="muted" style={{ textAlign: "center", marginTop: 12, fontSize: 12 }}>Separate form for staff. Student accounts cannot access admin tools. AI chats are never visible to staff.</p>
    </div>
  );
}

// Port of login.php (student login)
import { redirect } from "next/navigation";
import { query } from "../../lib/db";
import { currentUser, setSessionCookie, verifyPassword } from "../../lib/auth";

export default async function LoginPage({ searchParams }) {
  const me = await currentUser().catch(() => null);
  if (me) redirect(me.role === "admin" ? "/admin" : "/dashboard");
  const error = searchParams?.error || null;

  async function loginAction(formData) {
    "use server";
    const login = (formData.get("login") || "").toString().trim();
    const password = (formData.get("password") || "").toString();
    if (!login || !password) redirect("/login?error=" + encodeURIComponent("Please fill in all fields."));
    const rows = await query("SELECT * FROM users WHERE email = ? OR student_id = ? LIMIT 1", [login, login]);
    const u = rows[0];
    if (!u || !(await verifyPassword(password, u.password_hash))) {
      redirect("/login?error=" + encodeURIComponent("Invalid email or student ID, or password."));
    }
    if (u.role === "admin") {
      redirect("/login?error=" + encodeURIComponent("Staff accounts must use the staff login."));
    }
    await setSessionCookie(u.id);
    redirect("/dashboard");
  }

  return (
    <div style={{ maxWidth: 480, margin: "30px auto" }}>
      <div className="card">
        <h1 style={{ fontSize: 22 }}>Student login</h1>
        <p className="muted">Login with your email or student ID.</p>
        {error && <div className="notice notice-error">{error}</div>}
        <form action={loginAction} style={{ marginTop: 16 }}>
          <div className="form-group"><label>Email or Student ID</label><input type="text" name="login" required placeholder="alex@balanga.edu.ph or 2025-10422" /></div>
          <div className="form-group"><label>Password</label><input type="password" name="password" required placeholder="Your password" /></div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Login</button>
        </form>
        <p className="muted" style={{ marginTop: 14, textAlign: "center" }}>No account? <a href="/register">Create one</a></p>
        <p className="muted" style={{ marginTop: 8, textAlign: "center", fontSize: 13 }}>Staff? <a href="/admin-login">Admin login</a></p>
        <div className="notice notice-info" style={{ marginTop: 14, fontSize: 13 }}>Demo student: alex@balanga.edu.ph / student123</div>
      </div>
    </div>
  );
}

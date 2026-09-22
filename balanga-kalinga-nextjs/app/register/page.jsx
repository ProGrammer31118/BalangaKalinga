// Port of register.php
import { redirect } from "next/navigation";
import { query } from "../../lib/db";
import { currentUser, hashPassword, setSessionCookie } from "../../lib/auth";

export default async function RegisterPage({ searchParams }) {
  const me = await currentUser().catch(() => null);
  if (me) redirect("/dashboard");
  const error = searchParams?.error || null;

  async function registerAction(formData) {
    "use server";
    const name = (formData.get("name") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const student_id = (formData.get("student_id") || "").toString().trim();
    const course = (formData.get("course") || "").toString().trim();
    const year = (formData.get("year_level") || "").toString().trim();
    const school = (formData.get("school") || "").toString().trim();
    const password = (formData.get("password") || "").toString();
    const confirm = (formData.get("confirm") || "").toString();
    const fail = (m) => redirect("/register?error=" + encodeURIComponent(m));
    if (!name || !email || !password) fail("Name, email and password are required.");
    if (!/^\S+@\S+\.\S+$/.test(email)) fail("Please enter a valid email.");
    if (password.length < 6) fail("Password must be at least 6 characters.");
    if (password !== confirm) fail("Passwords do not match.");
    const existing = await query("SELECT id FROM users WHERE email = ? OR (student_id != '' AND student_id = ?) LIMIT 1", [email, student_id || "___none___"]);
    if (existing.length) fail("Email or student ID already exists.");
    const hash = await hashPassword(password);
    const res = await query("INSERT INTO users (name,email,student_id,password_hash,role,course,year_level,school) VALUES (?,?,?,?,?,?,?,?)", [name, email, student_id || null, hash, "student", course, year, school]);
    await setSessionCookie(res.insertId);
    redirect("/dashboard");
  }

  return (
    <div style={{ maxWidth: 560, margin: "30px auto" }}>
      <div className="card">
        <h1 style={{ fontSize: 22 }}>Create your account</h1>
        <p className="muted">Your data stays private. Takes less than a minute.</p>
        {error && <div className="notice notice-error">{error}</div>}
        <form action={registerAction} style={{ marginTop: 16 }}>
          <div className="form-group"><label>Full name</label><input type="text" name="name" required placeholder="Alex Rivera" /></div>
          <div className="form-row">
            <div className="form-group"><label>Email</label><input type="email" name="email" required placeholder="you@school.edu.ph" /></div>
            <div className="form-group"><label>Student ID (optional)</label><input type="text" name="student_id" placeholder="2025-10422" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Course</label><input type="text" name="course" placeholder="BS Computer Science" /></div>
            <div className="form-group"><label>Year level</label><select name="year_level" defaultValue=""><option value="">Select</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select></div>
          </div>
          <div className="form-group"><label>School</label><input type="text" name="school" placeholder="Bataan Peninsula State University" /></div>
          <div className="form-row">
            <div className="form-group"><label>Password</label><input type="password" name="password" required placeholder="At least 6 characters" /></div>
            <div className="form-group"><label>Confirm password</label><input type="password" name="confirm" required placeholder="Repeat password" /></div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Create account</button>
        </form>
        <p className="muted" style={{ marginTop: 14, textAlign: "center" }}>Already have an account? <a href="/login">Login</a></p>
      </div>
    </div>
  );
}

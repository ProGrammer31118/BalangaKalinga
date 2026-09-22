// Port of profile.php
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "../../lib/db";
import { hashPassword, requireLogin } from "../../lib/auth";

export default async function ProfilePage({ searchParams }) {
  const user = await requireLogin();

  async function saveProfile(formData) {
    "use server";
    const { query: q } = await import("../../lib/db");
    const { getSessionUserId, hashPassword: hp } = await import("../../lib/auth");
    const { redirect: red } = await import("next/navigation");
    const { revalidatePath: rev } = await import("next/cache");
    const uid = getSessionUserId();
    if (!uid) red("/login");
    const name = (formData.get("name") || "").toString().trim();
    const course = (formData.get("course") || "").toString().trim();
    const year = (formData.get("year_level") || "").toString().trim();
    const school = (formData.get("school") || "").toString().trim();
    const pwd = (formData.get("password") || "").toString();
    if (!name) red("/profile?error=" + encodeURIComponent("Name cannot be empty."));
    if (pwd) {
      if (pwd.length < 6) red("/profile?error=" + encodeURIComponent("Password must be at least 6 characters."));
      await q("UPDATE users SET name=?, course=?, year_level=?, school=?, password_hash=? WHERE id=?", [name, course, year, school, await hp(pwd), uid]);
    } else {
      await q("UPDATE users SET name=?, course=?, year_level=?, school=? WHERE id=?", [name, course, year, school, uid]);
    }
    rev("/profile");
    red("/profile?saved=1");
  }

  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  return (
    <>
      <h1>Profile</h1>
      <p className="muted">Manage your account information.</p>
      {searchParams?.error && <div className="notice notice-error" style={{ marginTop: 10 }}>{searchParams.error}</div>}
      {searchParams?.saved && <div className="notice notice-success" style={{ marginTop: 10 }}>Profile updated.</div>}
      <div style={{ maxWidth: 600, marginTop: 16 }} className="card">
        <form action={saveProfile}>
          <div className="form-group"><label>Full name</label><input type="text" name="name" defaultValue={user.name} required /></div>
          <div className="form-group"><label>Email</label><input type="text" value={user.email} disabled /><div className="muted" style={{ fontSize: 12 }}>Email cannot be changed.</div></div>
          <div className="form-group"><label>Student ID</label><input type="text" value={user.student_id || ""} disabled /></div>
          <div className="form-row">
            <div className="form-group"><label>Course</label><input type="text" name="course" defaultValue={user.course || ""} /></div>
            <div className="form-group"><label>Year level</label>
              <select name="year_level" defaultValue={user.year_level || ""}>
                <option value="">Select</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label>School</label><input type="text" name="school" defaultValue={user.school || ""} /></div>
          <div className="form-group"><label>New password (leave blank to keep current)</label><input type="password" name="password" placeholder="At least 6 characters" /></div>
          <button type="submit" className="btn btn-primary">Save changes</button>
        </form>
      </div>
    </>
  );
}

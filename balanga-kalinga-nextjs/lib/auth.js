// Port of PHP session auth (config.php current_user/require_login) using a signed JWT cookie.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query } from "./db";

const COOKIE = "bk_session";
const SECRET = process.env.JWT_SECRET || "balanga-kalinga-dev-secret-change-me";

export function signSession(userId) {
  return jwt.sign({ uid: userId }, SECRET, { expiresIn: "7d" });
}

export async function setSessionCookie(userId) {
  const token = signSession(userId);
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function getSessionUserId() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET);
    return payload.uid ?? null;
  } catch {
    return null;
  }
}

export async function currentUser() {
  const uid = getSessionUserId();
  if (!uid) return null;
  const rows = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [uid]);
  return rows[0] || null;
}

export async function requireLogin() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireStudent() {
  const u = await requireLogin();
  if (u.role === "admin") redirect("/admin");
  return u;
}

export async function requireAdmin() {
  const u = await requireLogin();
  if (u.role !== "admin") redirect("/dashboard");
  return u;
}

// PHP password_hash() produces $2y$ bcrypt hashes; bcryptjs expects $2a$/$2b$.
export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  const normalized = hash.startsWith("$2y$") ? "$2a$" + hash.slice(4) : hash;
  return bcrypt.compare(plain, normalized);
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

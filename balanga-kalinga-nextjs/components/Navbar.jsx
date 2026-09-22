"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar({ user }) {
  const path = usePathname();
  const active = (href) => (path === href ? "active" : "");
  const firstName = user?.name?.split(" ")[0] || "";
  const isAdmin = user?.role === "admin";

  // Admin uses its own dark top bar rendered on /admin page; keep a slim header here.
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href={user ? (isAdmin ? "/admin" : "/dashboard") : "/"} style={{ textDecoration: "none" }}>
          <div className="brand">Balanga Kalinga <small>Kalinga tayo, care together</small></div>
        </Link>
        <nav className="nav">
          {user ? (
            isAdmin ? (
              <>
                <Link className={active("/admin")} href="/admin">Admin Dashboard</Link>
                <Link href="/admin-login" style={{ opacity: 0.7 }}>Staff login</Link>
                <Link href="/profile" className={active("/profile")} style={{ fontWeight: 600 }}>{firstName}</Link>
                <a href="/api/auth/logout" className="btn btn-secondary btn-small">Logout</a>
              </>
            ) : (
              <>
                <Link className={active("/dashboard")} href="/dashboard">Dashboard</Link>
                <Link className={active("/wellness")} href="/wellness">Wellness</Link>
                <Link className={active("/ai-chat")} href="/ai-chat">Kalinga AI</Link>
                <Link className={active("/counseling")} href="/counseling">Counseling</Link>
                <Link href="/profile" className={active("/profile")} style={{ fontWeight: 600 }}>{firstName}</Link>
                <a href="/api/auth/logout" className="btn btn-secondary btn-small">Logout</a>
              </>
            )
          ) : (
            <>
              <Link className={active("/login")} href="/login">Student login</Link>
              <Link className={active("/admin-login")} href="/admin-login">Staff login</Link>
              <Link href="/register" className="btn btn-primary btn-small">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

// Port of index.php
import Link from "next/link";
import { currentUser } from "../lib/auth";

export default async function HomePage() {
  const user = await currentUser().catch(() => null);
  const isAdmin = user?.role === "admin";
  return (
    <>
      <div className="hero">
        <h1>A gentle space for student wellness</h1>
        <p>Balanga Kalinga helps you notice how you are doing and connect with counselors when you need a human to talk to. Kalinga AI is here to listen and guide, never to diagnose.</p>
        <div className="hero-actions">
          {user ? (
            <>
              <Link href={isAdmin ? "/admin" : "/dashboard"} className="btn btn-primary">Go to dashboard</Link>
              {!isAdmin && <Link href="/ai-chat" className="btn btn-secondary">Talk to Kalinga AI</Link>}
            </>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary">Create free account</Link>
              <Link href="/login" className="btn btn-secondary">Login</Link>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-3" style={{ marginTop: 24 }}>
        <div className="card"><h3>Wellness Check</h3><p className="muted">A short 10-question check-in. Get a personal summary and gentle next steps, not a diagnosis.</p><div style={{ marginTop: 12 }}><Link href={user ? "/wellness" : "/login"} className="btn btn-secondary btn-small">Take check-in</Link></div></div>
        <div className="card"><h3>Kalinga AI</h3><p className="muted">A caring AI companion for stress, sleep, motivation and more. Crisis-aware and always kind.</p><div style={{ marginTop: 12 }}><Link href={user ? "/ai-chat" : "/login"} className="btn btn-secondary btn-small">Start conversation</Link></div></div>
        <div className="card"><h3>Counseling</h3><p className="muted">Request an appointment with a school counselor. Choose date, time and how you want to meet.</p><div style={{ marginTop: 12 }}><Link href={user ? "/counseling" : "/login"} className="btn btn-secondary btn-small">View counselors</Link></div></div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card"><h3>How it helps</h3><ul style={{ marginLeft: 18, color: "#475467", fontSize: 14, lineHeight: 1.8 }}><li>Track mood daily with a quick note</li><li>Wellness trends you can see over time</li><li>Private AI chat with safety guidance</li></ul></div>
        <div className="card"><h3>Safe and private</h3><p className="muted">Your AI chats are private to you. Counselors only see appointments you request. Admins see only anonymous trends. If you use words that suggest immediate danger, Kalinga AI will gently guide you to human help.</p><p className="muted" style={{ marginTop: 10 }}><strong>Not a medical service.</strong> This platform supports wellness and does not diagnose or prescribe.</p></div>
      </div>
      <div className="card" style={{ marginTop: 16, background: "#eef4ff", borderColor: "#c7d7f7" }}><h3>Try the demo</h3><p className="muted">Student: alex@balanga.edu.ph / student123 &nbsp; | &nbsp; Admin: admin@kalinga.edu.ph / admin123</p></div>
    </>
  );
}

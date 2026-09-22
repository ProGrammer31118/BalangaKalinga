// Port of ai-chat.php (server part) — interactive UI lives in AiChatClient.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "../../lib/db";
import { requireStudent } from "../../lib/auth";
import { AI_LIVE, AI_MODEL } from "../../lib/ai";
import AiChatClient from "./AiChatClient";

export default async function AiChatPage({ searchParams }) {
  const user = await requireStudent();
  const uid = user.id;

  // ?new=1  and  ?delete=<id>  (same as PHP query actions)
  if (searchParams?.new) {
    const res = await query("INSERT INTO ai_conversations (user_id, title) VALUES (?,?)", [uid, "Talk with Kalinga AI"]);
    redirect(`/ai-chat?c=${res.insertId}`);
  }
  if (searchParams?.delete) {
    await query("DELETE FROM ai_conversations WHERE id=? AND user_id=?", [Number(searchParams.delete), uid]);
    redirect("/ai-chat");
  }

  const list = await query("SELECT * FROM ai_conversations WHERE user_id=? ORDER BY created_at DESC LIMIT 20", [uid]);
  let cid = searchParams?.c ? Number(searchParams.c) : list[0]?.id || null;
  let messages = [];
  if (cid) {
    const conv = await query("SELECT * FROM ai_conversations WHERE id=? AND user_id=? LIMIT 1", [cid, uid]);
    if (!conv.length) cid = null;
    else messages = await query("SELECT * FROM ai_messages WHERE conversation_id=? ORDER BY id ASC", [cid]);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div><h1 style={{ margin: 0 }}>Kalinga AI</h1><p className="muted">Your supportive wellness companion. Not a medical professional, but here to listen and guide.</p></div>
        <Link href="/ai-chat?new=1" className="btn btn-primary btn-small">New chat</Link>
      </div>
      {AI_LIVE
        ? <div className="notice notice-success" style={{ marginTop: 10 }}>Live AI is connected ({AI_MODEL}).</div>
        : <div className="notice notice-info" style={{ marginTop: 10 }}>Running in offline demo mode. Replies use the built-in caring response engine.</div>}
      <AiChatClient
        cid={cid}
        userName={user.name}
        initialMessages={messages.map((m) => ({ role: m.role, content: m.content }))}
        conversations={list.map((c) => ({ id: c.id, title: c.title, created_at: c.created_at }))}
      />
    </>
  );
}

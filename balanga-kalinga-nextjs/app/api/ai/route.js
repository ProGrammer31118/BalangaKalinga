// Port of api/ai.php
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { query } from "../../../lib/db";
import { AI_MODEL, liveReply, offlineReply } from "../../../lib/ai";

const SECRET = process.env.JWT_SECRET || "balanga-kalinga-dev-secret-change-me";

async function sessionUser() {
  const token = cookies().get("bk_session")?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET);
    const rows = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [payload.uid]);
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function POST(req) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.role === "admin") return NextResponse.json({ error: "Staff accounts cannot use student AI chat" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const message = (body.message || "").toString().trim();
  let conversation_id = body.conversation_id ? Number(body.conversation_id) : null;
  if (!message) return NextResponse.json({ error: "Empty message" });

  if (!conversation_id) {
    const title = message.slice(0, 40) || "Talk with Kalinga AI";
    const res = await query("INSERT INTO ai_conversations (user_id, title) VALUES (?,?)", [user.id, title]);
    conversation_id = res.insertId;
  } else {
    const check = await query("SELECT id FROM ai_conversations WHERE id=? AND user_id=? LIMIT 1", [conversation_id, user.id]);
    if (!check.length) {
      const res = await query("INSERT INTO ai_conversations (user_id, title) VALUES (?,?)", [user.id, message.slice(0, 40)]);
      conversation_id = res.insertId;
    }
  }

  await query("INSERT INTO ai_messages (conversation_id, role, content) VALUES (?,?,?)", [conversation_id, "user", message]);

  const [offlineText, risk] = offlineReply(message, user.name || "there");
  let reply = offlineText;
  let live = false;

  const history = await query("SELECT role, content FROM ai_messages WHERE conversation_id=? ORDER BY id ASC LIMIT 20", [conversation_id]);
  const liveText = await liveReply(history.map((m) => ({ role: m.role, content: m.content })));
  if (liveText) {
    // Keep crisis guidance: high-risk messages always prefer the safe offline reply core.
    reply = risk === "high" ? offlineText : liveText;
    live = risk !== "high";
  }

  await query("INSERT INTO ai_messages (conversation_id, role, content) VALUES (?,?,?)", [conversation_id, "assistant", reply]);

  return NextResponse.json({
    reply,
    risk,
    conversation_id,
    live,
    model: AI_MODEL,
    disclaimer: "Kalinga AI is a supportive companion, not a replacement for a licensed professional.",
  });
}

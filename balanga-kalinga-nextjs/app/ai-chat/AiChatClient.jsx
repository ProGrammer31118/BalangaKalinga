"use client";
// Port of the inline <script> in ai-chat.php
import { useEffect, useRef, useState } from "react";

export default function AiChatClient({ cid: initialCid, userName, initialMessages, conversations }) {
  const [cid, setCid] = useState(initialCid);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const boxRef = useRef(null);
  const firstName = (userName || "there").split(" ")[0];

  useEffect(() => { boxRef.current?.scrollTo(0, boxRef.current.scrollHeight); }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, conversation_id: cid }) });
      const data = await res.json();
      if (data.error) setMessages((m) => [...m, { role: "assistant", content: data.error }]);
      else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        if (data.conversation_id && data.conversation_id !== cid) {
          setCid(data.conversation_id);
          window.history.replaceState({}, "", "/ai-chat?c=" + data.conversation_id);
        }
        if (data.risk === "high") {
          setMessages((m) => [...m, { role: "assistant", content: "If you need immediate help, please call NCMH 1553, Hopeline 0917-558-4673, or 911." }]);
        }
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    }
    setSending(false);
  }

  return (
    <div className="chat-wrap" style={{ marginTop: 14 }}>
      <div className="chat-sidebar">
        <strong style={{ fontSize: 13 }}>Your conversations</strong>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {conversations.length ? conversations.map((c) => (
            <a key={c.id} href={`/ai-chat?c=${c.id}`} style={{ display: "block", padding: "8px 10px", borderRadius: 8, background: cid === c.id ? "#eef4ff" : "#fff", border: "1px solid #e5e7eb", textDecoration: "none", color: "#1f3a5f", fontSize: 13 }}>
              <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title || "Talk with Kalinga AI"}</div>
              <div className="muted" style={{ fontSize: 11 }}>{new Date(c.created_at).toLocaleString()}</div>
            </a>
          )) : <p className="muted" style={{ fontSize: 13 }}>No chats yet. Start one on the right.</p>}
        </div>
        {cid && <div style={{ marginTop: 12 }}><a href={`/ai-chat?delete=${cid}`} onClick={(e) => { if (!confirm("Delete this conversation?")) e.preventDefault(); }} style={{ fontSize: 12, color: "#b42318" }}>Delete this chat</a></div>}
        <div className="muted" style={{ fontSize: 12, marginTop: 12, padding: 10, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>Tip: Try saying &quot;I have three deadlines and feel overwhelmed&quot; or &quot;I cannot sleep&quot; to see how Kalinga responds.</div>
      </div>
      <div className="chat-main">
        <div ref={boxRef} className="chat-messages">
          {messages.length === 0 && (
            <>
              <div className="bubble bubble-ai">Hi {firstName}! I am Kalinga AI, your wellness companion. You can tell me about deadlines, sleep, stress, or just how your day has been. I am here to listen without judgment.</div>
              <div className="bubble bubble-ai" style={{ fontSize: 12, color: "#667085" }}>Try: &quot;I feel anxious about my exams&quot; or &quot;Help me prepare for a counselor session&quot;</div>
            </>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-ai"}`}>{m.content}</div>
          ))}
        </div>
        <div className="chat-input">
          <textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." style={{ flex: 1 }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
          <button onClick={sendMessage} className="btn btn-primary" style={{ height: 42, alignSelf: "flex-end" }} disabled={sending}>{sending ? "..." : "Send"}</button>
        </div>
        <div className="muted" style={{ fontSize: 11, padding: "6px 12px", textAlign: "center" }}>Kalinga AI is supportive, not a licensed professional. If you feel unsafe, call NCMH 1553 or 911 right away.</div>
      </div>
    </div>
  );
}

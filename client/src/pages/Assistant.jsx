import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { aiApi } from '../api.js';

const suggestions = [
  "I've been feeling anxious lately",
  "I can't sleep well",
  'Help me with exam stress',
  'I feel sad and lonely',
  'How do I book a session?',
  'What is the Kalinga assessment?',
];

export default function Assistant() {
  const { token } = useAuth();
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m KaKalinga AI 🤖 — your wellness assistant. I can help with stress, anxiety, sleep, study tips, and your assessment schedule. How are you feeling today?' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    aiApi(token).status().then(setStatus).catch(() => {});
  }, [token]);

  const send = async (text) => {
    const clean = (text || input).trim();
    if (!clean || typing) return;
    const history = [...messages, { role: 'user', content: clean }];
    setMessages(history);
    setInput('');
    setTyping(true);
    try {
      const data = await aiApi(token).chat(history);
      setMessages([...history, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([...history, { role: 'assistant', content: 'Sorry, I had trouble responding. Please try again.' }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="chat-page">
      <header className="page-head">
        <h2>KaKalinga AI Assistant</h2>
        <p className="muted">A caring, confidential space to talk.
          {status && !status.enabled && ' (Offline demo mode — add an OPENAI_API_KEY to enable the real AI)'}
        </p>
      </header>

      <div className="chat-window card">
        <div className="chat-body">
          {messages.map((m, i) => (
            <div key={i} className={'msg ' + (m.role === 'user' ? 'user' : 'assistant')}>
              {m.content}
            </div>
          ))}
          {typing && <div className="msg assistant typing">...</div>}
          <div ref={endRef} />
        </div>
        <div className="chat-input">
          <div className="chips">
            {suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
          <div className="row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message..."
            />
            <button className="btn primary" onClick={() => send()} disabled={typing}>Send</button>
          </div>
        </div>
      </div>

      <p className="muted note">
        {status?.enabled
          ? `Powered by OpenAI (${status.model}). `
          : 'KaKalinga AI is currently in offline demo mode. '}
        It is not a substitute for professional care. In a crisis, call the NCMH Crisis Hotline 1553 or 911.
      </p>
    </div>
  );
}
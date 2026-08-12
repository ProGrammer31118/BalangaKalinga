import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { aiApi } from '../api.js';

const suggestions = [
  "I'm stressed about three projects due this week",
  "I feel anxious about my exams",
  "I can't sleep well lately",
  'I feel sad and lonely',
  'I have trouble focusing',
  'Help me prepare for my counseling session',
];

function TypingDots() {
  return (
    <div className="msg assistant typing-dots">
      <span className="dot" /><span className="dot" /><span className="dot" />
    </div>
  );
}

export default function Assistant() {
  const { token, user } = useAuth();
  const [status, setStatus] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi ${(user?.name || '').split(' ')[0] || 'there'}! 💙 I'm Kalinga AI, your wellness companion. I'm here to listen without judgment — stress, deadlines, sleep, relationships, anything. How are you feeling right now?` },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [risk, setRisk] = useState('low');
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
      const data = await aiApi(token).chat(history, conversationId);
      setConversationId(data.conversation_id || conversationId);
      setRisk(data.risk);
      if (data.risk === 'high') setCrisis(true);
      setMessages([...history, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([...history, { role: 'assistant', content: 'Sorry, I had trouble responding. Please try again — or reach out to the Get Help page if you need support right now.' }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="chat-page">
      <header className="page-head chat-head">
        <div>
          <h2>💬 Kalinga AI</h2>
          <p className="muted">
            A caring, confidential space to talk.
            {status && !status.enabled && ' · Offline demo mode — add OPENAI_API_KEY to enable the live model.'}
          </p>
        </div>
        <Link className="btn danger small" to="/get-help">Get Help Now</Link>
      </header>

      {crisis && (
        <div className="crisis-banner">
          <strong>You matter, and your safety comes first.</strong>
          <p>
            I'm here with you, but right now real human support is the most helpful next step. Please
            contact a trusted person, your school guidance office, or a crisis line.
          </p>
          <div className="row">
            <a className="btn danger small" href="tel:1553">NCMH 1553</a>
            <a className="btn danger small" href="tel:09175584673">Hopeline 0917-558-4673</a>
            <Link className="btn outline small" to="/get-help">Open Get Help page</Link>
            <button className="btn ghost small" onClick={() => setCrisis(false)}>I'm safe now</button>
          </div>
        </div>
      )}

      <div className="chat-window card">
        <div className="chat-body">
          {messages.map((m, i) => (
            <div key={i} className={'msg ' + (m.role === 'user' ? 'user' : 'assistant')}>
              {m.content}
            </div>
          ))}
          {typing && <TypingDots />}
          <div ref={endRef} />
        </div>
        <div className="chat-input">
          <div className="chips">
            {suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)} disabled={typing}>{s}</button>
            ))}
          </div>
          <div className="row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message…"
            />
            <button className="btn primary" onClick={() => send()} disabled={typing}>Send</button>
          </div>
        </div>
      </div>

      <p className="muted note">
        {status?.enabled ? `Powered by ${status.model}. ` : 'Kalinga AI is in offline demo mode. '}
        Kalinga AI provides supportive information and is not a replacement for a licensed mental health
        professional. In a crisis, call the NCMH Crisis Hotline 1553 or 911.
      </p>
    </div>
  );
}
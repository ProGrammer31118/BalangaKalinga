import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { assessmentApi, scheduleApi } from '../api.js';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [results, setResults] = useState([]);
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    assessmentApi(token).mine().then((d) => setResults(d.results)).catch(() => {});
    scheduleApi(token).mine().then((d) => setSchedules(d.schedules)).catch(() => {});
  }, [token]);

  const latest = results[0];

  return (
    <div>
      <header className="page-head">
        <h2>Hello, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="muted">Welcome to your Balanga Kalinga wellness space.</p>
      </header>

      <div className="quick-actions">
        <Link to="/app/assessment" className="qa-card">
          <span className="qa-icon">📋</span>
          <div><strong>Take Assessment</strong><p>Complete a wellness self-check.</p></div>
        </Link>
        <Link to="/app/schedule" className="qa-card">
          <span className="qa-icon">🗓️</span>
          <div><strong>My Schedule</strong><p>View or manage sessions.</p></div>
        </Link>
        <Link to="/app/assistant" className="qa-card">
          <span className="qa-icon">🤖</span>
          <div><strong>KaKalinga AI</strong><p>Talk to our wellness assistant.</p></div>
        </Link>
      </div>

      <div className="grid two">
        <section className="card">
          <h3>Your latest check-in</h3>
          {latest ? (
            <div>
              <p className="score-line">
                Score: <strong>{latest.total_score}</strong> / 30
              </p>
              <span className="badge" style={{ background: 'var(--' + (latest.category === 'Low' ? 'ok' : latest.category === 'Moderate' ? 'warn' : 'danger') + ')' }}>
                {latest.category}
              </span>
              <p className="muted">{latest.summary}</p>
            </div>
          ) : (
            <p className="muted">You haven't taken an assessment yet.</p>
          )}
        </section>

        <section className="card">
          <h3>Upcoming schedule</h3>
          {schedules.length ? (
            schedules.map((s) => (
              <div key={s.id} className="list-item">
                <div>
                  <strong>{s.title}</strong>
                  <p className="muted">{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : 'To be scheduled'} · {s.method}</p>
                </div>
                <span className="badge subtle">{s.status}</span>
              </div>
            ))
          ) : (
            <p className="muted">No scheduled sessions yet. Ask in the AI assistant to book one.</p>
          )}
        </section>
      </div>
    </div>
  );
}
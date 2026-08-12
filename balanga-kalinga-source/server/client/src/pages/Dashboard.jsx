import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { assessmentApi, progressApi, counselingApi } from '../api.js';

const MOODS = [
  { key: 'great', emoji: '😊', label: 'Great' },
  { key: 'good', emoji: '🙂', label: 'Good' },
  { key: 'okay', emoji: '😐', label: 'Okay' },
  { key: 'stressed', emoji: '😟', label: 'Stressed' },
  { key: 'low', emoji: '😔', label: 'Low' },
  { key: 'overwhelmed', emoji: '😣', label: 'Overwhelmed' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstWord(n) {
  return (n || 'friend').split(' ')[0];
}

export default function Dashboard() {
  const { user, token, refreshNotifications } = useAuth();
  const [moods, setMoods] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMood, setSavedMood] = useState(null);
  const [progress, setProgress] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    assessmentApi(token).moods().then((d) => setMoods(d.moods)).catch(() => {});
    progressApi(token).overview().then(setProgress).catch(() => {});
    assessmentApi(token).recommendations().then((d) => setRecommendations(d.recommendations || [])).catch(() => {});
    counselingApi(token).mine().then((d) => setAppointments(d.appointments || [])).catch(() => {});
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayMood = moods.find((m) => m.created_at.slice(0, 10) === todayIso) || moods[0] || null;

  const pickMood = async (key) => {
    setSaving(true);
    setError('');
    try {
      await assessmentApi(token).logMood(key, note.trim());
      setSavedMood(key);
      setNote('');
      await assessmentApi(token).moods().then((d) => setMoods(d.moods));
      await refreshNotifications();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const nextAppt = appointments.find((a) => a.status === 'approved' || a.status === 'pending');

  const weeklyValues = progress?.days.filter((d) => d.value !== null).map((d) => d.value) || [];
  const weeklyAvg = weeklyValues.length
    ? (weeklyValues.reduce((a, b) => a + b, 0) / weeklyValues.length).toFixed(1)
    : '—';
  const trendText = progress && progress.trend > 0 ? 'Improving' : progress?.trend < 0 ? 'Could use care' : 'Steady';

  return (
    <div className="page">
      <header className="dash-head">
        <div>
          <span className="welcome-avatar">{user?.avatar || '🎓'}</span>
          <div>
            <h2>{greeting()}, {firstWord(user?.name)}.</h2>
            <p className="muted">How are you feeling today?</p>
          </div>
        </div>
        <Link className="btn outline small" to="/app/wellness">Take wellness check</Link>
      </header>

      {error && <div className="alert error">{error}</div>}

      {/* Today's mood check */}
      <section className="card mood-card">
        <div className="card-head">
          <h3>Today's wellness check</h3>
          {todayMood && (
            <span className="badge soft">Today: {MOODS.find((m) => m.key === todayMood.mood)?.emoji} {todayMood.mood}</span>
          )}
        </div>
        <div className="mood-row">
          {MOODS.map((m) => (
            <button
              key={m.key}
              className={'mood-btn' + (savedMood === m.key || todayMood?.mood === m.key ? ' active' : '')}
              onClick={() => pickMood(m.key)}
              disabled={saving}
              title={m.label}
            >
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{m.label}</span>
            </button>
          ))}
        </div>
        <div className="mood-note">
          <input
            placeholder="Optional: what's on your mind right now? (kept private)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') pickMood(todayMood?.mood || 'okay'); }}
          />
        </div>
        {savedMood && <p className="success-line">✓ Checked in. Small steps count — nice work.</p>}
      </section>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-tile">
          <span className="stat-icon">😐</span>
          <div>
            <strong>{todayMood ? MOODS.find((m) => m.key === todayMood.mood)?.label : 'No mood yet'}</strong>
            <p className="muted">Current mood</p>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-icon">{trendText === 'Improving' ? '📈' : '📊'}</span>
          <div>
            <strong>{weeklyAvg === '—' ? '—' : weeklyAvg + '/5'}</strong>
            <p className="muted">Weekly trend · {trendText}</p>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-icon">📋</span>
          <div>
            <strong>{progress?.totals.checks ?? 0}</strong>
            <p className="muted">Wellness checks</p>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-icon">🧘</span>
          <div>
            <strong>{progress?.totals.selfCareCompleted ?? 0}</strong>
            <p className="muted">Self-care done</p>
          </div>
        </div>
      </div>

      <div className="grid two">
        {/* Weekly sparkline */}
        <section className="card">
          <h3>Your week at a glance</h3>
          {progress && progress.days.length ? (
            <div className="week-bars">
              {progress.days.map((d, i) => (
                <div className="week-day" key={i} title={`${d.label}${d.emoji ? ': ' + d.mood : ' — no check-in'}`}>
                  <span className="bar-wrap">
                    <span
                      className={'bar' + (d.value === null ? ' empty' : '')}
                      style={{ height: d.value === null ? '4px' : `${(d.value / 5) * 100}%` }}
                    />
                  </span>
                  <span className="week-label">{d.label}</span>
                  <span className="week-emoji">{d.emoji || '·'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Check in daily to see your weekly pattern here.</p>
          )}
          <Link className="link-more" to="/app/progress">View full progress →</Link>
        </section>

        {/* Upcoming appointment */}
        <section className="card">
          <h3>Upcoming appointment</h3>
          {nextAppt ? (
            <div className="appt-box">
              <span className="appt-avatar" style={{ background: nextAppt.color }}>{nextAppt.avatar || '🦋'}</span>
              <div>
                <strong>{nextAppt.counselor_name}</strong>
                <p className="muted">{nextAppt.specialization}</p>
                <p className="appt-when">
                  {nextAppt.requested_date} · {nextAppt.requested_time} · {nextAppt.method}
                </p>
                <span className={'badge ' + (nextAppt.status === 'approved' ? 'ok' : 'warn')}>
                  {nextAppt.status}
                </span>
              </div>
            </div>
          ) : (
            <p className="muted">No upcoming appointments. You can request one with a counselor anytime.</p>
          )}
          <Link className="link-more" to="/app/counseling">Manage counseling →</Link>
        </section>
      </div>

      {/* Kalinga recommendations */}
      <section className="card">
        <div className="card-head">
          <h3>✨ Kalinga Recommendations</h3>
          <span className="badge soft">for you</span>
        </div>
        {recommendations.length ? (
          <div className="reco-list">
            {recommendations.map((r, i) => (
              <div className="reco-item" key={i}>
                <span className="reco-emoji">{r.emoji}</span>
                <div>
                  <strong>{r.activity}</strong>
                  <p>{r.text}</p>
                </div>
                {r.activity === 'Counselor check-in' ? (
                  <Link className="btn primary small" to="/app/counseling">Book</Link>
                ) : (
                  <Link className="btn outline small" to="/app/selfcare">Try it</Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">
            Finish a wellness check and your recommendations will appear here, tailored to your own patterns.
          </p>
        )}
      </section>
    </div>
  );
}
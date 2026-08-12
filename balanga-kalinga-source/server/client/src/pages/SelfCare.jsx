import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { selfcareApi } from '../api.js';

const CATEGORY_META = {
  'Stress Relief': { emoji: '🌬️', color: '#4338ca' },
  'Academic Burnout': { emoji: '📚', color: '#0d9488' },
  'Emotional Wellness': { emoji: '🌙', color: '#db2777' },
  'Sleep': { emoji: '🛏️', color: '#7c3aed' },
};

function BreathingExercise({ onDone }) {
  const [phase, setPhase] = useState('ready');
  const [count, setCount] = useState(4);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase === 'ready') return;
    if (!running) return;
    if (count <= 0) {
      if (phase === 'inhale') { setPhase('hold'); setCount(4); }
      else if (phase === 'hold') { setPhase('exhale'); setCount(6); }
      else { setPhase('inhale'); setCount(4); }
      return;
    }
    timerRef.current = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [phase, count, running]);

  const start = () => { setRunning(true); setPhase('inhale'); setCount(4); };

  const scale = phase === 'inhale' ? 1.25 : phase === 'exhale' ? 0.85 : 1.05;

  return (
    <div className="interactive breathing">
      <div className="breathe-circle" style={{ transform: `scale(${scale})` }}>
        {phase === 'ready' ? '🌬️' : count}
      </div>
      <p className="breathe-label">
        {phase === 'ready' ? '4-7-8 breathing' : phase === 'inhale' ? 'Breathe in' : phase === 'hold' ? 'Hold' : 'Breathe out'}
      </p>
      <div className="row">
        {!running ? (
          <button className="btn primary small" onClick={start}>Start</button>
        ) : (
          <button className="btn ghost small" onClick={() => { setRunning(false); setPhase('ready'); }}>Stop</button>
        )}
        <button className="btn outline small" onClick={onDone}>Finish activity</button>
      </div>
      <p className="muted note">Inhale 4 · hold 4 · exhale 6. Repeat for 4 cycles.</p>
    </div>
  );
}

function Pomodoro({ onDone }) {
  const WORK = 25 * 60, BREAK = 5 * 60;
  const [mode, setMode] = useState('work');
  const [seconds, setSeconds] = useState(WORK);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(ref.current);
          if (mode === 'work') { setMode('break'); return BREAK; }
          setMode('work'); return WORK;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running, mode]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="interactive pomodoro">
      <div className="pomodoro-ring" style={{ borderColor: mode === 'work' ? 'var(--primary)' : 'var(--ok)' }}>
        <strong>{fmt(seconds)}</strong>
        <span className="muted">{mode === 'work' ? 'Focus' : 'Break'}</span>
      </div>
      <div className="row">
        <button className="btn primary small" onClick={() => setRunning(!running)}>{running ? 'Pause' : 'Start'}</button>
        <button className="btn ghost small" onClick={() => { setRunning(false); setMode('work'); setSeconds(WORK); }}>Reset</button>
        <button className="btn outline small" onClick={onDone}>Finish</button>
      </div>
      <p className="muted note">25 minutes of focus, then a 5-minute break.</p>
    </div>
  );
}

function Guide({ activity, onDone }) {
  const [step, setStep] = useState(0);
  const steps = activity.instructions || [];
  return (
    <div className="interactive guide">
      <h4>{activity.title}</h4>
      <p className="guide-step">
        {steps.length ? `${step + 1}. ${steps[step]}` : activity.description}
      </p>
      {steps.length > 0 && (
        <div className="row">
          <button className="btn primary small" disabled={step >= steps.length - 1} onClick={() => setStep(step + 1)}>
            Next step
          </button>
          {step < steps.length - 1 && <button className="btn ghost small" onClick={() => setStep(steps.length - 1)}>Skip to end</button>}
        </div>
      )}
      <button className="btn outline small" onClick={onDone}>Mark as complete</button>
      <div className="guide-progress">
        {steps.map((_, i) => <span key={i} className={'guide-dot' + (i <= step ? ' done' : '')} />)}
      </div>
    </div>
  );
}

export default function SelfCare() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [active, setActive] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = () => {
    selfcareApi(token).list().then(setData).catch((e) => setError(e.message));
    selfcareApi(token).logs().then((d) => setLogs(d.logs)).catch(() => {});
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const complete = async (id) => {
    try {
      await selfcareApi(token).complete(id);
      setActive(null);
      setToast('✓ Completed — small steps count!');
      setTimeout(() => setToast(''), 2500);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!data) return <div className="page"><div className="skeleton">Loading activities…</div></div>;

  return (
    <div className="page">
      <header className="page-head">
        <h2>🧘 Self-Care Center</h2>
        <p className="muted">Short, guided activities for the moments when you need to reset.</p>
      </header>

      {toast && <div className="alert success">{toast}</div>}
      {error && <div className="alert error">{error}</div>}

      {data.categories.map((cat) => (
        <section className="sc-section" key={cat}>
          <h3 className="sc-cat" style={{ color: CATEGORY_META[cat]?.color }}>
            {CATEGORY_META[cat]?.emoji} {cat}
          </h3>
          <div className="sc-grid">
            {data.activities.filter((a) => a.category === cat).map((a) => (
              <button
                key={a.id}
                className={'sc-card' + (a.completed ? ' done' : '')}
                onClick={() => setActive(a)}
              >
                <span className="sc-emoji">{a.emoji}</span>
                <strong>{a.title}</strong>
                <p>{a.description}</p>
                <span className="sc-meta muted">{a.duration_min} min {a.completed ? '· ✓ done' : ''}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="card">
        <h3>Recent activity</h3>
        {logs.length ? (
          <div className="log-list">
            {logs.slice(0, 8).map((l) => (
              <div className="log-row" key={l.id}>
                <span>{l.emoji}</span>
                <span><strong>{l.activity_title}</strong> <span className="muted">· {l.category}</span></span>
                <span className="muted">{new Date(l.completed_at + 'Z').toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Complete your first activity to start tracking your self-care.</p>
        )}
      </section>

      {active && (
        <div className="modal-overlay" onClick={() => setActive(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {active.title === 'Breathe & Reset' ? (
              <BreathingExercise onDone={() => complete(active.id)} />
            ) : active.title === 'Pomodoro Focus' ? (
              <Pomodoro onDone={() => complete(active.id)} />
            ) : (
              <Guide activity={active} onDone={() => complete(active.id)} />
            )}
            <button className="btn ghost small modal-close" onClick={() => setActive(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { assessmentApi } from '../api.js';

const MOOD_META = {
  'Doing Well': { emoji: '😊', color: '#2e9e6b' },
  Balanced: { emoji: '🙂', color: '#e8a23a' },
  'Needs Attention': { emoji: '🌤️', color: '#e0643f' },
  Stressed: { emoji: '💙', color: '#d34d4d' },
};

export default function Assessment() {
  const { token, refreshNotifications } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [options, setOptions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [loadingQ, setLoadingQ] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    assessmentApi(token).questions()
      .then((d) => { setQuestions(d.questions); setOptions(d.options); })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingQ(false));
    assessmentApi(token).mine().then((d) => setHistory(d.results)).catch(() => {});
  }, [token]);

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length ? answeredCount / questions.length : 0;

  const setAnswer = (qid) => (e) => setAnswers({ ...answers, [qid]: Number(e.target.value) });

  const submit = async () => {
    const ordered = questions.map((q) => answers[q.id]);
    if (ordered.some((v) => v === undefined)) {
      setError('Please answer all questions before seeing your summary.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const r = await assessmentApi(token).submit(ordered);
      setResult(r);
      setShowSummary(true);
      await refreshNotifications();
      const d = await assessmentApi(token).mine();
      setHistory(d.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
    setShowSummary(false);
  };

  return (
    <div className="page">
      <header className="page-head">
        <h2>🧠 Wellness Check</h2>
        <p className="muted">
          Ten gentle questions about how things have been lately. This is a check-in snapshot, not a
          diagnosis — your answers stay private.
        </p>
      </header>

      {showSummary && result && (
        <section className="card summary-card" style={{ borderLeft: `6px solid ${MOOD_META[result.overall]?.color}` }}>
          <div className="summary-top">
            <span className="summary-emoji">{MOOD_META[result.overall]?.emoji}</span>
            <div>
              <h3>Your Wellness Summary</h3>
              <p className="muted">Based on your check-in · {new Date(result.created_at + 'Z').toLocaleString()}</p>
            </div>
          </div>
          <p className="summary-level" style={{ color: MOOD_META[result.overall]?.color }}>
            Overall Wellness: <strong>{result.overall}</strong>
          </p>
          <p>{result.summary}</p>

          {result.weakAreas.length > 0 && (
            <>
              <h4>Areas that may need support</h4>
              <div className="area-chips">
                {result.weakAreas.map((a) => <span className="chip" key={a}>{a}</span>)}
              </div>
            </>
          )}

          <h4>Suggested actions</h4>
          <ul className="action-list">
            {result.suggested.map((s, i) => <li key={i}>{s}</li>)}
          </ul>

          <div className="row summary-actions">
            <Link className="btn primary" to="/app/counseling">Talk to a Counselor</Link>
            <Link className="btn outline" to="/app/selfcare">Explore self-care</Link>
            <button className="btn ghost" onClick={reset}>Take again</button>
          </div>
          <p className="muted note">
            This summary is for your awareness only and is not a medical diagnosis. If you're concerned,
            please speak with a licensed professional.
          </p>
        </section>
      )}

      {!showSummary && (
        <section className="card">
          {loadingQ ? (
            <div className="skeleton">Loading questions…</div>
          ) : (
            <>
              <div className="progress">
                <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="progress-text muted">
                {answeredCount} of {questions.length} answered
              </p>
              {error && <div className="alert error">{error}</div>}
              {questions.map((q, i) => (
                <div className="question" key={q.id}>
                  <p>
                    <strong>Question {i + 1} of {questions.length}</strong>
                    <span className="q-area">{q.area}</span>
                  </p>
                  <h4 className="q-text">{q.text}</h4>
                  <div className="option-grid">
                    {options.map((o) => (
                      <label key={o.value} className={'option-btn' + (answers[q.id] === o.value ? ' selected' : '')}>
                        <input
                          type="radio"
                          name={`q${q.id}`}
                          value={o.value}
                          checked={answers[q.id] === o.value}
                          onChange={setAnswer(q.id)}
                        />
                        <span className="option-emoji">{o.emoji}</span>
                        <span>{o.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="row end-actions">
                <button
                  className="btn primary"
                  onClick={submit}
                  disabled={submitting || answeredCount < questions.length}
                >
                  {submitting ? 'Preparing your summary…' : 'See my wellness summary'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <section className="card">
        <h3>Your check-in history</h3>
        {history.length ? (
          <div className="history-list">
            {history.map((h) => (
              <div className="history-row" key={h.id}>
                <span className="badge" style={{ background: MOOD_META[h.overall]?.color || '#6b7280' }}>
                  {MOOD_META[h.overall]?.emoji} {h.overall}
                </span>
                <span className="muted">{new Date(h.created_at + 'Z').toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No wellness checks taken yet. Take your first one above.</p>
        )}
      </section>
    </div>
  );
}
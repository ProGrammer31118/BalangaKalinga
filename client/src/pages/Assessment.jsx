import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { assessmentApi } from '../api.js';

export default function Assessment() {
  const { token } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [options, setOptions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [loadingQ, setLoadingQ] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    assessmentApi(token).questions()
      .then((d) => { setQuestions(d.questions); setOptions(d.options); })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingQ(false));
    assessmentApi(token).mine().then((d) => setHistory(d.results)).catch(() => {});
  }, [token]);

  const setAnswer = (qid) => (e) => setAnswers({ ...answers, [qid]: Number(e.target.value) });

  const submit = async () => {
    const ordered = questions.map((q) => answers[q.id]);
    if (ordered.some((v) => v === undefined)) {
      setError('Please answer all questions before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const r = await assessmentApi(token).submit(ordered);
      setResult(r);
      const d = await assessmentApi(token).mine();
      setHistory(d.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = questions.length ? Object.keys(answers).length / questions.length : 0;

  return (
    <div>
      <header className="page-head">
        <h2>Wellness Self-Check</h2>
        <p className="muted">Answer honestly based on how you've felt over the past two weeks.</p>
      </header>

      {result && (
        <div className="card" style={{ borderLeft: `6px solid ${result.color}` }}>
          <h3>Your result: <span style={{ color: result.color }}>{result.category}</span></h3>
          <p className="score-line">Score: {result.score} / {result.maxScore}</p>
          <p>{result.summary}</p>
          <p className="muted">
            If you feel unsafe, please reach out to a counselor, a trusted adult, or the NCMH Crisis Hotline at 1553.
          </p>
          <button className="btn ghost" onClick={() => setResult(null)}>Take again</button>
        </div>
      )}

      {!result && (
        <section className="card">
          {loadingQ ? (
            <p>Loading questions...</p>
          ) : (
            <>
              <div className="progress"><div className="progress-fill" style={{ width: `${progress * 100}%` }} /></div>
              {error && <div className="alert error">{error}</div>}
              {questions.map((q, i) => (
                <div key={q.id} className="question">
                  <p><strong>{i + 1}. {q.text}</strong> <span className="muted">· {q.area}</span></p>
                  <select value={answers[q.id] ?? ''} onChange={setAnswer(q.id)}>
                    <option value="" disabled>Choose an option</option>
                    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}
              <div className="row">
                <span className="muted">{Object.keys(answers).length} of {questions.length} answered</span>
                <button className="btn primary" onClick={submit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Get my result'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <section className="card">
        <h3>Your history</h3>
        {history.length ? (
          history.map((h) => (
            <div key={h.id} className="list-item">
              <div>
                <strong>{h.category}</strong>
                <p className="muted">Score {h.total_score}/30 · {new Date(h.created_at + 'Z').toLocaleString()}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">No assessments taken yet.</p>
        )}
      </section>
    </div>
  );
}
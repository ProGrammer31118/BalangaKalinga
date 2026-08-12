import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { progressApi } from '../api.js';

const LEVEL_COLOR = {
  'Doing Well': '#2e9e6b',
  Balanced: '#e8a23a',
  'Needs Attention': '#e0643f',
  Stressed: '#d34d4d',
};
const MOOD_COLOR = { 0: '#d34d4d', 1: '#e0643f', 2: '#e8a23a', 3: '#8fa3c8', 4: '#5aa98c', 5: '#2e9e6b' };

function MoodChart({ days }) {
  const W = 560, H = 180, PAD = 26;
  const pts = days.map((d, i) => {
    const x = PAD + (i / (Math.max(days.length - 1, 1))) * (W - PAD * 2);
    const y = d.value === null ? H - PAD : H - PAD - (d.value / 5) * (H - PAD * 2);
    return { ...d, x, y };
  });
  const linePts = pts.filter((p) => p.value !== null).map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Mood trend over last 7 days">
      {[0, 1, 2, 3, 4, 5].map((v) => (
        <line key={v} x1={PAD} x2={W - PAD} y1={H - PAD - (v / 5) * (H - PAD * 2)} y2={H - PAD - (v / 5) * (H - PAD * 2)} className="chart-grid" />
      ))}
      <polyline points={linePts} fill="none" className="chart-line" />
      {pts.map((p, i) => (
        <g key={i}>
          {p.value !== null && (
            <circle cx={p.x} cy={p.y} r="4.5" fill={MOOD_COLOR[p.value]}>
              <title>{`${p.label}: ${p.mood || '—'} (${p.value}/5)`}</title>
            </circle>
          )}
          {p.value === null && <circle cx={p.x} cy={p.y} r="2.5" fill="#c9d2e0"><title>{`${p.label}: no check-in`}</title></circle>}
          <text x={p.x} y={H - 6} textAnchor="middle" className="chart-label">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function BarChart({ data, colorFor }) {
  const W = 560, H = 180, PAD = 26, barW = 34;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="bar chart">
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={PAD} x2={W - PAD} y1={H - PAD - f * (H - PAD * 2)} y2={H - PAD - f * (H - PAD * 2)} className="chart-grid" />
      ))}
      {data.map((d, i) => {
        const x = PAD + (i / data.length) * (W - PAD * 2) + (W - PAD * 2) / data.length / 2 - barW / 2;
        const h = (d.count / max) * (H - PAD * 2);
        const y = H - PAD - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx="5" fill={colorFor ? colorFor(d) : 'var(--primary)'}>
              <title>{`${d.label}: ${d.count}`}</title>
            </rect>
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="chart-label">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SparkBars({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="spark-bars">
      {data.map((d, i) => (
        <div className="spark-col" key={i} title={`${d.label}: ${d.count}`}>
          <div className="spark-track">
            <div className="spark-fill" style={{ height: `${(d.count / max) * 100}%` }} />
          </div>
          <span className="spark-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Progress() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    progressApi(token).overview().then(setData).catch((e) => setError(e.message));
  }, [token]);

  if (!data) return <div className="page"><div className="skeleton">Loading your trends…</div></div>;

  return (
    <div className="page">
      <header className="page-head">
        <h2>📊 My Progress</h2>
        <p className="muted">
          <strong>Personal Wellness Trends</strong> — a private view of your own patterns, not a diagnosis.
        </p>
      </header>

      {error && <div className="alert error">{error}</div>}

      <div className="grid two">
        <section className="card">
          <h3>Mood Trend — Last 7 Days</h3>
          <MoodChart days={data.days} />
        </section>

        <section className="card">
          <h3>Wellness check history</h3>
          {data.assessments.length ? (
            <div className="check-bars">
              {data.assessments.slice(-8).map((a, i) => (
                <div className="check-col" key={a.id} title={`${a.overall} — ${a.date}`}>
                  <span className="check-pill" style={{ background: LEVEL_COLOR[a.overall] || '#8a94a6' }}>
                    {a.overall.slice(0, 3)}
                  </span>
                  <span className="check-date">{a.date.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Take your first wellness check to see it here.</p>
          )}
        </section>
      </div>

      <div className="grid two">
        <section className="card">
          <h3>Self-care activity completion</h3>
          {data.selfCare.length ? (
            <BarChart data={data.selfCare.map((s) => ({ label: s.category, count: s.c }))} colorFor={() => '#0d9488'} />
          ) : (
            <p className="muted">No self-care activities completed yet. Visit the Self-Care Center.</p>
          )}
        </section>

        <section className="card">
          <h3>Journal activity — last 8 weeks</h3>
          {data.journalPerWeek.some((w) => w.count > 0) ? (
            <SparkBars data={data.journalPerWeek} />
          ) : (
            <p className="muted">Journal entries will show up here week by week.</p>
          )}
        </section>
      </div>

      <div className="grid two">
        <section className="card">
          <h3>Most common stress triggers</h3>
          {data.triggers.length ? (
            <div className="trigger-list">
              {data.triggers.map((t, i) => (
                <div className="trigger-row" key={i}>
                  <span className="trigger-bar-track">
                    <span
                      className="trigger-bar-fill"
                      style={{
                        width: `${Math.min((t.count / data.triggers[0].count) * 100, 100)}%`,
                        background: i === 0 ? '#e0643f' : i === 1 ? '#e8a23a' : '#4338ca',
                      }}
                    />
                  </span>
                  <span className="trigger-label">{t.label}</span>
                  <span className="trigger-count muted">×{t.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              Based on your journal tags and check-in notes. Write a few entries to reveal your patterns.
            </p>
          )}
        </section>

        <section className="card">
          <h3>Summary</h3>
          <div className="summary-tiles">
            <div className="sum-tile"><strong>{data.totals.checks}</strong><span className="muted">wellness checks</span></div>
            <div className="sum-tile"><strong>{data.totals.selfCareCompleted}</strong><span className="muted">self-care activities</span></div>
            <div className="sum-tile"><strong>{data.totals.journalEntries}</strong><span className="muted">journal entries</span></div>
            <div className="sum-tile"><strong>{data.totals.moodChecks}</strong><span className="muted">mood check-ins</span></div>
          </div>
          <Link className="btn outline small" to="/app/selfcare">Explore self-care activities</Link>
        </section>
      </div>
    </div>
  );
}
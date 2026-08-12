import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { adminApi, counselingApi } from '../api.js';

const LEVEL_COLOR = {
  'Doing Well': '#2e9e6b',
  Balanced: '#e8a23a',
  'Needs Attention': '#e0643f',
  Stressed: '#d34d4d',
};

function MiniBar({ data, color }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="admin-bars">
      {data.map((d, i) => (
        <div className="admin-bar-col" key={i} title={`${d.label}: ${d.count}`}>
          <span className="admin-bar-track">
            <span className="admin-bar-fill" style={{ height: `${(d.count / max) * 100}%`, background: color || '#4338ca' }} />
          </span>
          <span className="admin-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const { token } = useAuth();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [students, setStudents] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [newCounselor, setNewCounselor] = useState({ name: '', specialization: '', description: '', color: '#4338ca' });

  const loadAll = () => {
    adminApi(token).overview().then(setData).catch((e) => setError(e.message));
    adminApi(token).students().then((d) => setStudents(d.students)).catch(() => {});
    adminApi(token).counselors().then((d) => setCounselors(d.counselors)).catch(() => {});
    adminApi(token).appointments().then((d) => setAppointments(d.appointments)).catch(() => {});
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [token]);

  const decide = async (id, status) => {
    await adminApi(token).updateAppointment(id, { status });
    setToast(`Appointment ${status}.`);
    setTimeout(() => setToast(''), 2500);
    loadAll();
  };

  const addCounselor = async (e) => {
    e.preventDefault();
    if (!newCounselor.name || !newCounselor.specialization) { setError('Name and specialization required.'); return; }
    await adminApi(token).createCounselor(newCounselor);
    setNewCounselor({ name: '', specialization: '', description: '', color: '#4338ca' });
    setToast('Counselor added.');
    setTimeout(() => setToast(''), 2500);
    loadAll();
  };

  const toggleAvailable = async (c) => {
    await adminApi(token).updateCounselor(c.id, { is_available: c.is_available ? 0 : 1 });
    loadAll();
  };

  if (!data) return <div className="page"><div className="skeleton">Loading admin dashboard…</div></div>;

  return (
    <div className="page">
      <header className="page-head">
        <h2>🛡️ Admin Dashboard</h2>
        <p className="muted">
          Aggregated wellness trends and counseling management. Private student content stays private.
        </p>
      </header>

      {toast && <div className="alert success">{toast}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="tabs">
        <button className={'tab' + (tab === 'overview' ? ' active' : '')} onClick={() => setTab('overview')}>Overview</button>
        <button className={'tab' + (tab === 'counseling' ? ' active' : '')} onClick={() => setTab('counseling')}>Counseling</button>
        <button className={'tab' + (tab === 'students' ? ' active' : '')} onClick={() => setTab('students')}>Students</button>
      </div>

      {tab === 'overview' && (
        <>
          <div className="stat-grid">
            <div className="stat-tile"><span className="stat-icon">🎓</span><div><strong>{data.totals.students}</strong><p className="muted">Active students</p></div></div>
            <div className="stat-tile"><span className="stat-icon">📋</span><div><strong>{data.totals.assessments}</strong><p className="muted">Wellness checks</p></div></div>
            <div className="stat-tile"><span className="stat-icon">🗓️</span><div><strong>{data.totals.appointmentsTotal}</strong><p className="muted">Appointments</p></div></div>
            <div className="stat-tile"><span className="stat-icon">🧘</span><div><strong>{data.totals.selfCare}</strong><p className="muted">Self-care activities</p></div></div>
          </div>

          <div className="grid two">
            <section className="card">
              <h3>Wellness distribution (latest checks)</h3>
              {data.byLevel.length ? (
                data.byLevel.map((b) => (
                  <div className="cat-row" key={b.label}>
                    <span className="badge" style={{ background: LEVEL_COLOR[b.label] || '#6b7280' }}>{b.label}</span>
                    <span className="cat-count">{b.count}</span>
                    <div className="mini-track"><div className="mini-fill" style={{ width: `${(b.count / Math.max(...data.byLevel.map((x) => x.count))) * 100}%`, background: LEVEL_COLOR[b.label] }} /></div>
                  </div>
                ))
              ) : <p className="muted">No wellness checks yet.</p>}
            </section>

            <section className="card">
              <h3>Weekly wellness checks</h3>
              <MiniBar data={data.weekTrend} color="#4338ca" />
            </section>
          </div>

          <div className="grid two">
            <section className="card">
              <h3>Common stress categories</h3>
              {data.topAreas.length ? (
                data.topAreas.map((a, i) => (
                  <div className="cat-row" key={a.label}>
                    <span className="cat-count">{a.label}</span>
                    <div className="mini-track"><div className="mini-fill" style={{ width: `${(a.count / data.topAreas[0].count) * 100}%`, background: i === 0 ? '#e0643f' : '#4338ca' }} /></div>
                    <span className="cat-count">{a.count}</span>
                  </div>
                ))
              ) : <p className="muted">Not enough data yet.</p>}
            </section>

            <section className="card">
              <h3>Most-used wellness activities</h3>
              {data.topActivities.length ? (
                data.topActivities.map((a) => (
                  <div className="cat-row" key={a.title}>
                    <span>{a.emoji} <strong>{a.title}</strong></span>
                    <span className="cat-count">{a.c} uses</span>
                  </div>
                ))
              ) : <p className="muted">No activity data yet.</p>}
            </section>
          </div>
        </>
      )}

      {tab === 'counseling' && (
        <>
          <section className="card">
            <h3>Appointment requests ({data.pendingAppointments.length} pending)</h3>
            {data.pendingAppointments.length ? (
              <div className="pending-list">
                {data.pendingAppointments.map((a) => (
                  <div className="pending-row" key={a.id}>
                    <div>
                      <strong>{a.student_name}</strong>
                      <p className="muted">{a.counselor_name} · {a.requested_date} at {a.requested_time} · {a.method}</p>
                    </div>
                    <div className="row">
                      <button className="btn ok small" onClick={() => decide(a.id, 'approved')}>Approve</button>
                      <button className="btn danger small" onClick={() => decide(a.id, 'declined')}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="muted">No pending requests. New requests appear here.</p>}
          </section>

          <section className="card">
            <h3>Counselor management</h3>
            <form className="admin-form" onSubmit={addCounselor}>
              <input placeholder="Name" value={newCounselor.name} onChange={(e) => setNewCounselor({ ...newCounselor, name: e.target.value })} required />
              <input placeholder="Specialization" value={newCounselor.specialization} onChange={(e) => setNewCounselor({ ...newCounselor, specialization: e.target.value })} required />
              <input placeholder="Short description" value={newCounselor.description} onChange={(e) => setNewCounselor({ ...newCounselor, description: e.target.value })} />
              <button className="btn primary small" type="submit">+ Add counselor</button>
            </form>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Counselor</th><th>Specialization</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {counselors.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.specialization}</td>
                      <td>{c.is_available ? '🟢 Available' : '⚪ Unavailable'}</td>
                      <td><button className="btn ghost small" onClick={() => toggleAvailable(c)}>Toggle</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h3>All appointments</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Student</th><th>Counselor</th><th>When</th><th>Status</th></tr></thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.student_name}</td>
                      <td>{a.counselor_name}</td>
                      <td>{a.requested_date} · {a.requested_time}</td>
                      <td><span className={'badge ' + (a.status === 'approved' ? 'ok' : a.status === 'pending' ? 'warn' : 'neutral')}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === 'students' && (
        <section className="card">
          <h3>Students ({students.length})</h3>
          <p className="muted">
            Staff see only engagement totals per student — never journal entries, moods, or private chats.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Student ID</th><th>Course</th><th>Checks</th><th>Activities</th><th>Appointments</th></tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.student_id || '—'}</td>
                    <td>{s.course || '—'} <span className="muted">· {s.year_level || ''}</span></td>
                    <td>{s.checks}</td>
                    <td>{s.activities}</td>
                    <td>{s.appointments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted note">
            Interested in more? <Link to="/get-help">Support resources</Link> are always available.
          </p>
        </section>
      )}
    </div>
  );
}
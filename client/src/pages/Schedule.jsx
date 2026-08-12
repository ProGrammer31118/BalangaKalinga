import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { scheduleApi, adminApi } from '../api.js';

const statusMap = { available: 'Available', assigned: 'Assigned', complete: 'Completed', cancelled: 'Cancelled' };

export default function Schedule() {
  const { token, user, isAdmin } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', student_id: '', scheduled_at: '', duration_minutes: 30, method: 'In-person', location: '', notes: '' });

  const load = () => {
    const api = scheduleApi(token);
    (isAdmin ? api.all() : api.mine()).then((d) => setSchedules(d.schedules)).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    if (isAdmin) adminApi(token).users().then((d) => setStudents(d.users)).catch(() => {});
  }, [token, isAdmin]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await scheduleApi(token).create(form);
      setForm({ title: '', student_id: '', scheduled_at: '', duration_minutes: 30, method: 'In-person', location: '', notes: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const changeStatus = async (id, status) => {
    await scheduleApi(token).update(id, { status });
    load();
  };

  return (
    <div>
      <header className="page-head">
        <h2>{isAdmin ? 'Assessment Schedules' : 'My Schedule'}</h2>
        <p className="muted">
          {isAdmin
            ? 'Create, assign, and manage check-in sessions for students.'
            : 'Your upcoming mental health check-in sessions with the Kalinga team.'}
        </p>
      </header>

      {isAdmin && (
        <div className="row head-actions">
          <button className="btn primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Close' : '+ New schedule'}
          </button>
        </div>
      )}

      {showForm && (
        <form className="card form-grid" onSubmit={create}>
          {error && <div className="alert error">{error}</div>}
          <input placeholder="Title (e.g. Initial Assessment)" value={form.title} onChange={set('title')} required />
          <select value={form.student_id} onChange={set('student_id')}>
            <option value="">Unassigned (open session)</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
          </select>
          <input type="datetime-local" value={form.scheduled_at} onChange={set('scheduled_at')} />
          <input type="number" min="15" placeholder="Duration (min)" value={form.duration_minutes} onChange={set('duration_minutes')} />
          <select value={form.method} onChange={set('method')}>
            <option>In-person</option><option>Video call</option><option>Phone</option>
          </select>
          <input placeholder="Location / link" value={form.location} onChange={set('location')} />
          <input placeholder="Notes" value={form.notes} onChange={set('notes')} />
          <button className="btn primary" type="submit">Create schedule</button>
        </form>
      )}

      {error && !showForm && <div className="alert error">{error}</div>}

      <section className="card">
        <h3>{isAdmin ? 'All sessions' : 'Your sessions'}</h3>
        {schedules.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                {isAdmin && <th>Student</th>}
                <th>When</th>
                <th>Method</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  {isAdmin && <td>{s.student_name || '—'}</td>}
                  <td>{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : 'To be arranged'}</td>
                  <td>{s.method}</td>
                  <td>
                    {isAdmin ? (
                      <select value={s.status} onChange={(e) => changeStatus(s.id, e.target.value)}>
                        {Object.keys(statusMap).map((k) => <option key={k} value={k}>{statusMap[k]}</option>)}
                      </select>
                    ) : (
                      <span className="badge subtle">{statusMap[s.status] || s.status}</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      <a href={`mailto:${getStudentEmail(s.student_id)}`}>Email student</a>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No schedules found.</p>
        )}
      </section>
    </div>
  );
}

function getStudentEmail(id) {
  // Helper: admin emails are not stored per schedule, so this is a best-effort placeholder.
  return `student@kalinga.gov.ph`;
}
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { adminApi, downloadSource } from '../api.js';

export default function Admin() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi(token).stats().then(setStats).catch((e) => setError(e.message));
    adminApi(token).users().then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  }, [token]);

  const toggleRole = async (id, role) => {
    const next = role === 'admin' ? 'student' : 'admin';
    await adminApi(token).setRole(id, next);
    setUsers(users.map((u) => (u.id === id ? { ...u, role: next } : u)));
  };

  const catColor = (c) => c === 'Low' ? 'var(--ok)' : c === 'Moderate' ? 'var(--warn)' : 'var(--danger)';

  return (
    <div>
      <header className="page-head">
        <h2>Admin Panel</h2>
        <p className="muted">Overview of students, assessments, and wellness across Balanga Kalinga.</p>
      </header>

      {error && <div className="alert error">{error}</div>}

      <div className="row head-actions">
        <button className="btn ghost" onClick={() => downloadSource(token).catch(() => alert('Download failed.'))}>
          ⬇️ Download project source (ZIP)
        </button>
      </div>

      {stats && (
        <div className="stats">
          <Stat label="Total users" value={stats.users} />
          <Stat label="Students" value={stats.students} />
          <Stat label="Assessments taken" value={stats.assessments} />
          <Stat label="Open sessions" value={stats.pending} />
        </div>
      )}

      <div className="grid two">
        <section className="card">
          <h3>Risk distribution</h3>
          {stats?.byCategory.length ? (
            stats.byCategory.map((c) => (
              <div key={c.category} className="cat-row">
                <span className="badge" style={{ background: catColor(c.category) }}>{c.category}</span>
                <span className="cat-count">{c.c} students</span>
              </div>
            ))
          ) : (
            <p className="muted">No assessments recorded yet.</p>
          )}
        </section>

        <section className="card">
          <h3>Recent assessments</h3>
          {stats?.recent.length ? (
            stats.recent.map((a) => (
              <div key={a.id} className="list-item">
                <div>
                  <strong>{a.student_name}</strong>
                  <p className="muted">{a.score}/30 · {new Date(a.created_at + 'Z').toLocaleString()}</p>
                </div>
                <span className="badge" style={{ background: catColor(a.category) }}>{a.category}</span>
              </div>
            ))
          ) : (
            <p className="muted">None yet.</p>
          )}
        </section>
      </div>

      <section className="card">
        <h3>Student accounts ({users.length})</h3>
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>School</th><th>Role</th><th>Action</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.school || '—'}</td>
                <td><span className={'badge subtle ' + (u.role === 'admin' ? 'admin' : '')}>{u.role}</span></td>
                <td>
                  <button className="btn ghost small" onClick={() => toggleRole(u.id, u.role)}>
                    Make {u.role === 'admin' ? 'student' : 'admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-num">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
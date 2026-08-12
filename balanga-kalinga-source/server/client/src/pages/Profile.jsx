import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../api.js';

const AVATARS = ['🦉', '🌸', '⚡', '🌿', '🎧', '🐢', '🦋', '🌙'];

export default function Profile() {
  const { user, token, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', student_id: '', course: '', year_level: '', school: '', avatar: '🎓',
    notif_prefs: { appointments: true, wellness: true, counselors: true, activities: true },
  });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        student_id: user.student_id || '',
        course: user.course || '',
        year_level: user.year_level || '',
        school: user.school || '',
        avatar: user.avatar || '🎓',
        notif_prefs: { ...{ appointments: true, wellness: true, counselors: true, activities: true }, ...(user.notif_prefs || {}) },
      });
    }
  }, [user]);

  const setPref = (k) => (e) =>
    setForm({ ...form, notif_prefs: { ...form.notif_prefs, [k]: e.target.checked } });

  const saveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const d = await authApi.updateMe(token, form);
      setSaved('Profile saved.');
      setTimeout(() => setSaved(''), 2500);
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await authApi.changePassword(token, pw);
      setPw({ current: '', next: '' });
      setSaved('Password updated.');
      setTimeout(() => setSaved(''), 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteData = async () => {
    if (!window.confirm('Delete ALL your wellness data (checks, moods, journal, chats, appointments)? This cannot be undone.')) return;
    await authApi.deleteData(token);
    setSaved('Your wellness data has been deleted.');
  };

  const deleteAccount = async () => {
    if (!window.confirm('Permanently delete your account and all associated data? This cannot be undone.')) return;
    await authApi.deleteAccount(token);
    logout();
    navigate('/');
  };

  return (
    <div className="page">
      <header className="page-head">
        <h2>👤 Profile</h2>
        <p className="muted">Your personal details and privacy controls.</p>
      </header>

      {saved && <div className="alert success">{saved}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="grid two">
        <form className="card" onSubmit={saveProfile}>
          <h3>Personal information</h3>
          <label className="avatar-picker">
            <span className="welcome-avatar big">{form.avatar}</span>
            <span className="muted">Pick an avatar</span>
            <div className="avatar-row">
              {AVATARS.map((a) => (
                <button
                  type="button"
                  key={a}
                  className={'avatar-opt' + (form.avatar === a ? ' active' : '')}
                  onClick={() => setForm({ ...form, avatar: a })}
                >
                  {a}
                </button>
              ))}
            </div>
          </label>
          <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Student ID" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} />
          <div className="row two">
            <input placeholder="Course / Program" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
            <select value={form.year_level} onChange={(e) => setForm({ ...form, year_level: e.target.value })}>
              <option value="">Year level</option>
              {['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <input placeholder="School" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
          <p className="muted note">Email: {user?.email} (used for login — cannot be changed here)</p>
          <button className="btn primary small" disabled={loading}>{loading ? 'Saving…' : 'Save profile'}</button>
        </form>

        <div>
          <form className="card" onSubmit={changePassword}>
            <h3>Change password</h3>
            <input type="password" placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
            <input type="password" placeholder="New password (min 6)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={6} />
            <button className="btn outline small" type="submit">Update password</button>
          </form>

          <div className="card">
            <h3>Notification preferences</h3>
            {Object.entries(form.notif_prefs).map(([k, v]) => (
              <label className="checkline" key={k}>
                <input type="checkbox" checked={v} onChange={setPref(k)} />
                {k === 'appointments' ? 'Appointment reminders' : k === 'wellness' ? 'Wellness check reminders' : k === 'counselors' ? 'New counselor availability' : 'Self-care reminders'}
              </label>
            ))}
            <button className="btn primary small" onClick={saveProfile}>Save preferences</button>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Privacy</h3>
          <p className="muted">
            Your journal entries, AI conversations, wellness checks, and mood records are visible only to
            you. Staff can only see anonymous, aggregated trends — never your private content.
          </p>
          <div className="row">
            <Link className="btn ghost small" to="/privacy">Privacy Policy</Link>
            <Link className="btn ghost small" to="/terms">Terms of Use</Link>
          </div>
        </div>

        <div className="card danger-zone">
          <h3>Data & account</h3>
          <p className="muted">You are in control of your data at all times.</p>
          <div className="row">
            <button className="btn outline small danger-text" onClick={deleteData}>Delete my wellness data</button>
            <button className="btn danger small" onClick={deleteAccount}>Delete account</button>
          </div>
        </div>
      </div>
    </div>
  );
}
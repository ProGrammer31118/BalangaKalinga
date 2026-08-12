import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { counselingApi } from '../api.js';

const STATUS_BADGE = {
  pending: { label: 'Pending', cls: 'warn' },
  approved: { label: 'Approved', cls: 'ok' },
  declined: { label: 'Declined', cls: 'danger' },
  cancelled: { label: 'Cancelled', cls: 'neutral' },
  completed: { label: 'Completed', cls: 'neutral' },
};

function AppointmentModal({ counselor, onClose, onSave, reschedule }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [method, setMethod] = useState('In-person');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const submit = (e) => {
    e.preventDefault();
    if (!date || !time) { setError('Please choose a date and time.'); return; }
    onSave({ counselor_id: counselor.id, requested_date: date, requested_time: time, method, notes });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{reschedule ? 'Reschedule appointment' : `Request appointment with ${counselor.name}`}</h3>
        <p className="muted">{counselor.specialization}</p>
        <p className="muted note">Available: {counselor.schedule.join(' · ')}</p>
        {error && <div className="alert error">{error}</div>}
        <form className="appt-form" onSubmit={submit}>
          <div className="row two">
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>In-person</option>
            <option>Video call</option>
            <option>Phone</option>
          </select>
          <textarea placeholder="Optional: what would you like to talk about?" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          <div className="row">
            <button className="btn primary" type="submit">{reschedule ? 'Save new time' : 'Send request'}</button>
            <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Counseling() {
  const { token } = useAuth();
  const [counselors, setCounselors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [modal, setModal] = useState(null);
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = () => {
    counselingApi(token).counselors().then((d) => setCounselors(d.counselors)).catch((e) => setError(e.message));
    counselingApi(token).mine().then((d) => setAppointments(d.appointments)).catch((e) => setError(e.message));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const request = async (body) => {
    try {
      await counselingApi(token).request(body);
      setToast('✓ Appointment request sent. You will be notified once confirmed.');
      setTimeout(() => setToast(''), 3000);
      setModal(null);
      load();
    } catch (e) { setError(e.message); }
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await counselingApi(token).cancel(id);
      setToast('Appointment cancelled.');
      setTimeout(() => setToast(''), 3000);
      load();
    } catch (e) { setError(e.message); }
  };

  const rescheduleSave = async (body) => {
    try {
      await counselingApi(token).reschedule(rescheduleFor.id, body);
      setToast('✓ Appointment rescheduled. Awaiting reconfirmation.');
      setTimeout(() => setToast(''), 3000);
      setRescheduleFor(null);
      load();
    } catch (e) { setError(e.message); }
  };

  const rescheduleCounselor = appointments.length ? counselors.find((c) => c.id === rescheduleFor?.counselor_id) : null;

  return (
    <div className="page">
      <header className="page-head">
        <h2>📅 Counseling & Support</h2>
        <p className="muted">Real counselors, ready to listen. Request an appointment any time.</p>
      </header>

      {toast && <div className="alert success">{toast}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="grid two">
        {counselors.map((c) => (
          <div className="counselor-card card" key={c.id}>
            <div className="counselor-head">
              <span className="counselor-avatar" style={{ background: c.color }}>{c.avatar}</span>
              <div>
                <strong>{c.name}</strong>
                <p className="badge soft">{c.specialization}</p>
              </div>
            </div>
            <p className="muted">{c.description}</p>
            <div className="schedule-chips">
              {c.schedule.map((s) => <span className="chip" key={s}>{s}</span>)}
            </div>
            <button className="btn primary small" onClick={() => setModal(c)}>Request Appointment</button>
          </div>
        ))}
      </div>

      <section className="card">
        <h3>My appointments</h3>
        {appointments.length ? (
          appointments.map((a) => {
            const badge = STATUS_BADGE[a.status] || STATUS_BADGE.pending;
            return (
              <div className="appt-row" key={a.id}>
                <span className="appt-avatar" style={{ background: a.color || '#4338ca' }}>{a.avatar || '🦋'}</span>
                <div className="appt-info">
                  <strong>{a.counselor_name}</strong>
                  <p className="muted">{a.requested_date} · {a.requested_time} · {a.method}</p>
                  {a.notes && <p className="appt-notes">{a.notes}</p>}
                  <p className="muted note">{a.status_note}</p>
                </div>
                <span className={'badge ' + badge.cls}>{badge.label}</span>
                {(a.status === 'approved' || a.status === 'pending') && (
                  <div className="row appt-actions">
                    <button className="btn outline small" onClick={() => setRescheduleFor(a)}>Reschedule</button>
                    {a.status !== 'cancelled' && (
                      <button className="btn ghost small danger-text" onClick={() => cancel(a.id)}>Cancel</button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <span className="empty-icon">🗓️</span>
            <p>No appointments yet. Your counselor is one click away.</p>
            <Link className="btn outline small" to="/get-help">Need help sooner?</Link>
          </div>
        )}
      </section>

      {modal && <AppointmentModal counselor={modal} onClose={() => setModal(null)} onSave={request} />}
      {rescheduleFor && rescheduleCounselor && (
        <AppointmentModal counselor={rescheduleCounselor} reschedule onClose={() => setRescheduleFor(null)} onSave={rescheduleSave} />
      )}
    </div>
  );
}
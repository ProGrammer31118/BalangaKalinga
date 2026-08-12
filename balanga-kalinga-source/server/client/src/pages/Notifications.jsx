import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { notificationApi } from '../api.js';

const TYPE_EMOJI = { success: '✅', reminder: '🔔', info: '💙', warning: '⚠️' };

export default function Notifications() {
  const { token, refreshNotifications } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    notificationApi(token).list().then((d) => setNotifs(d.notifications)).catch((e) => setError(e.message));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const markRead = async (id) => {
    await notificationApi(token).markRead(id);
    load();
    refreshNotifications();
  };

  const readAll = async () => {
    await notificationApi(token).readAll();
    load();
    refreshNotifications();
  };

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h2>🔔 Notifications</h2>
          <p className="muted">Appointment updates, wellness reminders, and counselor availability.</p>
        </div>
        <button className="btn outline small" onClick={readAll}>Mark all read</button>
      </header>

      {error && <div className="alert error">{error}</div>}

      <section className="card">
        {notifs.length ? (
          notifs.map((n) => (
            <div className={'notif-row' + (n.is_read ? '' : ' unread')} key={n.id} onClick={() => !n.is_read && markRead(n.id)}>
              <span className="notif-emoji">{TYPE_EMOJI[n.type] || '💙'}</span>
              <div className="notif-body">
                <strong>{n.title}</strong>
                <p className="muted">{n.message}</p>
                <p className="notif-date muted">{new Date(n.created_at + 'Z').toLocaleString()}</p>
              </div>
              {n.link && <Link className="btn ghost small" to={n.link} onClick={(e) => e.stopPropagation()}>View</Link>}
              {!n.is_read && <span className="notif-dot" />}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-icon">🔕</span>
            <p>No notifications yet. You'll see appointment updates and gentle reminders here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
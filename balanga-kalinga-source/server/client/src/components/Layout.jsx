import React, { useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/app', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/app/assistant', label: 'Kalinga AI', icon: '💬' },
  { to: '/app/wellness', label: 'Wellness Check', icon: '🧠' },
  { to: '/app/journal', label: 'Journal', icon: '📔' },
  { to: '/app/selfcare', label: 'Self-Care', icon: '🧘' },
  { to: '/app/progress', label: 'My Progress', icon: '📊' },
  { to: '/app/counseling', label: 'Counseling', icon: '📅' },
  { to: '/app/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/app/profile', label: 'Profile', icon: '👤' },
];

const mobilePrimary = ['/app', '/app/assistant', '/app/wellness', '/app/progress', '/app/profile'];

export default function Layout() {
  const { isAdmin, logout, unread, refreshNotifications, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshNotifications();
    const t = setInterval(refreshNotifications, 60000);
    return () => clearInterval(t);
    /* eslint-disable-next-line */
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-badge">BK</span>
          <div>
            <h1>Balanga Kalinga</h1>
            <p>AI Wellness for Students</p>
          </div>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">{l.icon}</span>
              <span className="nav-label">{l.label}</span>
              {l.to === '/app/notifications' && unread > 0 && (
                <span className="nav-badge">{unread}</span>
              )}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/app/admin"
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">🛡️</span>
              <span className="nav-label">Admin Panel</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <Link className="get-help-btn" to="/get-help">🚨 Get Help Now</Link>
          <button className="logout" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <div className="main">
        <header className="mobile-top">
          <div className="brand small">
            <span className="brand-badge">BK</span>
            <strong>Balanga Kalinga</strong>
          </div>
          <div className="row">
            <Link to="/get-help" className="get-help-mini">🚨</Link>
            <button className="mobile-avatar" onClick={() => navigate('/app/profile')}>
              {user?.avatar || '🎓'}
            </button>
          </div>
        </header>

        <Outlet />

        <nav className="bottom-nav">
          {mobilePrimary.map((to) => {
            const link = links.find((l) => l.to === to) || (to === '/app' && links[0]);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/app'}
                className={({ isActive }) => 'bottom-item' + (isActive ? ' active' : '')}
              >
                <span className="bottom-icon">{link.icon}</span>
                <span className="bottom-label">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
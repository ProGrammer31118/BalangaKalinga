import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/app', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/app/assessment', label: 'Assessment', icon: '📋' },
  { to: '/app/schedule', label: 'My Schedule', icon: '🗓️' },
  { to: '/app/assistant', label: 'KaKalinga AI', icon: '🤖' },
  { to: '/app/admin', label: 'Admin Panel', icon: '🛡️', adminOnly: true },
];

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
          {links.filter((l) => !l.adminOnly || isAdmin).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <span>{l.icon}</span> {l.label}
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={handleLogout}>Sign out</button>
      </aside>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [student_id, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(email, student_id, password);
      if (!remember) {
        // still keep session for the demo; privacy note shown in profile
      }
      navigate(u.role === 'admin' ? '/app/admin' : '/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back">
      <form className="card auth-form" onSubmit={submit}>
        <h2>Sign in to Kalinga</h2>
        <p className="muted">Use your email or student ID.</p>
        {error && <div className="alert error">{error}</div>}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={!student_id}
        />
        <input
          placeholder="…or Student ID"
          value={student_id}
          onChange={(e) => setStudentId(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label className="checkline">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember me on this device
        </label>
        <button className="btn primary" disabled={loading || !password || (!email && !student_id)}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="auth-row">
          <Link to="/register">Create an account</Link>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <p className="muted center note">
          Staff & counselors: use your staff account. <Link to="/staff-login">Staff login →</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, children }) {
  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="hero-inner">
          <span className="brand-badge">BK</span>
          <h1>Balanga Kalinga</h1>
          <p>
            A safe, AI-assisted space for students to check in on their mental wellbeing, practice
            self-care, and connect with counselors — with care and confidentiality.
          </p>
          <p className="hero-tag">💙 Kalinga tayo. Care, together.</p>
        </div>
      </div>
      <div className="auth-content">{children}</div>
    </div>
  );
}
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(email, password);
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
        <p className="muted">Access your wellness assessments and schedule.</p>
        {error && <div className="alert error">{error}</div>}
        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        <p className="muted center">
          New here? <Link to="/register">Create an account</Link>
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
          <h1>Balanga Kalinga</h1>
          <p>
            A safe, AI-assisted space for students of Balanga City to check in on their mental
            wellbeing, connect with counselors, and get support with care and confidentiality.
          </p>
          <p className="hero-tag">💙 Kalinga tayo. Care, together.</p>
        </div>
      </div>
      <div className="auth-content">{children}</div>
    </div>
  );
}
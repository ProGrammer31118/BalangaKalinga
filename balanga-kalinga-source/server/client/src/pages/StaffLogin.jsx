import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthShell } from './Login.jsx';

export default function StaffLogin() {
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
      const u = await login(email, '', password);
      if (u.role !== 'admin') {
        setError('This login is reserved for staff. Students can sign in at the student portal.');
        return;
      }
      navigate('/app/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Staff portal">
      <form className="card auth-form" onSubmit={submit}>
        <h2>Staff / Admin login</h2>
        <p className="muted">For authorized counselors and administrators only.</p>
        {error && <div className="alert error">{error}</div>}
        <input type="email" placeholder="Staff email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn primary" disabled={loading}>{loading ? 'Signing in…' : 'Sign in as staff'}</button>
        <p className="muted center note">
          Students? <Link to="/login">Back to student login</Link>
        </p>
      </form>
    </AuthShell>
  );
}
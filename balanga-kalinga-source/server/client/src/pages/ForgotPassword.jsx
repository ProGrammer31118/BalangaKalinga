import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from './Login.jsx';
import { authApi } from '../api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset password">
      <form className="card auth-form" onSubmit={submit}>
        <h2>Reset your password</h2>
        {sent ? (
          <>
            <div className="alert success">
              If an account exists for <strong>{email}</strong>, a reset link has been sent to your
              email. The link expires in 1 hour.
            </div>
            <Link className="btn primary" to="/login">Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="muted">Enter your account email and we'll send you a link to reset your password.</p>
            {error && <div className="alert error">{error}</div>}
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn primary" type="submit" disabled={loading || !email}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="muted center">
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        )}
      </form>
    </AuthShell>
  );
}
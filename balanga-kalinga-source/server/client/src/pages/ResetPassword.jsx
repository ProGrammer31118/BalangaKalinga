import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from './Login.jsx';
import { authApi } from '../api.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Choose a new password">
      <form className="card auth-form" onSubmit={submit}>
        <h2>Choose a new password</h2>
        {done ? (
          <>
            <div className="alert success">Your password has been updated. You can now sign in.</div>
            <Link className="btn primary" to="/login">Go to sign in</Link>
          </>
        ) : !token ? (
          <>
            <div className="alert error">This reset link is invalid or incomplete. Please request a new one.</div>
            <Link className="btn primary" to="/forgot-password">Request a new link</Link>
          </>
        ) : (
          <>
            <p className="muted">Enter a new password for your account.</p>
            {error && <div className="alert error">{error}</div>}
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button className="btn primary" type="submit" disabled={loading || !password || !confirm}>
              {loading ? 'Saving…' : 'Set new password'}
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
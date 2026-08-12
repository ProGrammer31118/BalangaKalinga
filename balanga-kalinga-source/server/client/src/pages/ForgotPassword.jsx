import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from './Login.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <AuthShell title="Reset password">
      <form
        className="card auth-form"
        onSubmit={(e) => { e.preventDefault(); setSent(true); }}
      >
        <h2>Reset your password</h2>
        {sent ? (
          <>
            <div className="alert success">
              If an account exists for <strong>{email}</strong>, a reset link has been sent to your
              email. In this demo, contact your school guidance office to reset a password.
            </div>
            <Link className="btn primary" to="/login">Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="muted">Enter your account email and we'll send you reset instructions.</p>
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn primary" type="submit">Send reset link</button>
            <p className="muted center">
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        )}
      </form>
    </AuthShell>
  );
}
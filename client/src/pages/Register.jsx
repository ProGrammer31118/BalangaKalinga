import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthShell } from './Login.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', grade_level: '', strand: '', school: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await register({ ...form, role: 'student' });
      navigate(u.role === 'admin' ? '/app/admin' : '/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Join Kalinga">
      <form className="card auth-form" onSubmit={submit}>
        <h2>Create student account</h2>
        <p className="muted">Your details stay private and confidential.</p>
        {error && <div className="alert error">{error}</div>}
        <input placeholder="Full name" value={form.name} onChange={set('name')} required />
        <input type="email" placeholder="Email address" value={form.email} onChange={set('email')} required />
        <input type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={set('password')} required />
        <div className="row two">
          <input placeholder="Grade level (e.g. Grade 10)" value={form.grade_level} onChange={set('grade_level')} />
          <input placeholder="Strand (e.g. STEM)" value={form.strand} onChange={set('strand')} />
        </div>
        <input placeholder="School name" value={form.school} onChange={set('school')} />
        <button className="btn primary" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
        <p className="muted center">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
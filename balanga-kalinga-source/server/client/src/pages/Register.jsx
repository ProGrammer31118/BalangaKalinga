import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthShell } from './Login.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', student_id: '', email: '', course: '', year_level: '', school: '',
    password: '', consent: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: k === 'consent' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.consent) {
      setError('Please agree to the privacy policy and terms to create your account.');
      return;
    }
    setLoading(true);
    try {
      const u = await register({ ...form, role: 'student' });
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Join Kalinga">
      <form className="card auth-form wide" onSubmit={submit}>
        <h2>Create your student account</h2>
        <p className="muted">Your details and wellness data stay private and protected.</p>
        {error && <div className="alert error">{error}</div>}
        <input placeholder="Full name" value={form.name} onChange={set('name')} required />
        <div className="row two">
          <input placeholder="Student ID" value={form.student_id} onChange={set('student_id')} required />
          <input type="email" placeholder="Email address" value={form.email} onChange={set('email')} required />
        </div>
        <div className="row three">
          <input placeholder="Course / Program" value={form.course} onChange={set('course')} />
          <select value={form.year_level} onChange={set('year_level')}>
            <option value="">Year level</option>
            <option>1st Year</option>
            <option>2nd Year</option>
            <option>3rd Year</option>
            <option>4th Year</option>
            <option>5th Year</option>
          </select>
          <input placeholder="School" value={form.school} onChange={set('school')} />
        </div>
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={form.password}
          onChange={set('password')}
          required
          minLength={6}
        />
        <label className="checkline">
          <input type="checkbox" checked={form.consent} onChange={set('consent')} />
          <span>
            I consent to the <Link to="/privacy">Privacy Policy</Link> and{' '}
            <Link to="/terms">Terms of Use</Link>, and understand my wellness information is stored
            securely and never shown to other students.
          </span>
        </label>
        <button className="btn primary" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p className="muted center">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
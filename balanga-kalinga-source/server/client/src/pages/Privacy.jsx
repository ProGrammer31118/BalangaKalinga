import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="legal-page">
      <div className="legal-card">
        <span className="brand-badge">BK</span>
        <h1>Privacy Policy</h1>
        <p className="muted">Balanga Kalinga · Last updated 2026</p>

        <h2>1. What we collect and why</h2>
        <p>
          We collect only what we need to run the wellness support service: your name, student ID,
          email, course, year level, and school. With your consent, we also store the wellness
          information you choose to share — mood check-ins, wellness check results, journal entries,
          AI conversations, self-care activity logs, and counseling appointment details.
        </p>

        <h2>2. Who can see your information</h2>
        <p>
          Your personal wellness information is <strong>private to you</strong>. Other students can
          never see it. Counseling staff only see appointment requests and aggregated, anonymous
          trends — never your journal entries or private AI conversations.
        </p>

        <h2>3. Consent</h2>
        <p>
          Wellness assessments are voluntary. You can decline at any time, and choosing not to share
          something never affects your access to the app's support features.
        </p>

        <h2>4. Security</h2>
        <p>
          Passwords are stored as encrypted hashes. Access is protected by login and role-based
          controls. Wellness data is stored in a secure database and never exposed to the public.
        </p>

        <h2>5. AI conversations</h2>
        <p>
          Kalinga AI is an AI support tool, not a licensed mental health professional. It does not
          diagnose or replace professional care. Conversations are private to you and can be deleted
          at any time.
        </p>

        <h2>6. Your rights</h2>
        <p>
          You can delete individual journal entries, delete all of your wellness data, or delete your
          entire account — at any time, from your Profile page.
        </p>

        <h2>7. Contact</h2>
        <p>
          Questions about privacy? Contact the Balanga Kalinga guidance office or your school's data
          protection officer.
        </p>

        <Link className="btn outline small" to="/terms">Read Terms of Use</Link>
        <Link className="btn ghost small" to="/">Back to home</Link>
      </div>
    </div>
  );
}
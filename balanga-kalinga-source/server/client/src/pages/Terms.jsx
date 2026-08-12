import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="legal-page">
      <div className="legal-card">
        <span className="brand-badge">BK</span>
        <h1>Terms of Use</h1>
        <p className="muted">Balanga Kalinga · Last updated 2026</p>

        <h2>1. Purpose</h2>
        <p>
          Balanga Kalinga is a student wellness support system. It provides AI-assisted support,
          wellness tracking, self-care activities, and connection to human counselors.
        </p>

        <h2>2. Not a medical service</h2>
        <p>
          Balanga Kalinga and Kalinga AI provide supportive information and self-management tools.
          They are <strong>not</strong> a replacement for assessment, diagnosis, or treatment by
          licensed mental health professionals. If you are in crisis, contact a trusted person,
          your guidance office, a hotline, or emergency services.
        </p>

        <h2>3. Acceptable use</h2>
        <p>
          Use the system honestly and respectfully. Do not attempt to access other students'
          information. Your account is for your own use.
        </p>

        <h2>4. Privacy</h2>
        <p>
          Your wellness data is private and protected as described in the Privacy Policy. You can
          delete your data or account at any time.
        </p>

        <h2>5. Availability</h2>
        <p>
          This is a thesis/capstone demonstration system. It may be modified or taken offline, and
          data is provided for demonstration purposes.
        </p>

        <Link className="btn outline small" to="/privacy">Read Privacy Policy</Link>
        <Link className="btn ghost small" to="/">Back to home</Link>
      </div>
    </div>
  );
}
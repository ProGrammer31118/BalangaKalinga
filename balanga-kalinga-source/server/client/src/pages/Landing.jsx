import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  { icon: '🧠', title: 'AI Wellness Companion', desc: 'A supportive AI that listens without judgment and helps you make sense of how you feel.' },
  { icon: '💬', title: 'Confidential AI Chat', desc: 'Talk anytime in a private space. Your conversations stay yours.' },
  { icon: '📊', title: 'Wellness Tracking', desc: 'See gentle trends in your mood, energy, and stress over time.' },
  { icon: '🧘', title: 'Self-Care Activities', desc: 'Breathing, grounding, focus timers, and guided resets that actually fit a student schedule.' },
  { icon: '📅', title: 'Counseling Support', desc: 'Find counselors, request appointments, and prepare for sessions with confidence.' },
  { icon: '🚨', title: 'Get Help', desc: 'One tap to hotlines, your guidance office, and trusted people who can help.' },
];

const steps = [
  { icon: '🌱', title: 'Check in', desc: 'Tell us how you feel with a quick, honest mood check or the 10-question wellness check.' },
  { icon: '💬', title: 'Talk it through', desc: 'Chat with Kalinga AI to untangle what is weighing on you, day or night.' },
  { icon: '🧘', title: 'Practice self-care', desc: 'Get personalized activities for the areas that need the most attention.' },
  { icon: '🤝', title: 'Connect when needed', desc: 'Move to human support — counselors, trusted contacts, or crisis lines — the moment it helps.' },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="brand-badge">BK</span>
          <div>
            <strong>Balanga Kalinga</strong>
            <p>AI Wellness for Students</p>
          </div>
        </div>
        <nav>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#support">Support</a>
        </nav>
        <div className="landing-actions">
          <Link className="btn ghost small" to="/login">Sign in</Link>
          <Link className="btn primary small" to="/register">Get started</Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-pill">💙 Student wellness, made human</span>
          <h1>You don't have to handle everything alone.</h1>
          <p>
            An AI-powered student wellness companion designed to help you understand your feelings,
            manage academic stress, and find the support you need.
          </p>
          <div className="hero-buttons">
            <Link className="btn primary" to="/register">Start Wellness Check</Link>
            <Link className="btn outline" to="/register">Talk to Kalinga AI</Link>
          </div>
          <p className="hero-note muted">
            Free for students · Confidential · Not a replacement for professional care
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-card card-1">🧘 <span>Breathing exercise</span></div>
          <div className="art-card card-2">💬 <span>Kalinga AI chat</span></div>
          <div className="art-card card-3">📊 <span>Mood trend</span></div>
          <div className="art-circle">BK</div>
          <div className="art-students">
            <span>🎓</span><span>🎓</span><span>🎓</span>
          </div>
        </div>
      </section>

      <section className="band strip">
        <div className="strip-item"><strong>24/7</strong><span>AI companion</span></div>
        <div className="strip-item"><strong>10</strong><span>question wellness check</span></div>
        <div className="strip-item"><strong>4</strong><span>counselors available</span></div>
        <div className="strip-item"><strong>100%</strong><span>confidential by design</span></div>
      </section>

      <section id="features" className="section">
        <div className="section-head">
          <h2>Everything a student needs to feel steadier</h2>
          <p className="muted">A complete wellness toolkit — from daily check-ins to human support — built around student life.</p>
        </div>
        <div className="feature-grid">
          {features.map((f) => (
            <div className="feature-card" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="section alt">
        <div className="section-head">
          <h2>How Balanga Kalinga helps</h2>
          <p className="muted">A simple flow that starts where you are and connects you to support when you need it.</p>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step" key={s.title}>
              <span className="step-num">{i + 1}</span>
              <span className="step-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="support" className="section cta">
        <div className="cta-card">
          <h2>Feeling overwhelmed right now?</h2>
          <p>
            You are not alone. If you feel you may be in immediate danger, please reach out to a trusted
            person or emergency services right away.
          </p>
          <div className="cta-actions">
            <Link className="btn danger" to="/get-help">Get Help Now</Link>
            <Link className="btn outline-light" to="/register">Start a wellness check</Link>
          </div>
          <p className="cta-hotlines muted">
            NCMH Crisis Hotline <strong>1553</strong> · Hopeline PH <strong>0917-558-4673</strong>
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <strong>Balanga Kalinga</strong>
          <p className="muted">AI-assisted mental wellness support for college students.</p>
        </div>
        <div className="footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Use</Link>
          <Link to="/get-help">Get Help</Link>
        </div>
        <p className="muted note">
          Kalinga AI provides supportive information and is not a replacement for a licensed mental health professional.
        </p>
      </footer>
    </div>
  );
}
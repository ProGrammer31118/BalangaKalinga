import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { emergencyApi } from '../api.js';

export default function GetHelp() {
  const [resources, setResources] = useState([]);
  const [trusted, setTrusted] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kalinga_trusted') || '[]'); } catch { return []; }
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    emergencyApi().resources().then((d) => setResources(d.resources)).catch(() => {});
  }, []);

  const addTrusted = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const next = [...trusted, { id: Date.now(), name: name.trim(), phone: phone.trim() }];
    setTrusted(next);
    localStorage.setItem('kalinga_trusted', JSON.stringify(next));
    setName('');
    setPhone('');
  };

  const removeTrusted = (id) => {
    const next = trusted.filter((t) => t.id !== id);
    setTrusted(next);
    localStorage.setItem('kalinga_trusted', JSON.stringify(next));
  };

  const hotlines = resources.filter((r) => r.category === 'hotline');
  const school = resources.filter((r) => r.category === 'school');
  const community = resources.filter((r) => r.category === 'community' || r.category === 'emergency');

  return (
    <div className="page">
      <header className="page-head">
        <h2>Get Help Now</h2>
        <p className="muted">You are never alone. Help is here whenever you need it.</p>
      </header>

      <section className="card help-primary">
        <h3>If you are in immediate danger</h3>
        <p>
          If you feel that you may be in immediate danger or unable to keep yourself safe, seek immediate
          help from a trusted person, a qualified professional, or your local emergency services.
        </p>
        <div className="help-emergency-actions">
          <a className="btn danger" href="tel:911">Call 911</a>
          <Link className="btn outline" to="/app">Go to dashboard</Link>
        </div>
      </section>

      <div className="grid two">
        <section className="card">
          <h3>📞 Crisis hotlines</h3>
          {hotlines.map((r) => (
            <div className="resource-row" key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <p className="muted">{r.description}</p>
              </div>
              <a className="btn outline small" href={`tel:${r.phone.replace(/\s/g, '')}`}>{r.phone}</a>
            </div>
          ))}
        </section>

        <section className="card">
          <h3>🏫 School counseling office</h3>
          {school.map((r) => (
            <div className="resource-row" key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <p className="muted">{r.description}</p>
              </div>
              <a className="btn outline small" href={`tel:${r.phone.replace(/\s/g, '')}`}>{r.phone}</a>
            </div>
          ))}
          <p className="muted note">You can also request an appointment anytime from the Counseling page.</p>
          <Link className="btn primary small" to="/app/counseling">Request an appointment</Link>
        </section>
      </div>

      <div className="grid two">
        <section className="card">
          <h3>👥 Community & support resources</h3>
          {community.map((r) => (
            <div className="resource-row" key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <p className="muted">{r.description}</p>
              </div>
              <a className="btn outline small" href={`tel:${r.phone.replace(/\s/g, '')}`}>{r.phone}</a>
            </div>
          ))}
        </section>

        <section className="card">
          <h3>🧡 Trusted contacts</h3>
          <p className="muted">
            Save people you trust so they are one tap away in a hard moment. This list stays on your device.
          </p>
          <form className="trusted-form" onSubmit={addTrusted}>
            <input placeholder="Name (e.g. Nanay, best friend)" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="btn primary small" type="submit">Add contact</button>
          </form>
          {trusted.length ? (
            trusted.map((t) => (
              <div className="resource-row" key={t.id}>
                <div>
                  <strong>{t.name}</strong>
                  {t.phone && <p className="muted">{t.phone}</p>}
                </div>
                <div className="row">
                  {t.phone && <a className="btn outline small" href={`tel:${t.phone.replace(/\s/g, '')}`}>Call</a>}
                  <button className="btn ghost small" onClick={() => removeTrusted(t.id)}>Remove</button>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No trusted contacts saved yet.</p>
          )}
        </section>
      </div>

      <section className="card help-note">
        <h3>What to do in an urgent situation</h3>
        <ol className="help-steps">
          <li><strong>Remove yourself from harm</strong> — leave the situation if you can.</li>
          <li><strong>Contact a trusted person</strong> — you do not have to do this alone.</li>
          <li><strong>Call a hotline or your guidance office</strong> — trained people are ready to listen.</li>
          <li><strong>If it is an emergency, call 911</strong> — safety always comes first.</li>
        </ol>
        <p className="muted note">
          This page is available anytime from the phone icon. Bookmark it if it helps to know it is here.
        </p>
      </section>
    </div>
  );
}
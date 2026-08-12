import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { journalApi } from '../api.js';

const MOOD_EMOJI = { great: '😊', good: '🙂', okay: '😐', stressed: '😟', low: '😔', overwhelmed: '😣' };
const DEFAULT_TAGS = ['School', 'Family', 'Friends', 'Relationships', 'Money', 'Future', 'Personal'];

export default function Journal() {
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [view, setView] = useState('list'); // list | calendar
  const [reflection, setReflection] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', mood: 'okay', tags: [], entry_date: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    journalApi(token).list({ q: search, tag: activeTag }).then((d) => {
      setEntries(d.entries);
      setTags(d.tags);
    }).catch((e) => setError(e.message));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token, activeTag]);

  const doReflect = async () => {
    const d = await journalApi(token).reflect();
    setReflection(d.reflection);
  };

  const toggleTag = (t) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t],
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await journalApi(token).update(editing.id, form);
      } else {
        await journalApi(token).create(form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ title: '', content: '', mood: 'okay', tags: [], entry_date: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this journal entry? This cannot be undone.')) return;
    await journalApi(token).remove(id);
    load();
  };

  const startEdit = (entry) => {
    setEditing(entry);
    setForm({
      title: entry.title || '',
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags || [],
      entry_date: entry.entry_date || '',
    });
    setShowForm(true);
  };

  // Calendar grid for current month
  const [calDate, setCalDate] = useState(() => new Date());
  const calendarEntries = useMemo(() => {
    return entries.reduce((acc, e) => {
      const key = (e.entry_date || e.created_at.slice(0, 10));
      acc[key] = acc[key] || [];
      acc[key].push(e);
      return acc;
    }, {});
  }, [entries]);

  const firstDay = new Date(calDate.getFullYear(), calDate.getMonth(), 1);
  const daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate();
  const lead = firstDay.getDay();

  const monthKey = calDate.toISOString().slice(0, 7);

  return (
    <div className="page">
      <header className="page-head row-between">
        <div>
          <h2>📔 Wellness Journal</h2>
          <p className="muted">Your journal is private, password-protected, and never shared.</p>
        </div>
        <div className="row">
          <button className="btn ghost small" onClick={() => setView(view === 'list' ? 'calendar' : 'list')}>
            {view === 'list' ? '📅 Calendar view' : '📄 List view'}
          </button>
          <button className="btn primary small" onClick={() => { setEditing(null); setForm({ title: '', content: '', mood: 'okay', tags: [], entry_date: '' }); setShowForm(true); }}>
            ✏️ New entry
          </button>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}

      <div className="grid two">
        <div>
          {/* AI reflection */}
          <section className="card reflect-card">
            <div className="card-head">
              <h3>✨ Gentle reflection from Kalinga</h3>
            </div>
            {reflection ? (
              <p className="reflect-text">{reflection}</p>
            ) : (
              <p className="muted">
                Let Kalinga gently reflect on your recent entries and notice patterns worth caring for.
              </p>
            )}
            <button className="btn outline small" onClick={doReflect}>
              {reflection ? 'Reflect again' : 'Reflect on my entries'}
            </button>
          </section>

          {/* Filters */}
          <section className="card">
            <h3>Find your entries</h3>
            <input
              placeholder="Search your journal…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
            <div className="tag-filter">
              <button className={'chip' + (!activeTag ? ' active' : '')} onClick={() => setActiveTag('')}>All</button>
              {tags.map((t) => (
                <button key={t} className={'chip' + (activeTag === t ? ' active' : '')} onClick={() => setActiveTag(t)}>
                  {t}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div>
          {showForm && (
            <form className="card entry-form" onSubmit={save}>
              <h3>{editing ? 'Edit entry' : 'New entry'}</h3>
              <input placeholder="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <textarea
                placeholder="How are you feeling? Write freely — this stays between you and your journal."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={5}
                required
              />
              <div className="row two">
                <select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}>
                  {Object.entries(MOOD_EMOJI).map(([k, e]) => <option key={k} value={k}>{e} {k}</option>)}
                </select>
                <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
              </div>
              <div className="tag-picker">
                {DEFAULT_TAGS.map((t) => (
                  <button type="button" key={t} className={'chip' + (form.tags.includes(t) ? ' active' : '')} onClick={() => toggleTag(t)}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="row">
                <button className="btn primary small" disabled={saving || !form.content.trim()}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Save entry'}
                </button>
                <button type="button" className="btn ghost small" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
              </div>
            </form>
          )}

          {view === 'list' ? (
            <section className="card">
              <h3>Your entries ({entries.length})</h3>
              {entries.length ? (
                entries.map((e) => (
                  <div className="journal-item" key={e.id}>
                    <div className="journal-meta">
                      <span className="journal-emoji">{MOOD_EMOJI[e.mood] || '📝'}</span>
                      <div>
                        <strong>{e.title || 'Untitled entry'}</strong>
                        <p className="muted">
                          {(e.entry_date || e.created_at.slice(0, 10))} · {e.tags.join(', ') || 'no tags'}
                        </p>
                      </div>
                    </div>
                    <p className="journal-body">{e.content}</p>
                    <div className="row journal-actions">
                      <button className="btn ghost small" onClick={() => startEdit(e)}>Edit</button>
                      <button className="btn ghost small danger-text" onClick={() => remove(e.id)}>Delete</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">📓</span>
                  <p>No entries match yet. Your journal is a safe place to start.</p>
                </div>
              )}
            </section>
          ) : (
            <section className="card">
              <div className="calendar-head">
                <button className="btn ghost small" onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))}>‹</button>
                <strong>{calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
                <button className="btn ghost small" onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))}>›</button>
              </div>
              <div className="calendar-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span className="cal-dow" key={d}>{d}</span>)}
                {Array.from({ length: lead }).map((_, i) => <span key={'b' + i} className="cal-cell empty" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const key = `${monthKey}-${String(day).padStart(2, '0')}`;
                  const dayEntries = calendarEntries[key] || [];
                  return (
                    <span key={day} className={'cal-cell' + (dayEntries.length ? ' has-entry' : '')} title={dayEntries.map((e) => (e.title || 'entry')).join(', ')}>
                      {day}
                      {dayEntries.length > 0 && <span className="cal-dot" />}
                    </span>
                  );
                })}
              </div>
              <p className="muted note">Dots mark days with journal entries. Click a day from the list to read them.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
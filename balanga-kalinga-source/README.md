# Balanga Kalinga

An AI-powered, student-centered mental wellness support system for college students.
It helps students understand their feelings, manage academic stress, practice self-care,
and connect with human counselors — while making clear that the AI is a supportive first
point of contact, not a replacement for licensed professionals.

## Tech stack

- **Frontend:** React 18 + Vite (single-page app, mobile-first responsive)
- **Backend:** Node.js (Express) with **MySQL/MariaDB** via XAMPP
- **Database:** MySQL (`balanga_kalinga`) — view it anytime in phpMyAdmin
- **Auth:** JWT + bcrypt password hashing, role-based access (student / admin)

## How to run

### 1. Start MySQL (XAMPP)

1. Open the **XAMPP Control Panel** and click **Start** next to **MySQL**.
2. (Optional) open http://localhost/phpmyadmin — the app auto-creates the
   `balanga_kalinga` database and tables on first start, and you can browse/edit
   all data there (tables: `users`, `moods`, `wellness_assessments`,
   `journal_entries`, `appointments`, `counselors`, `notifications`, ...).

### 2. Start the app

```bash
# 1. Install dependencies (run once)
cd client && npm install
cd ../server && npm install

# 2. Start the backend (port 4000) — it connects to MySQL and seeds demo data
cd server
npm start

# 3. In a second terminal, start the frontend (port 5173)
cd client
npm run dev
```

Then open **http://localhost:5173** (dev) or **http://localhost:4000** (served build).

> The server connects to MySQL with XAMPP's defaults (`127.0.0.1`, user `root`,
> empty password). If your setup differs, set env vars:
> `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

### Demo accounts

| Role | Email / ID | Password |
| ---- | ---------- | -------- |
| Student | `alex@balanga.edu.ph` (or student ID `2025-10422`) | `student123` |
| Admin / staff | `admin@kalinga.edu.ph` | `admin123` |

> The demo is pre-seeded with 5 students, mood history, wellness checks, journal entries,
> counselors, appointments, notifications, and emergency resources.

### One-command production build (optional)

```bash
cd server
npm start          # serves the pre-built client/dist automatically
```

Build the frontend first with `cd client && npm run build` if `client/dist` is missing.

### Enable the live AI (real LLM)

By default Kalinga AI runs on the built-in empathetic response engine (no API key needed).
To use a **real large language model**, paste your key into a `.env` file:

1. Copy `server/.env.example` → `server/.env`
2. Add your OpenAI key: `OPENAI_API_KEY=sk-...`
3. Restart the server → the chat now replies with the live model
   (the Kalinga AI page will show "Powered by gpt-4o-mini" instead of "Offline demo mode")

```bash
# server/.env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

Works with any OpenAI-compatible API — set `OPENAI_BASE_URL` + `OPENAI_MODEL` to use
**Groq** (free), **OpenRouter**, **Ollama** (local), or **LM Studio**:

```
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.3-70b-versatile
```

You can also use PowerShell environment variables instead of `.env`:

```powershell
$env:OPENAI_API_KEY = "sk-..."
$env:OPENAI_MODEL  = "gpt-4o-mini"
npm start
```

Important: the live model is always wrapped in the safety policy — crisis language
still triggers hotlines + human-support-first replies, and the AI never diagnoses.

## Project structure

```
server/               Express API + MySQL database
  db.js               connects to MySQL (auto-creates database, tables, demo seed)
  routes_auth.js      register (with consent), login, profile, data deletion
  routes_assessment.js  wellness check (10 areas), moods, AI recommendations
  routes_journal.js   private journal, tags, calendar, AI reflection
  routes_selfcare.js  self-care activity catalog + completion logs
  routes_progress.js  personal wellness trends (charts data)
  routes_counseling.js  counselors + appointment requests/cancel/reschedule
  routes_notifications.js
  routes_admin.js     aggregated analytics, counseling management
  routes_ai.js        Kalinga AI chat engine (crisis detection + safety)
  routes_emergency.js get-help resources
client/               React + Vite frontend
  src/pages/          Landing, Login, Register, Dashboard, Assistant,
                      Assessment, Journal, SelfCare, Progress, Counseling,
                      Notifications, Profile, Admin, GetHelp, Privacy, Terms
```

> Tip: to reset to fresh demo data, run this in phpMyAdmin (SQL tab), then restart the server:
> `DROP DATABASE balanga_kalinga;`
>
> The database auto-recreates and reseeds on next startup.

## Key safety principles

- Kalinga AI never diagnoses, never claims to be a doctor, and never shames.
- Crisis keywords immediately route to a human-support-first response with hotlines.
- Wellness checks produce supportive summaries and suggested actions — never diagnoses.
- Journal entries and AI conversations are private to the student.
- Admins only see anonymous/aggregated trends, never private content.

## Credits

Thesis/capstone demonstration project. Balanga Kalinga — *Kalinga tayo, care together.*

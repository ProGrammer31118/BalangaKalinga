import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// MySQL (XAMPP) connection settings. Override with environment variables,
// otherwise it uses XAMPP's default local root account.
// ---------------------------------------------------------------------------
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'balanga_kalinga';

const VERSION = '3.0.0';

// Small wrapper so every route keeps the familiar API:
//   await db.prepare(sql).get(...)   -> row object  | undefined
//   await db.prepare(sql).all(...)   -> array of rows
//   await db.prepare(sql).run(...)   -> { changes, lastInsertRowid }
function makeAdapter(pool) {
  return {
    prepare(sql) {
      return {
        async get(...params) {
          const [rows] = await pool.execute(sql, params);
          return rows[0];
        },
        async all(...params) {
          const [rows] = await pool.execute(sql, params);
          return rows;
        },
        async run(...params) {
          const [result] = await pool.execute(sql, params);
          return { changes: result.affectedRows, lastInsertRowid: result.insertId };
        },
      };
    },
  };
}

async function init() {
  // 1. Make sure the database exists.
  const bootstrap = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    charset: 'utf8mb4',
  });
  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.end();

  // 2. Connection pool for the real work (dates come back as clean strings,
  //    matching how the app used SQLite's text timestamps).
  //    connectionLimit is kept small so serverless platforms (Vercel) don't
  //    exhaust the MySQL server with warm instances.
  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 5),
    enableKeepAlive: true,
    queueLimit: 20,
    dateStrings: true,
  });

  const db = makeAdapter(pool);

  // 3. Schema. Same tables as before, InnoDB + utf8mb4, cascading deletes.
  await db.prepare(`CREATE TABLE IF NOT EXISTS meta (
    meta_key VARCHAR(60) PRIMARY KEY,
    value VARCHAR(60) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    student_id VARCHAR(40) UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    course VARCHAR(120) DEFAULT '',
    year_level VARCHAR(40) DEFAULT '',
    school VARCHAR(120) DEFAULT '',
    avatar VARCHAR(40) DEFAULT '',
    consent_at DATETIME NULL,
    notif_prefs TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS wellness_assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    answers TEXT NOT NULL,
    areas TEXT NOT NULL,
    overall_level VARCHAR(40) NOT NULL,
    summary TEXT NOT NULL,
    suggested_actions TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wel_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS moods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mood VARCHAR(30) NOT NULL,
    note TEXT DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mood_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS journal_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) DEFAULT '',
    content TEXT NOT NULL,
    mood VARCHAR(30) DEFAULT 'okay',
    tags TEXT NOT NULL DEFAULT '[]',
    entry_date DATE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_jour_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS ai_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) DEFAULT 'Talk with Kalinga AI',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS ai_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    risk VARCHAR(20) DEFAULT 'low',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS self_care_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(60) NOT NULL,
    title VARCHAR(120) NOT NULL,
    emoji VARCHAR(20) DEFAULT '🧘',
    description TEXT NOT NULL,
    instructions TEXT NOT NULL DEFAULT '[]',
    duration_min INT DEFAULT 5,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_id INT NOT NULL,
    status VARCHAR(30) DEFAULT 'completed',
    completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_log_act FOREIGN KEY (activity_id) REFERENCES self_care_activities(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS counselors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    specialization VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    schedule TEXT NOT NULL DEFAULT '[]',
    avatar VARCHAR(20) DEFAULT '',
    color VARCHAR(20) DEFAULT '#4338ca',
    is_available TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    counselor_id INT NOT NULL,
    requested_date DATE NOT NULL,
    requested_time VARCHAR(20) NOT NULL,
    method VARCHAR(30) DEFAULT 'In-person',
    notes TEXT DEFAULT '',
    status VARCHAR(30) DEFAULT 'pending',
    status_note TEXT DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_coun FOREIGN KEY (counselor_id) REFERENCES counselors(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'info',
    link VARCHAR(120) DEFAULT '',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS emergency_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(30) NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).run();

  // 4. Seed demo data when the database is new.
  const existingVersion = await db.prepare('SELECT value FROM meta WHERE meta_key = ?').get('schema_version');
  const userCount = await db.prepare('SELECT COUNT(*) AS c FROM users').get();
  const needsSeed = !existingVersion || existingVersion.value !== VERSION || userCount.c === 0;

  if (needsSeed) await seedDemoData(db);

  await db.prepare(
    `INSERT INTO meta (meta_key, value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`
  ).run('schema_version', VERSION);

  console.log(
    `Connected to MySQL (${DB_HOST}:${DB_PORT}) — database "${DB_NAME}" ready` +
    (needsSeed ? ' · demo data seeded' : ' · existing data kept')
  );

  return db;
}

function nowSql(d = new Date()) {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

async function seedDemoData(db) {
  const adminHash = bcrypt.hashSync('admin123', 10);
  const studentHash = bcrypt.hashSync('student123', 10);

  const insUser = db.prepare(
    `INSERT INTO users (name, email, student_id, password_hash, role, course, year_level, school, avatar, consent_at, notif_prefs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const students = [
    {
      name: 'Alex Rivera', email: 'alex@balanga.edu.ph', sid: '2025-10422',
      pass: studentHash, role: 'student', course: 'BS Computer Science', year: '3rd Year', school: 'Bataan Peninsula State University',
      avatar: '🦉', prefs: '{"appointments":true,"wellness":true,"counselors":true,"activities":true}'
    },
    {
      name: 'Maria Santos', email: 'maria@balanga.edu.ph', sid: '2024-20131',
      pass: studentHash, role: 'student', course: 'BS Nursing', year: '2nd Year', school: 'Bataan Peninsula State University',
      avatar: '🌸', prefs: '{"appointments":true,"wellness":true,"counselors":true,"activities":true}'
    },
    {
      name: 'Juan Dela Cruz', email: 'juan@balanga.edu.ph', sid: '2023-11870',
      pass: studentHash, role: 'student', course: 'BS Accountancy', year: '4th Year', school: 'AMA Balanga',
      avatar: '⚡', prefs: '{"appointments":true,"wellness":true,"counselors":true,"activities":true}'
    },
    {
      name: 'Bella Cruz', email: 'bella@balanga.edu.ph', sid: '2025-30711',
      pass: studentHash, role: 'student', course: 'BS Psychology', year: '1st Year', school: 'Polytechnic University Balanga',
      avatar: '🌿', prefs: '{"appointments":true,"wellness":true,"counselors":true,"activities":true}'
    },
    {
      name: 'Kyle Ramos', email: 'kyle@balanga.edu.ph', sid: '2024-40288',
      pass: studentHash, role: 'student', course: 'BS Information Technology', year: '2nd Year', school: 'Bataan Peninsula State University',
      avatar: '🎧', prefs: '{"appointments":true,"wellness":true,"counselors":true,"activities":true}'
    },
  ];
  for (const s of students) {
    await insUser.run(s.name, s.email, s.sid, s.pass, s.role, s.course, s.year, s.school, s.avatar, nowSql(), s.prefs);
  }
  await insUser.run(
    'Dr. Angela Mendoza', 'counselor@balanga.edu.ph', 'ADM-0001', adminHash, 'admin', '', '', '',
    '🛡️', nowSql(), '{"appointments":true,"wellness":true,"counselors":true,"activities":true}'
  );
  await insUser.run(
    'Admin Balanga', 'admin@kalinga.edu.ph', 'ADM-0002', adminHash, 'admin', '', '', '',
    '🛡️', nowSql(), '{"appointments":true,"wellness":true,"counselors":true,"activities":true}'
  );

  const now = new Date();

  // ---------- Moods: past 14 days for Alex ----------
  const alex = await db.prepare('SELECT id FROM users WHERE email = ?').get('alex@balanga.edu.ph');
  const insMood = db.prepare('INSERT INTO moods (user_id, mood, note, created_at) VALUES (?, ?, ?, ?)');
  const moodSeq = [
    ['stressed', 'Deadlines are piling up.'],
    ['okay', 'Slept a bit better today.'],
    ['good', 'Finished one project.'],
    ['overwhelmed', 'Three projects due at once.'],
    ['stressed', 'Could not focus in class.'],
    ['low', 'Feeling tired of everything.'],
    ['good', 'Talked to a friend.'],
    ['okay', 'Average day.'],
    ['great', 'Good grade on my quiz!'],
    ['stressed', 'Exam week stress.'],
    ['okay', 'Short study session helped.'],
    ['overwhelmed', 'Everything feels like a lot.'],
    ['low', 'Hard to get out of bed.'],
    ['good', 'Self-care activity helped.'],
  ];
  for (let i = 0; i < moodSeq.length; i++) {
    const [mood, note] = moodSeq[i];
    const d = new Date(now);
    d.setDate(d.getDate() - (moodSeq.length - 1 - i));
    d.setHours(8 + (i % 9), (i * 13) % 60, 0, 0);
    await insMood.run(alex.id, mood, note, nowSql(d));
  }

  for (const other of ['maria@balanga.edu.ph', 'juan@balanga.edu.ph', 'bella@balanga.edu.ph', 'kyle@balanga.edu.ph']) {
    const st = await db.prepare('SELECT id FROM users WHERE email = ?').get(other);
    for (let i = 0; i < 10; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(9 + (i % 8), 20, 0, 0);
      const poolArr = ['good', 'okay', 'stressed', 'great'];
      await insMood.run(st.id, poolArr[(i * 2) % poolArr.length], '', nowSql(d));
    }
  }

  // ---------- Wellness assessments for Alex ----------
  const alexId = alex.id;
  const insAssessment = db.prepare(
    `INSERT INTO wellness_assessments (user_id, answers, areas, overall_level, summary, suggested_actions, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const mkAnswers = (pattern) => {
    const base = [2, 1, 2, 1, 2, 1, 2, 1, 2, 1];
    return base.map((v, i) => (i < pattern.length ? pattern[i] : v));
  };
  const recentChecks = [
    {
      pattern: [2, 1, 2, 2, 2, 1, 2, 1, 1, 2],
      overall: 'Needs Attention', areas: ['Academic stress', 'Sleep', 'Workload'],
      summary: 'Your check-in suggests school pressure, sleep, and workload are weighing on you lately. That is common around deadlines — and it is manageable with the right support.',
      actions: ['Try a 10-minute relaxation activity', 'Break large assignments into smaller tasks', 'Consider talking with a counselor if these feelings continue'],
    },
    {
      pattern: [2, 1, 2, 1, 2, 1, 1, 2, 2, 1],
      overall: 'Balanced', areas: ['Sleep', 'Workload'],
      summary: 'Things look fairly balanced, with a couple of areas worth watching. A light self-care routine could keep you steady this week.',
      actions: ['Keep a consistent sleep schedule', 'Use the Pomodoro timer during study blocks', 'Take one short walk each day'],
    },
    {
      pattern: [1, 0, 1, 1, 2, 1, 1, 0, 2, 1],
      overall: 'Doing Well', areas: ['Energy'],
      summary: 'Great to see a strong week. Energy is a small area to keep an eye on — staying hydrated and active helps.',
      actions: ['Keep up healthy routines', 'Stay active', 'Reach out to a friend this week'],
    },
    {
      pattern: [2, 2, 1, 2, 1, 0, 2, 0, 0, 2],
      overall: 'Needs Attention', areas: ['Academic stress', 'Sleep'],
      summary: 'Exam week looks intense. Your answers point to academic pressure and disrupted sleep as the main themes this period.',
      actions: ['Review with short, focused study breaks', 'Wind down without screens 30 minutes before bed', 'Reach out to your guidance office'],
    },
    {
      pattern: [1, 1, 1, 2, 1, 1, 1, 1, 0, 1],
      overall: 'Balanced', areas: ['Anxiety'],
      summary: 'A steady week overall, with mild stress showing up around tests. Your usual routines are clearly helping.',
      actions: ['Practice box breathing before exams', 'Continue your study plan', 'Celebrate the wins, even small ones'],
    },
  ];
  const shortNames = { 'Academic stress': 'Work', 'Sleep': 'Sleep', 'Energy': 'Energy', 'Mood': 'Mood', 'Social connection': 'Connection', 'Anxiety / Stress': 'Anxiety', 'Motivation': 'Motivation', 'Workload': 'Workload', 'Emotional well-being': 'Emotions', 'Coping': 'Coping' };
  for (let i = 0; i < recentChecks.length; i++) {
    const c = recentChecks[i];
    const d = new Date(now);
    d.setDate(d.getDate() - (recentChecks.length - 1 - i) * 3);
    d.setDate(d.getDate() - 2);
    const weak = (c.areas || []).map((a) => shortNames[a] || a);
    await insAssessment.run(
      alexId, JSON.stringify(mkAnswers(c.pattern)),
      JSON.stringify({ areas: c.areas, weakAreas: weak, lowHighlight: [], overall: c.overall }),
      c.overall, c.summary, JSON.stringify(c.actions),
      nowSql(d)
    );
  }

  const otherPools = [
    { level: 'Balanced', weak: ['Sleep', 'Workload'] },
    { level: 'Needs Attention', weak: ['Anxiety', 'Work'] },
    { level: 'Doing Well', weak: [] },
  ];
  for (const other of ['maria@balanga.edu.ph', 'juan@balanga.edu.ph', 'bella@balanga.edu.ph', 'kyle@balanga.edu.ph']) {
    const st = await db.prepare('SELECT id FROM users WHERE email = ?').get(other);
    for (let i = 0; i < 3; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (5 - i) * 2);
      const p = otherPools[i % otherPools.length];
      const areas = p.weak.map((a) => a === 'Work' ? 'Academic stress' : a === 'Anxiety' ? 'Anxiety / Stress' : a);
      await insAssessment.run(
        st.id, JSON.stringify(mkAnswers([])),
        JSON.stringify({ areas: ['Academic stress', 'Sleep', 'Workload'], weakAreas: p.weak, lowHighlight: [], overall: p.level }),
        p.level, 'Demo assessment record.', JSON.stringify(['Keep a steady routine']),
        nowSql(d)
      );
    }
  }

  // ---------- Journal entries for Alex ----------
  const insJournal = db.prepare(
    `INSERT INTO journal_entries (user_id, title, content, mood, tags, entry_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const entries = [
    {
      title: 'Before the big deadline', mood: 'stressed',
      content: 'Today I felt really stressed. Three projects are due and I keep worrying that I will not finish them on time. I think I need to break them into smaller pieces instead of staring at the whole mountain.',
      tags: ['School'], daysAgo: 6,
    },
    {
      title: 'A small win', mood: 'good',
      content: 'Submitteed one of the projects today! It was scary but I did it. My groupmate said thanks. Maybe I can do this after all.',
      tags: ['School', 'Friends'], daysAgo: 4,
    },
    {
      title: 'Hard to focus', mood: 'overwhelmed',
      content: 'Could not concentrate on anything in class. My mind kept going to all the deadlines. I did a 5 minute breathing exercise before sleeping and it helped a little.',
      tags: ['School'], daysAgo: 3,
    },
    {
      title: 'Night thoughts', mood: 'low',
      content: 'Lying in bed thinking about whether I am good enough. I know these thoughts are not always true, but they feel so heavy tonight. I want to talk to someone about it.',
      tags: ['Personal', 'Future'], daysAgo: 2,
    },
    {
      title: 'Talking to my friend helped', mood: 'good',
      content: 'I finally told Maya how I have been feeling. She listened without judging. It felt lighter after. I am going to try the study planner again tomorrow.',
      tags: ['Friends', 'Personal'], daysAgo: 1,
    },
  ];
  for (const e of entries) {
    const d = new Date(now);
    d.setDate(d.getDate() - e.daysAgo);
    const iso = nowSql(d);
    const dateStr = iso.slice(0, 10);
    await insJournal.run(alexId, e.title, e.content, e.mood, JSON.stringify(e.tags), dateStr, iso);
  }
  for (const other of ['maria@balanga.edu.ph', 'kyle@balanga.edu.ph']) {
    const st = await db.prepare('SELECT id FROM users WHERE email = ?').get(other);
    await insJournal.run(st.id, 'One entry a day', 'Just checking in with myself.', 'okay', JSON.stringify(['Personal']), nowSql(now).slice(0, 10), nowSql(now));
  }

  // ---------- AI conversation for Alex ----------
  const insConv = db.prepare('INSERT INTO ai_conversations (user_id, title) VALUES (?, ?)');
  const conv = await insConv.run(alexId, 'Debrief about my week');
  const convId = conv.lastInsertRowid;
  const insMsg = db.prepare('INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)');
  await insMsg.run(convId, 'assistant', 'Hi Alex! I am Kalinga AI, your wellness companion. You mentioned deadlines were heavy this week — how did it go?');
  await insMsg.run(convId, 'user', 'I got one project done, but I am still nervous about the next one.');
  await insMsg.run(convId, 'assistant', 'That is a real achievement — finishing one is huge. For the next one, what is the very first small step you can take, even just for five minutes?');

  // ---------- Self-care activities catalog ----------
  const insActivity = db.prepare(
    `INSERT INTO self_care_activities (category, title, emoji, description, instructions, duration_min) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const activities = [
    ['Stress Relief', 'Breathe & Reset', '🌬️', 'A guided 4-7-8 breathing exercise to calm your nervous system in minutes.',
      '["Sit comfortably and close your eyes", "Inhale gently through your nose for 4 counts", "Hold your breath for 7 counts", "Exhale slowly through your mouth for 8 counts", "Repeat 4 cycles and notice how your body softens"]', 5],
    ['Stress Relief', '5-4-3-2-1 Grounding', '🧭', 'A quick grounding technique that returns your attention to the present moment.',
      '["Look around and name 5 things you can see", "Touch 4 things you can feel", "Listen for 3 sounds you can hear", "Recognize 2 things you can smell", "Notice 1 taste in your mouth", "Take one slow, deep breath"]', 5],
    ['Stress Relief', 'Progressive Relaxation', '🪶', 'Slowly release tension from your body, from head to toes.',
      '["Get comfortable and breathe normally", "Tense your shoulders for 5 seconds, then release", "Tense your fists, then release", "Tense your legs, then release", "Scan your body and let each muscle soften"]', 8],
    ['Academic Burnout', 'Pomodoro Focus', '🍅', 'The classic 25-5 split to beat procrastination and protect your attention.',
      '["Choose one task and set a 25-minute timer", "Work only on that task until the timer rings", "Take a 5-minute break away from the screen", "Repeat 4 rounds, then take a longer 15-minute break"]', 25],
    ['Academic Burnout', 'Study Break Timer', '⏳', 'Guided micro-breaks so your brain can recharge between study blocks.',
      '["Every 25-50 minutes of study, take a 5-10 minute break", "During the break, stretch, walk, or hydrate", "Avoid scrolling social media during breaks", "Return to your desk and start a new block"]', 10],
    ['Academic Burnout', 'Task Prioritizer', '🗂️', 'Sort your assignments so the most important work gets your freshest energy.',
      '["List every task you can think of", "Mark tasks that are due soon and matter most as high priority", "Order them from hardest to easiest", "Schedule one small deadline for each", "Start with only the top task"]', 10],
    ['Academic Burnout', 'Workload Planner', '📅', 'Turn a scary pile of tasks into a doable weekly plan.',
      '["Write down everything due this week", "Estimate how long each will take", "Spread them across the week, one main task per block", "Add buffer time for rest and surprises", "Review and adjust your plan each morning"]', 10],
    ['Emotional Wellness', 'Gentle Reflection', '🌙', 'A guided prompt that helps you untangle how you are actually feeling.',
      '["Find a quiet space", "Ask yourself: what am I feeling right now?", "Name the emotion without judging it", "Ask what may have triggered it today", "Write two lines in your journal about it"]', 7],
    ['Emotional Wellness', 'Gratitude Check', '✨', 'Notice the small good things — even on heavy days.',
      '["Think of 3 things you are grateful for today", "They can be very small, like a warm meal", "Say them out loud or write them down", "Let yourself feel the appreciation for a moment"]', 4],
    ['Emotional Wellness', 'Journaling Prompts', '📓', 'A starting line for your journal when you do not know what to write.',
      '["Finish the sentence: Right now I feel...", "What has been on my mind lately?", "What do I need a little more of this week?", "What is one thing I did today that I can be proud of?", "Write for 3 minutes without stopping"]', 5],
    ['Sleep', 'Night Wind-Down', '🛏️', 'A calming pre-sleep routine that signals your brain it is time to rest.',
      '["Dim the lights 30 minutes before bed", "Put your phone away or turn it off", "Do slow breathing or a short stretch", "Write tomorrow’s top 3 tasks to clear your mind", "Climb into bed with relaxed shoulders and breathe"]', 10],
    ['Sleep', 'Sleep Prep Checklist', '✅', 'A simple checklist to make falling asleep easier.',
      '["Set a consistent sleep and wake time", "Avoid caffeine after 2 PM", "Keep your room cool and dark", "Do something relaxing before bed", "If you cannot sleep, get up and read softly rather than scrolling"]', 5],
  ];
  for (const a of activities) {
    await insActivity.run(...a);
  }

  // ---------- Activity logs for Alex ----------
  const alexActivities = await db.prepare('SELECT id, title FROM self_care_activities WHERE title IN (?, ?, ?)').all('Breathe & Reset', 'Pomodoro Focus', 'Gratitude Check');
  const insLog = db.prepare('INSERT INTO activity_logs (user_id, activity_id, status, completed_at) VALUES (?, ?, ?, ?)');
  for (let i = 0; i < alexActivities.length; i++) {
    const act = alexActivities[i];
    const d = new Date(now);
    d.setDate(d.getDate() - i * 2);
    d.setHours(20, 15, 0, 0);
    await insLog.run(alexId, act.id, 'completed', nowSql(d));
  }

  // ---------- Counselors ----------
  const insCounselor = db.prepare(
    `INSERT INTO counselors (name, specialization, description, schedule, avatar, color, is_available) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  await insCounselor.run(
    'Angela Mendoza', 'Academic & Career Counseling',
    'Helps students manage academic pressure, workload, and career decisions. Friendly, practical, and solutions-focused.',
    '["Mon 9:00-12:00","Mon 14:00-17:00","Wed 9:00-12:00","Fri 13:00-16:00"]', '🦋', '#4338ca', 1
  );
  await insCounselor.run(
    'Ramon Torres', 'Anxiety & Stress Management',
    'Guides students through stress, worry, and burnout using gentle, evidence-based coping techniques.',
    '["Tue 10:00-13:00","Thu 10:00-13:00","Fri 9:00-12:00"]', '🌻', '#0d9488', 1
  );
  await insCounselor.run(
    'Liza Fernandez', 'Emotional & Personal Support',
    'Creates a safe, judgment-free space for relationships, self-esteem, family, and personal challenges.',
    '["Mon 13:00-16:00","Wed 13:00-16:00","Thu 14:00-17:00"]', '🌸', '#db2777', 1
  );
  await insCounselor.run(
    'Marco Reyes', 'Study Skills & Motivation',
    'Helps students rebuild motivation, organize their studies, and get back on track with their goals.',
    '["Tue 9:00-12:00","Thu 9:00-12:00","Sat 9:00-11:00"]', '⚡', '#ca8a04', 1
  );

  // ---------- Appointments ----------
  const insAppt = db.prepare(
    `INSERT INTO appointments (user_id, counselor_id, requested_date, requested_time, method, notes, status, status_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const angela = await db.prepare('SELECT id FROM counselors WHERE name = ?').get('Angela Mendoza');
  const rmon = await db.prepare('SELECT id FROM counselors WHERE name = ?').get('Ramon Torres');
  const in3 = new Date(now); in3.setDate(in3.getDate() + 3);
  const in5 = new Date(now); in5.setDate(in5.getDate() + 5);
  await insAppt.run(alexId, angela.id, in3.toISOString().slice(0, 10), '14:00', 'In-person', 'Worried about my workload after my three projects.', 'approved', 'Confirmed with Guidance Office');
  await insAppt.run(alexId, rmon.id, in5.toISOString().slice(0, 10), '10:00', 'Video call', 'Would like help with exam anxiety.', 'pending', 'Awaiting counselor confirmation');
  const maria = await db.prepare('SELECT id FROM users WHERE email = ?').get('maria@balanga.edu.ph');
  await insAppt.run(maria.id, angela.id, in3.toISOString().slice(0, 10), '09:00', 'In-person', 'Career path check-in.', 'approved', '');
  const juan = await db.prepare('SELECT id FROM users WHERE email = ?').get('juan@balanga.edu.ph');
  await insAppt.run(juan.id, angela.id, in5.toISOString().slice(0, 10), '11:00', 'In-person', 'Schedule adjustment.', 'pending', '');

  // ---------- Notifications ----------
  const insNotif = db.prepare(
    'INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const notifs = [
    ['Appointment approved', 'Your counseling appointment with Dr. Angela Mendoza has been confirmed for ' + in3.toISOString().slice(0, 10) + ' at 14:00. See you there!', 'success', '/app/counseling', 0],
    ['Wellness check reminder', 'It has been a few days since your last wellness check. A quick 2-minute check-in helps you notice patterns early.', 'reminder', '/app/wellness', 0],
    ['New counselor availability', 'Marco Reyes now has added Saturday morning slots. You can request an appointment any time.', 'info', '/app/counseling', 1],
    ['Self-care suggestion', 'Your journal mentioned school pressure twice this week. Try the 10-minute Stress Reset when you have a quiet moment.', 'info', '/app/selfcare', 1],
    ['Welcome to Balanga Kalinga', 'Hi Alex! Your wellness companion is ready. Take your first check-in or talk to Kalinga AI whenever you need.', 'info', '/app', 1],
  ];
  for (let i = 0; i < notifs.length; i++) {
    const [title, message, type, link, read] = notifs[i];
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    await insNotif.run(alexId, title, message, type, link, read, nowSql(d));
  }
  for (const other of ['maria@balanga.edu.ph', 'juan@balanga.edu.ph']) {
    const st = await db.prepare('SELECT id FROM users WHERE email = ?').get(other);
    await insNotif.run(st.id, 'Wellness check reminder', 'A quick check-in keeps your wellness trends up to date.', 'reminder', '/app/wellness', 0, nowSql(now));
  }

  // ---------- Emergency resources ----------
  await db.prepare('DELETE FROM emergency_resources').run();
  const insEmerg = db.prepare(
    'INSERT INTO emergency_resources (name, phone, description, category, is_primary) VALUES (?, ?, ?, ?, ?)'
  );
  await insEmerg.run('NCMH Crisis Hotline', '1553', 'National Center for Mental Health — 24/7 crisis support and counseling.', 'hotline', 1);
  await insEmerg.run('Hopeline PH', '0917-558-4673', 'Text-based emotional support and suicide prevention hotline.', 'hotline', 1);
  await insEmerg.run('Tawag Paglaum Centro Bisaya', '0939-936-5437', 'Peer support line for emotional and psychological help.', 'hotline', 0);
  await insEmerg.run('Balanga Guidance Office', '+63 47 237 0000', 'School counseling office at Bataan Peninsula State University. Open weekdays, 8 AM - 5 PM. Walk-ins welcome for urgent concerns.', 'school', 1);
  await insEmerg.run('City Social Welfare & Development', '+63 47 237 1111', 'Balanga City social services for support and referrals.', 'community', 0);
  await insEmerg.run('Emergency (Police / Medical)', '911 / 112', 'For immediate threats to safety, call emergency services right away.', 'emergency', 1);
}

let db;
try {
  db = await init();
} catch (err) {
  console.error('\n[Balanga Kalinga] Could not connect to MySQL.\n');
  console.error('Local: make sure XAMPP MySQL (MariaDB) is running (start "mysql" in the XAMPP Control Panel).');
  console.error('Vercel: set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME to point at a hosted MySQL database.\n');
  console.error('Error details:', err.code || err.message, '\n');
  throw err;
}

export default db;
# Balanga Kalinga — Next.js port (of `balanga-kalinga-php`)

HTML + React + CSS + Next.js (App Router) replacement for every `.php` file, using the **same MySQL database** (`balanga_kalinga_php` by default).

## PHP → Next.js mapping

| PHP | Next.js |
|---|---|
| `includes/config.php`, `includes/db_init.php` | `lib/db.js` + `lib/auth.js` |
| `includes/ai_engine.php` | `lib/ai.js` |
| `includes/header.php`, `includes/footer.php`, `assets/style.css` | `components/Navbar.jsx`, `app/layout.jsx`, `app/globals.css` |
| `index.php` | `app/page.jsx` |
| `login.php` | `app/login/page.jsx` |
| `register.php` | `app/register/page.jsx` |
| `admin-login.php` | `app/admin-login/page.jsx` |
| `dashboard.php` | `app/dashboard/page.jsx` |
| `wellness.php` | `app/wellness/page.jsx` |
| `ai-chat.php` | `app/ai-chat/page.jsx` + `app/ai-chat/AiChatClient.jsx` |
| `counseling.php` | `app/counseling/page.jsx` |
| `profile.php` | `app/profile/page.jsx` |
| `admin.php` | `app/admin/page.jsx` |
| `logout.php` | `app/api/auth/logout/route.js` |
| `api/ai.php` | `app/api/ai/route.js` |

Auth: PHP `$_SESSION['user_id']` → signed JWT in httpOnly cookie `bk_session`.
Passwords: PHP `password_hash()` (`$2y$` bcrypt) verified via `bcryptjs` with `$2y$`→`$2a$` normalization, so **existing users keep working**.

## Setup (same current database)

1. Start MySQL/XAMPP. The app auto-creates `balanga_kalinga_php` + tables if missing, and never drops data.
   To preload the original demo data: import `../balanga-kalinga-php/database.sql` (or `../balanga_kalinga_php.sql`) in phpMyAdmin.
2. Copy `.env.local` and adjust `DB_*` if needed. `DB_NAME` must stay `balanga_kalinga_php` to use the current database.
3. Install + run:

```powershell
npm install
npm run dev   # http://localhost:3000
```

Demo logins (same as PHP): student `alex@balanga.edu.ph / student123`, admin `admin@kalinga.edu.ph / admin123`.

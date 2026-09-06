# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartAssess is a weekly aptitude assessment & analytics platform (final-year project). It's a monorepo of three **independently run** apps plus a database folder — there is no root `package.json`; each app has its own `node_modules` and is started from its own directory.

```
smart-assess/
├── database/            → schema.sql (Supabase/Postgres) + Excel upload template
├── backend/             → Node.js + Express + Supabase (REST API, JWT auth)
├── faculty-dashboard/    → React + Vite + Tailwind — serves BOTH faculty AND student web portals
└── student-app/         → React Native + Expo (Android student mobile app)
```

There is no git repository initialized in this folder, no linter, and no test suite in any of the three apps.

## Commands

**Backend** (`cd backend`):
```bash
npm install
npm run dev        # nodemon, auto-restart — use this during development
npm start          # plain node
```
Requires `.env` (copy from `.env.example`): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `PORT`, `EMAIL_USER`, `EMAIL_APP_PASSWORD` (Gmail App Password, for OTP password-reset emails).

**Faculty/Student web dashboard** (`cd faculty-dashboard`):
```bash
npm install
npm run dev        # Vite dev server → http://localhost:5173
npm run build
npm run preview
```
Talks to the backend at `VITE_API_URL` env var, defaulting to `http://localhost:5000/api`.

**Student mobile app** (`cd student-app`):
```bash
npm install
npx expo start
```
`api/client.js` has a **hardcoded `BASE_URL`** (LAN IP, not `localhost`, since Expo Go on a phone can't reach your machine's localhost) — must be manually edited to match whatever machine/deployment you're testing against.

**Database**: `database/schema.sql` is run manually in the Supabase SQL Editor. There are no migration files — see "Schema drift" below before trusting it as ground truth.

There are no automated tests, lint scripts, or CI in this repo. Verify changes by running the relevant app and exercising the flow manually (or ask the user to).

## Architecture

### Auth & multi-tenancy model
- Two independent principal types share one `verifyToken` middleware ([backend/middleware/auth.js](backend/middleware/auth.js)): **faculty** and **student**, distinguished by `role` inside the JWT payload (`{ id, role, department_id, is_admin }`). Route guards are composed as middleware chains: `verifyToken` + one of `facultyOnly` / `studentOnly` / `adminOnly`.
- `is_admin` on a faculty row means "super admin" — can see/manage across **all** departments; regular faculty are scoped to their own `department_id`. This distinction shows up as an `if (req.user.is_admin) {...}` branch in most list/query endpoints (e.g. [backend/routes/assessments.js](backend/routes/assessments.js), [backend/routes/students.js](backend/routes/students.js)).
- Every core table (`faculty`, `students`, `assessments`) carries a `department_id`. Callers pass a human-readable `department_code` (e.g. `"BCA"`); a `resolveDepartmentId()` helper (duplicated near-identically in `routes/auth.js`, `routes/assessments.js`, `routes/students.js`, `routes/faculty.js`) resolves it to the internal UUID via a case-insensitive lookup. When adding a new department-scoped endpoint, follow this same pattern rather than requiring callers to know UUIDs.
- The faculty-dashboard is one React app serving **two separate login/token spaces** on the same origin: `faculty_token`/`faculty_is_admin` vs `student_token` in `localStorage`, via two separate axios instances ([src/api/client.js](faculty-dashboard/src/api/client.js) and [src/api/studentClient.js](faculty-dashboard/src/api/studentClient.js)). Route guards in [src/App.jsx](faculty-dashboard/src/App.jsx) (`FacultyPrivateRoute`, `AdminPrivateRoute`, `StudentPrivateRoute`) check these independently, so a browser can be logged into both a faculty and a student session at once.
- There is intentionally **no public faculty signup**. Faculty accounts can only be created by an admin faculty via `POST /api/faculty` ([backend/routes/faculty.js](backend/routes/faculty.js)). The very first admin account must be seeded directly (e.g. a one-off script/SQL), not through the API.

### Assessment lifecycle (the core domain flow)
1. Faculty creates an assessment (`POST /api/assessments`) scoped to a department.
2. Faculty bulk-uploads questions via an Excel file (`POST /api/questions/upload/:assessmentId`, using `multer` + `xlsx`, case-insensitive column matching for `Question/OptionA-D/CorrectOption/Marks`). Re-uploading without `?replace=true` is blocked (409) if questions already exist — this is a deliberate guard against duplicate uploads from double-clicks; `?replace=true` deletes existing questions + their responses/results first.
3. Students can only open an assessment once its `scheduled_date` has passed — enforced server-side in `GET /api/assessments/:id`, not just hidden in the UI, so it can't be bypassed.
4. `POST /api/results/submit` ([backend/routes/results.js](backend/routes/results.js)) auto-scores against `questions.correct_option`, optionally applies negative marking, and handles **reattempts**: each assessment has `reattempt_enabled`/`max_reattempts`; a `results` row tracks `attempts_used` and `locked_final`. Once attempts are exhausted (or the student explicitly finalizes via `POST /api/results/finalize/:assessmentId`, e.g. by choosing "View Solutions" instead of reattempting), `locked_final` is set and re-entry is blocked — this is what stops the browser Back button from letting a student sneak back into a completed/expired assessment.
5. After every submit, `recalculateRanks()` re-ranks **all** students for that assessment using standard competition ranking (ties share a rank). This re-ranks the whole assessment on every single submission — acceptable at class-sized scale but not written to scale further; keep that in mind before reusing this pattern elsewhere.
6. Students are never sent `correct_option` before submitting (the `questions` select explicitly narrows columns for `role === 'student'` in a couple of places) — when adding new question fields, check whether they need the same student/faculty column split.

### Schema drift (important gotcha)
[database/schema.sql](database/schema.sql) is the *original* schema and is **out of date** relative to what the backend actually reads/writes. Code references several columns/tables not present in that file, e.g. `assessments.negative_marking`, `negative_mark_value`, `reattempt_enabled`, `max_reattempts`; `results.attempts_used`, `locked_final`; `students.reset_otp`, `reset_otp_expiry` (also on `faculty`). These were evidently added directly in Supabase over time without updating `schema.sql`. **Don't treat `schema.sql` as ground truth for the current DB shape** — if you need to know the real columns for a table, check how the routes read/write it, or ask the user to paste the live schema. If you add a new column via Supabase, also update `schema.sql` to keep drift from growing.

### Password reset (OTP flow)
Both student and faculty forgot-password flows follow the same shape: generate a 6-digit OTP + 10-minute expiry, store it on the row (`reset_otp`/`reset_otp_expiry`), email it via [backend/utils/mailer.js](backend/utils/mailer.js) (Gmail SMTP via `nodemailer`), then a second endpoint validates the OTP and expiry before allowing a password change. Masked-email responses (`g***j@gmail.com`) avoid leaking the full address back to the client.

### Excel bulk upload pattern
Three endpoints reuse the same shape (`multer` memory storage → `xlsx.read` → `sheet_to_json` → per-row validation with case-insensitive column name fallbacks → collect `added`/`skipped` with reasons): question upload ([backend/routes/questions.js](backend/routes/questions.js)), student bulk-add, and faculty bulk-add ([backend/routes/students.js](backend/routes/students.js), [backend/routes/faculty.js](backend/routes/faculty.js)). Follow this same added/skipped-with-reason response shape if adding another bulk-import endpoint.

### Supabase access
The backend always uses the Supabase **service role** key ([backend/supabaseClient.js](backend/supabaseClient.js)), never the anon key — it does its own bcrypt+JWT auth and needs unrestricted table access. This means Supabase Row Level Security is not the enforcement point; all authorization happens in Express middleware (`verifyToken`/`facultyOnly`/`studentOnly`/`adminOnly`) and hand-written `department_id` filters in each route. The service key must never be exposed to either frontend.

# SmartAssess — Weekly Aptitude Assessment & Analytics Platform

Final year project: Android app (student side) + Web dashboard (faculty side) + Node.js backend + Supabase database.

## Project Structure
```
smart-assess/
├── database/
│   ├── schema.sql                    → Run this in Supabase SQL Editor
│   └── question_upload_template.xlsx → Sample Excel for faculty question upload
├── backend/                          → Node.js + Express + Supabase API
├── faculty-dashboard/                → React + Vite + Tailwind (web app for faculty)
└── student-app/                      → React Native + Expo (mobile app for students)
```

---

## STEP 1: Set up Supabase (Database)

1. Go to https://supabase.com → Sign in with GitHub → **New Project**
2. Set a project name (e.g. `smart-assess`) and a strong database password (save it somewhere)
3. Wait ~2 minutes for the project to provision
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. Copy the entire contents of `database/schema.sql` → paste → click **Run**
6. Go to **Project Settings → API**. Note down:
   - `Project URL` (looks like `https://xxxx.supabase.co`)
   - `service_role` key (under "Project API keys" — NOT the anon key)

---

## STEP 2: Run the Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:
```
SUPABASE_URL=<your project URL>
SUPABASE_SERVICE_KEY=<your service_role key>
JWT_SECRET=<any long random string, e.g. run: openssl rand -hex 32>
PORT=5000
```

Then start it:
```bash
npm run dev
```

You should see: `SmartAssess backend running on http://localhost:5000`

Test it in browser: open `http://localhost:5000` → should show `{"message":"SmartAssess API is running 🚀"}`

---

## STEP 3: Run the Faculty Web Dashboard

```bash
cd faculty-dashboard
npm install
npm run dev
```

Opens at `http://localhost:5173`

**Before logging in**, you need at least one faculty account. Since there's no signup UI yet (keeps it simple/secure), create one via a quick API call:

```bash
curl -X POST http://localhost:5000/api/auth/faculty/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Name","email":"you@srmist.edu.in","password":"test1234","is_admin":true}'
```

Then log in on the dashboard with that email/password.

To create an assessment, you'll need a `department_id`. Get it by running this in Supabase SQL Editor:
```sql
select * from departments;
```
Copy the `id` (UUID) of the seeded department and paste it into the "Department ID" field when creating an assessment.

---

## STEP 4: Run the Student Mobile App

```bash
cd student-app
npm install
```

**Important:** Open `api/client.js` and change `BASE_URL` to your computer's local IP address (not `localhost`), because your phone and computer are different devices on the network.

Find your IP:
- Windows: `ipconfig` → look for IPv4 Address
- Mac/Linux: `ifconfig` → look for inet

Example: `const BASE_URL = 'http://192.168.1.42:5000/api';`

Then start Expo:
```bash
npx expo start
```

Scan the QR code with the **Expo Go** app (install from Play Store) on your Android phone. Make sure your phone and laptop are on the **same WiFi network**.

---

## STEP 5: Try the Full Flow

1. On the faculty dashboard → Create Assessment → fill title, department ID, date, duration
2. Upload the `database/question_upload_template.xlsx` file (or your own, same column format)
3. On the mobile app → Register a student account (use the same department ID)
4. Login → see the assessment in the list → attempt it → auto-scored instantly
5. Back on the faculty dashboard → click the assessment → see analytics + leaderboard update live

---

## Deployment (for final submission / Play Store)

| Component | Where to deploy | Notes |
|---|---|---|
| Backend | Railway or Render (free tier) | Push `backend/` folder as its own repo |
| Faculty Dashboard | Vercel | Same workflow you already use for your portfolio |
| Student App | `eas build -p android` (Expo Application Services) | Generates a real `.apk` / `.aab` for Play Store |

Once backend is deployed, update:
- `faculty-dashboard/src/api/client.js` → set `VITE_API_URL` env var to your deployed backend URL
- `student-app/api/client.js` → set `BASE_URL` to your deployed backend URL

---

## Extending to Other Departments (as your sir suggested)

The schema already supports this — every table has `department_id`. To add a new department:
```sql
insert into departments (name, code) values ('Computer Science', 'CSE');
```
Faculty from that department register with that `department_id`, and students see only their department's assessments automatically. A `super admin` faculty (`is_admin: true`) can view across all departments.

---

## Excel Upload Format (for faculty)

| Question | OptionA | OptionB | OptionC | OptionD | CorrectOption | Marks |
|---|---|---|---|---|---|---|
| What is 2+2? | 3 | 4 | 5 | 6 | B | 1 |

Column names must match exactly (case-insensitive). See `database/question_upload_template.xlsx` for a ready example.

---

## Suggested Project Report Sections (for final year submission)
1. Abstract
2. Existing System vs Proposed System
3. System Architecture Diagram (Mobile App ↔ Backend API ↔ Supabase DB ↔ Web Dashboard)
4. ER Diagram (from `schema.sql`)
5. Module Description (Faculty, Student, Admin)
6. Technology Stack Justification
7. Screenshots
8. Testing (unit + user acceptance)
9. Future Scope (push notifications, AI-based difficulty analysis, negative marking, proctoring)
10. Conclusion

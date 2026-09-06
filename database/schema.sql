-- ============================================
-- SMART ASSESS - Database Schema (Supabase / PostgreSQL)
-- Run this in Supabase SQL Editor
-- ============================================

-- Departments (for multi-department extension)
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique, -- e.g. 'BCA', 'CSE', 'ECE'
  created_at timestamptz default now()
);

-- Faculty
create table faculty (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  department_id uuid references departments(id),
  is_admin boolean default false, -- super admin = manage all departments
  created_at timestamptz default now()
);

-- Students
create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  register_no text not null unique,
  email text,
  password_hash text not null,
  department_id uuid references departments(id),
  batch text, -- e.g. '2024-2027'
  created_at timestamptz default now()
);

-- Assessments (created by faculty)
create table assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  department_id uuid references departments(id),
  created_by uuid references faculty(id),
  scheduled_date timestamptz not null,
  duration_minutes int not null default 30,
  total_marks int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Questions (bulk-inserted from Excel upload)
create table questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A','B','C','D')),
  marks int default 1,
  question_order int default 0
);

-- Student responses per question
create table responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  assessment_id uuid references assessments(id),
  question_id uuid references questions(id),
  selected_option char(1) check (selected_option in ('A','B','C','D')),   
  is_correct boolean,
  answered_at timestamptz default now(),
  unique(student_id, question_id)
);

-- Final results per student per assessment
create table results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  assessment_id uuid references assessments(id),
  score int not null default 0,
  total_marks int not null default 0,
  correct_count int default 0,
  wrong_count int default 0,
  rank int,
  submitted_at timestamptz default now(),
  unique(student_id, assessment_id)
);

-- Messages (faculty <-> admin thread; one thread per non-admin faculty member)
create table messages (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculty(id) on delete cascade, -- which faculty's thread this belongs to
  sender_id uuid not null references faculty(id) on delete cascade,
  sender_is_admin boolean not null default false,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_questions_assessment on questions(assessment_id);
create index idx_responses_student on responses(student_id);
create index idx_responses_assessment on responses(assessment_id);
create index idx_results_assessment on results(assessment_id);
create index idx_students_dept on students(department_id);
create index idx_messages_faculty on messages(faculty_id);

-- Seed a default department so you can start immediately
insert into departments (name, code) values ('BCA - Data Analytics', 'BCA');

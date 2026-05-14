# Pulse — The Operating System for Overwhelmed Students

Pulse is an AI-powered student productivity app that turns deadlines, syllabi, and focus sessions into an intelligent, adaptive weekly schedule. Built with Next.js 16, Supabase, and Gemini AI.

## Features

- **AI Intake** — paste a syllabus or upload a PDF; Gemini extracts every deadline automatically
- **Adaptive Schedule** — AI generates a realistic weekly study schedule based on your tasks, peak hours, and sleep goal
- **Task Manager** — full CRUD task list with priority, difficulty, and deadline tracking
- **Focus Timer** — Pomodoro and free-timer modes; sessions logged to Supabase
- **Analytics** — 12-week workload heatmap, completion rate trends, burnout indicator with Gemini insight
- **Command Palette** — `Cmd+K` global search and navigation

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Animation | Framer Motion |
| Database / Auth | Supabase (PostgreSQL + Google OAuth) |
| AI | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| State | Zustand |
| Charts | Recharts |
| Drag & Drop | @dnd-kit/core |
| Toasts | Sonner |

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Google AI Studio](https://aistudio.google.com) account for the Gemini API key
- A Google Cloud project with OAuth 2.0 credentials (for sign-in)

---

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/pulse-app.git
cd pulse-app
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema below
3. Go to **Authentication → Providers → Google** and enable it with your Google OAuth credentials
4. Go to **Authentication → URL Configuration** and add your redirect URLs:
   - `http://localhost:3000/auth/callback` (local dev)
   - `https://your-domain.vercel.app/auth/callback` (production)

### 3. Database schema

Run this in the Supabase SQL Editor:

```sql
create table public.user_profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  school_name          text,
  education_level      text,
  peak_hours           text[],
  sleep_goal           int2 default 7,
  challenges           text[],
  onboarding_completed boolean default false,
  created_at           timestamptz default now()
);

create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  title            text not null,
  course           text,
  due_date         date,
  estimated_hours  numeric,
  priority         text check (priority in ('Low','Medium','High')),
  difficulty       int2 check (difficulty between 1 and 5),
  status           text default 'todo' check (status in ('todo','in_progress','done')),
  created_at       timestamptz default now()
);

create table public.schedules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  task_id     uuid references public.tasks(id) on delete set null,
  date        date not null,
  start_time  time not null,
  duration    numeric not null,
  created_at  timestamptz default now()
);

create table public.focus_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  task_id        uuid references public.tasks(id) on delete set null,
  date           date not null,
  duration_hours numeric not null,
  created_at     timestamptz default now()
);

-- Enable Row Level Security
alter table public.user_profiles  enable row level security;
alter table public.tasks           enable row level security;
alter table public.schedules       enable row level security;
alter table public.focus_sessions  enable row level security;

-- RLS policies — users can only access their own data
create policy "Users own their profile"   on public.user_profiles  for all using (auth.uid() = user_id);
create policy "Users own their tasks"     on public.tasks           for all using (auth.uid() = user_id);
create policy "Users own their schedules" on public.schedules       for all using (auth.uid() = user_id);
create policy "Users own their sessions"  on public.focus_sessions  for all using (auth.uid() = user_id);
```

### 4. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorised redirect URIs:
   - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
4. Copy the Client ID and Client Secret into Supabase → Authentication → Providers → Google

### 5. Set up Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Copy it into your `.env.local` as `GEMINI_API_KEY`

### 6. Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (future use) | Supabase → Settings → API |
| `GEMINI_API_KEY` | Google Gemini API key (server-side only) | Google AI Studio |

> **Security note:** `GEMINI_API_KEY` is intentionally NOT prefixed with `NEXT_PUBLIC_`. All Gemini calls run server-side through `/api/*` route handlers so the key never reaches the browser.

### 7. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/pulse-app)

### Manual deploy

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository
3. Add the following environment variables in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional, future use)
4. Deploy

After deploying, update your Supabase redirect allow-list and Google OAuth redirect URIs to include your production URL (`https://your-app.vercel.app/auth/callback`).

---

## Project Structure

```
src/
├── app/
│   ├── (landing)/           # Marketing landing page
│   ├── auth/
│   │   ├── login/           # Google OAuth sign-in page
│   │   └── callback/        # OAuth redirect handler
│   ├── dashboard/
│   │   ├── layout.tsx       # App shell: sidebar + mobile tab bar
│   │   ├── page.tsx         # Dashboard overview
│   │   ├── tasks/           # Task management
│   │   ├── schedule/        # AI-generated weekly schedule
│   │   ├── analytics/       # Workload & burnout analytics
│   │   ├── focus/           # Pomodoro / focus timer
│   │   ├── intake/          # AI task extraction from files/text
│   │   └── settings/        # Profile & study preferences
│   ├── onboarding/          # 5-step onboarding wizard
│   └── api/
│       ├── extract-tasks/   # Gemini: extract tasks from content
│       ├── generate-schedule/ # Gemini: build weekly schedule
│       └── burnout-insight/ # Gemini: wellbeing feedback
├── components/
│   ├── ui/                  # Button, Card, Badge, Input, Skeleton
│   └── command-palette.tsx  # Cmd+K global command palette
├── hooks/
│   └── useUser.ts           # Supabase auth state hook
├── lib/
│   ├── ai/
│   │   └── schedulePrompt.ts # Gemini scheduling prompt builder
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   └── server.ts        # Server-side Supabase client
│   └── utils.ts             # cn() utility
├── store/
│   └── onboarding.ts        # Zustand onboarding state
middleware.ts                # Auth protection for /dashboard/*
```

---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

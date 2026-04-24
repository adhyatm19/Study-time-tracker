# Quiet Ledger

Quiet Ledger is a minimalist study time tracker for small friend groups. It uses Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/Postgres, and Recharts to deliver a polished MVP with:

- Email/password authentication
- Stopwatch and Pomodoro timers
- Local ambient audio playback from `public/audio/`
- Personal analytics for the last 14 days, 30 days, and weekly averages
- A private leaderboard scoped by shared `group_code`
- Profile/settings for display name, timer defaults, and preferred BGM

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth + Postgres
- Recharts
- Custom clean UI components
- Vercel-friendly project structure

## Getting started

### 1. Prerequisites

- Node.js 20 or newer
- A free Supabase project

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 4. Run the Supabase schema

Open the Supabase SQL editor and run:

- `supabase/schema.sql`

This creates:

- `profiles`
- `study_sessions`
- RLS policies
- A signup trigger for profile creation
- A `get_group_leaderboard()` RPC for same-group leaderboard queries

### 5. Add the local audio files

Place these files in the project exactly as named:

- `public/audio/white-noise.mp3`
- `public/audio/fireplace.mp3`
- `public/audio/rain.mp3`

The app only attempts playback after a user presses `Start`, which helps with browser autoplay restrictions.

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase notes

### Auth

Enable email/password auth in Supabase Authentication settings.

If email confirmation is enabled in your project, sign-up will create the account first and require email verification before sign-in works.

### RLS behavior

- Users can insert, read, update their own profile
- Users can read profiles for people sharing the same `group_code`
- Users can insert, read, and delete only their own study sessions
- Leaderboards are fetched through the `get_group_leaderboard()` RPC, which only returns members of the current user’s group

## Project structure

```text
app/
  (app)/
    analytics/
    dashboard/
    leaderboard/
    settings/
  auth/
components/
  auth/
  dashboard/
  layout/
  shared/
lib/
  supabase/
supabase/
  schema.sql
public/
  audio/
```

## Core behavior

### Timers

- Stopwatch mode supports start, pause, resume, and stop/save
- Pomodoro defaults to focus/break values from profile settings
- Timer durations are computed from timestamps, not interval counters
- Active timer state is persisted to `localStorage` so users can refresh and continue
- Sessions shorter than 60 seconds require confirmation before saving

### Analytics

- 14-day chart
- 30-day chart
- Weekly average chart
- All chart values are displayed in hours with one decimal place
- Empty states render when there is no data

### Leaderboard

- Filters: `Today`, `This week`, `This month`, `All time`
- Rank, display name, and total hours
- Only users with the same `group_code` appear together

## Deployment

The app is ready for Vercel once your environment variables are set.

Typical flow:

1. Push this repo to GitHub
2. Import the project into Vercel
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Validation

Run these before shipping:

```bash
npm run typecheck
npm run build
```

## Notes

- No paid services are required
- The UI intentionally avoids gamified patterns in favor of a calm dashboard aesthetic
- If you want stricter leaderboard timezone handling later, the current RPC can be extended to accept explicit start/end timestamps

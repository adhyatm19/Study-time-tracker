# Quiet Ledger

A calm study tracker with persistent stopwatch/Pomodoro sessions, task-linked study, synced daily goals, searchable history, accurate analytics, and invitation-only study circles.

## Run locally

Use Node.js 22 or newer, then:

```sh
npm ci
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
npm run dev
```

Open http://localhost:3000. The bundled ambient sounds are original synthesized textures. Regenerate them with `python3 scripts/generate-audio.py`.

## Database setup — required before running this version

For an **existing installation**, apply the unapplied SQL files in `supabase/migrations/` in filename order in the Supabase SQL editor. In particular, run `20260924000000_tracker_reliability.sql` before deploying this application revision. It is a transactional, one-time migration, not a script to rerun on each deployment.

For a **new installation**, run the baseline `supabase/schema.sql`, then every migration in `supabase/migrations/` in filename order. The baseline is retained unchanged so upgrades and clean installations follow the same tested path. Do not expose a new installation until the migrations have completed.

The migration:

- Makes profile reads owner-only, removing the recursive RLS policy. Membership-aware RPCs return group leaderboard summaries without exposing private profile preferences.
- Adds `tasks`, `daily_goals`, explicit `study_groups`/`group_members`, and expiring/revocable `group_invites`.
- Preserves existing group membership. The earliest-created member becomes owner; existing group codes become names, not valid invitations. New members need an invitation from the owner. Owners cannot leave a group while other members remain.
- Preserves existing study history. `NOT VALID` constraints deliberately avoid rewriting or rejecting legacy rows while enforcing plausible timestamps, active durations, and note lengths on new writes/edits. Existing invalid sessions may need correction before editing.
- Adds retry-safe session saving and keyset-paginated history; database aggregates cover all records without a client row-limit truncation.
- Defaults existing profiles to `Asia/Kolkata`. Users can choose their timezone in Settings.

**This repository change does not apply migrations to a hosted database.** Review and run the migration against your Supabase project, and take your usual database backup first. Generated TypeScript types reflect the migrated schema, not the old baseline.

## Authentication configuration

Enable email/password authentication. Set your site URL and allow these redirect URLs for both localhost and your deployed origin:

- `/auth/callback`
- `/auth/callback?next=/auth/recovery`

The app supports email verification resend and password reset. Configure Supabase email delivery and confirm reset/verification emails arrive in your own project; browser tests use a local HTTP double and do not send email.

## Timer and recovery behavior

- One account-scoped timer state stores the selected mode, stable session ID, timestamps, pauses, subject/task, and any pending save. The timer provider stays mounted across app routes. A mini timer is available outside the dashboard.
- Web Locks serialize timer operations across browser tabs; storage events keep tabs in sync. A second tab cannot silently start a competing mode. Browsers without Web Locks show an explicit unsupported state instead of unsafe concurrent timers.
- Active durations come from timestamps, not interval counters. Pomodoro completion after tab suspension records the scheduled focus deadline. The break starts when the completed block is successfully saved/recovered. A new focus block requires an explicit start.
- A save gets the same ID on every retry. If a response is lost after the insert succeeds, retry returns the existing session instead of adding another. A failed save remains on the device. Retry is explicit; it never silently discards work.
- Unsaved timer state is device-local. Saved sessions, tasks, goals, and preferences sync through Supabase. Other devices refresh on window focus/visibility; saving locally invalidates local views and other tabs.
- Timers are capped at 24 hours for review. Session corrections and manual entries are available in History. Durations exclude pauses and cannot exceed the session's wall-clock span.
- In Settings, **Recover data from the earlier app** can export a backup and import old unscoped browser data after the user confirms ownership. Nothing is automatically assigned to the next person who signs in. Existing goals/tasks are not overwritten on a retry. Recovered timers are paused for review.
- Keep the app open for browser notifications and automatic phase transitions. Suspended/closed browsers cannot guarantee exact-time delivery; state is reconciled on return. Floating timers depend on Document Picture-in-Picture support.

## Date and analytics definitions

All database summaries, history filters, daily goals, and leaderboard ranges use the viewer's saved timezone. A session crossing midnight is assigned to its **start date**, using active time only; the app does not infer how pauses were split across days. The current week averages over elapsed calendar days; previous complete weeks use seven days. A streak survives until the end of today if the last active day was yesterday. Equal leaderboard durations share a rank.

Charts preserve full precision internally and format only labels/tooltips. Accessible data tables accompany charts. History is paginated by `(started_at, id)` and exports all matching rows, with spreadsheet-formula escaping for notes and subjects. Timestamp editing explicitly uses the device timezone; filters and displayed history use the profile timezone.

## Validation and maintenance

```sh
npm run check          # lint, typecheck, unit/database tests, generated-type drift check
npm run build          # production build
npx playwright install chromium
npm run test:e2e       # isolated browser tests; no live account or live database mutations
```

Database tests execute the baseline and every migration in PGlite (PostgreSQL), create separate authenticated identities, and exercise RLS, invitation ownership/revocation, duplicate-save retries, constraints, >1,000-session totals, timezone boundaries, and cursor pagination. PGlite supplies `gen_random_uuid()` natively; the fixture omits the baseline's Supabase-specific pgcrypto extension installation.

Browser tests run local Next.js and a test-only Supabase HTTP double at ports 3100/54329. They cover timer recovery, multi-tab coordination, account switching, lost save responses, navigation, goals/tasks, history, short-session charts, errors, and mobile layouts. SQL behavior is validated separately, not inferred from the HTTP double.

```sh
npm run db:types        # generate types/database.ts from the migrated PostgreSQL catalog
npm run db:types:check  # detect drift without editing
```

Add future schema changes as new timestamped migration files. Do not edit an already-applied migration in a deployed project. The GitHub Actions workflow runs lint, types, tests, build, and Chromium flows. Do not commit `.env.local`, compiler caches, or browser test output.

# Tracker improvement record

Implemented in this revision:

- Unified persistent timer engine; account-specific validated storage; cross-tab Web Locks; stable retry IDs; pending-save recovery; clear finish dialog; guarded discard; no reset/save race.
- Dashboard-first timer, persistent mini timer, focus mode, mobile bottom navigation, simplified ambient controls, bundled original sound textures, honest playback/error reporting.
- Database-backed tasks and daily goals; task-linked sessions; old device data backup/import with explicit ownership confirmation.
- Full session history, editing, manual corrections, literal text/date search, cursor pagination, and CSV export.
- SQL aggregates spanning the full history; timezone consistency; full-precision charts; elapsed-week averages; preserved yesterday streak; fair tie ranks; automatic local invalidation.
- Owner-only profile RLS, explicit group membership, random expiring invitations, revocation, preserved legacy group members, and SQL write constraints.
- Password recovery, verification resend, safe auth callback redirects, form validation, independent loading/error/retry states.
- Keyboard-operable disclosure menus and native dialogs, visible focus, status announcements, chart data tables, selected-state semantics, reduced motion, and larger task controls.
- Generated database types, linting, formatting, automated SQL/unit/browser tests, CI, and deployment documentation.

Deployment work required: apply the new migration to the hosted Supabase project and configure/test email redirect delivery there. Local PostgreSQL tests verify the supplied schema; they do not certify the current hosted schema or email provider. No hosted database, deployment, or real user data was modified while implementing this revision.

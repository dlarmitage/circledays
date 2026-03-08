# CircleDays - Claude Code Instructions

## Project Overview
CircleDays is a birthday and special occasion reminder app with a social graph model. Users track important dates, connect with others, and send handwritten cards.

## Tech Stack
- **Framework**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Database**: Neon (PostgreSQL) with Drizzle ORM
- **Auth**: Magic link (passwordless) via Resend
- **Hosting**: Vercel (with Vercel Cron for reminders)
- **Email**: Resend | **SMS**: Twilio
- **Cards**: Handwrytten API (real pen-and-ink cards)
- **Payments**: Stripe (card credit purchases)
- **AI**: Anthropic Claude (message assist, card assist, help chat)
- **Address Autocomplete**: Google Maps Places API
- **Storage**: Vercel Blob (profile photos)

## Key Directories
- `app/(main)/` — Authenticated pages (dashboard, settings, profile, network, cards, etc.)
- `app/api/` — API routes, all use `withAuth()` wrapper from `lib/api-handler.ts`
- `components/` — React components (UI primitives in `components/ui/`)
- `components/send-card/` — Multi-step card ordering flow with React Context (`SendCardContext`)
- `lib/` — Shared utilities, DB schema, API clients, hooks
- `lib/db/schema.ts` — Drizzle schema (all tables)
- `lib/constants.ts` — Shared constants (event types, credit bundles, strings)
- `lib/handwrytten.ts` — Handwrytten API client
- `KNOWLEDGE_BASE.md` — AI help assistant knowledge (loaded by `/api/chat`)

## Conventions
- API routes use `withAuth()` or `withPublicErrorHandling()` wrappers for consistent auth + error handling
- Zod for request validation in API routes
- Card ordering uses React Context (`SendCardContext`) — no prop drilling through step components
- All card orders go through `card_credits` balance check → debit → Handwrytten API → record order (with auto-refund on failure)
- Reminders run via Vercel Cron, respecting per-user timezone and notification hour
- Event dates stored as `MM-DD` or `YYYY-MM-DD` strings; yearly recurrence computed at query time

## Database Commands
- `npm run db:push` — Push schema to database
- `npm run db:generate` — Generate migrations
- `npm run db:migrate` — Run migrations
- `npm run db:studio` — Open Drizzle Studio

## Important Patterns
- `lib/api-handler.ts`: `withAuth(handler, label)` — handles auth, catches ZodError→400, generic→500
- `lib/email.ts` / `lib/sms.ts` — Reminder notification generators with card nudge messages
- Card nudge links point to `/profile/{id}` (not `/cards`) so users can start the card flow for the specific person
- `app/api/cron/reminders/route.ts` — Daily reminder cron, checks user's preferred hour + timezone
- Font preference persisted via `/api/card-preferences` on the Preview step
- Dashboard shows "Card Ordered" (green) when a non-cancelled card order exists for an event

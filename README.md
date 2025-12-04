# CircleDays 🎂

A progressive web application (PWA) for tracking birthdays and special dates for the people you care about, built with a social graph model.

## Features

- 📅 **Track Important Dates** - Birthdays, anniversaries, and custom events
- 🔔 **Smart Reminders** - Email and SMS notifications adjusted to your timezone
- 🌐 **Social Graph** - Build and visualize your personal network
- 🔗 **Connections** - Connect with others and share your network
- 🔒 **Private Notes** - Add personal notes visible only to you
- 📱 **PWA** - Install on mobile for a native app experience

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Graph Visualization:** Cytoscape.js
- **Database:** Neon (PostgreSQL)
- **ORM:** Drizzle
- **Hosting:** Vercel
- **Email:** Resend
- **SMS:** Twilio
- **Authentication:** Magic links (passwordless)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Neon database
- Resend account (for email)
- Twilio account (for SMS, optional)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dlarmitage/circledays.git
   cd circledays
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your environment variables:
   ```
   DATABASE_URL=postgresql://...
   RESEND_API_KEY=re_...
   SESSION_SECRET=your-32-char-secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Push the database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Database Commands

- `npm run db:push` - Push schema changes to database
- `npm run db:generate` - Generate migrations
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Drizzle Studio

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy!

The app is configured to work with Vercel Cron Jobs for the reminder system.

## Documentation

- [Design Decisions](./DECISIONS.md) - Technical decisions and assumptions
- [App Specification](./Birthday_Reminder_App_Spec.md) - Full product specification

## License

MIT

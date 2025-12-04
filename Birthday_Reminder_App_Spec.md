# Birthday Reminder App
## Technical Specification v1.0
### December 2024

---

# 1. Product Overview

A progressive web application (PWA) that enables users to track birthdays and special dates for people they care about, organized through a social graph model similar to LinkedIn. Users create profiles for people, establish connections, and receive reminders based on their personal network.

## 1.1 Core Value Proposition

- Track birthdays and anniversaries for family, friends, and colleagues
- Receive timely email and SMS reminders adjusted to your timezone
- Only get reminders for people you're directly connected to
- Invite others to join and automatically share relevant connections
- Visualize your network through an interactive graph interface

## 1.2 Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Graph Visualization:** Cytoscape.js
- **Database:** Neon (Postgres)
- **ORM:** Drizzle
- **Hosting:** Vercel
- **Email:** Resend
- **SMS:** Twilio
- **Authentication:** Magic links (email-based)
- **Scheduling:** Vercel Cron Jobs

---

# 2. Core Concepts

## 2.1 The Graph Model

The application is built on a social graph where users sit at the center of their own view. Unlike a traditional "family space" container model, this is an unbounded graph that can grow infinitely as users invite others and add profiles.

### Key Principles

- **Profiles** represent people whose dates are being tracked. A profile may or may not have an associated login.
- **Users** are logins. Each user is linked to exactly one profile.
- **Connections** are symmetric edges between two profiles. A connection means mutual visibility and mutual reminders.
- **Reminders** are sent only for direct connections. You never receive reminders for your own events.

### Visibility Rules

| Distance | What You See |
|----------|--------------|
| 1 hop (direct) | Full profile: name, photo, birthdate, all events, their connections, your private notes |
| 2 hops | Limited: name and profile photo only. Must connect to see more. |
| 3+ hops | Invisible until discovered via search. Search results show: name, hop count, mutual connections. |

### Connection Rules

| Scenario | Result |
|----------|--------|
| I create a profile | Auto-connected to me |
| I connect to someone ≤2 hops | Instant connection, they get notified |
| I connect to someone >2 hops | Request sent, requires their approval |
| Either party breaks connection | Connection gone |

---

# 3. Data Model

## 3.1 User

Represents a login/account.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| email | String | Unique, required |
| name | String | Display name |
| timezone | String | IANA timezone (e.g., America/Denver) |
| mobile | String | Optional, for SMS |
| notification_channel | Enum | email \| sms \| both |
| is_platform_admin | Boolean | Default false |
| created_at | Timestamp | |

## 3.2 Profile

Represents a person being tracked. May or may not have a linked user.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | Required |
| profile_picture | String | URL to image, optional |
| created_by_user_id | UUID | FK to User |
| linked_user_id | UUID | FK to User, nullable |
| created_at | Timestamp | |

## 3.3 Connection

Symmetric edge between two profiles.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| profile_a_id | UUID | FK to Profile |
| profile_b_id | UUID | FK to Profile |
| created_by_user_id | UUID | FK to User |
| created_at | Timestamp | |

**Note:** Store with profile_a_id < profile_b_id to prevent duplicates. Add unique constraint on (profile_a_id, profile_b_id).

## 3.4 ConnectionRequest

Pending connection request for >2 hop connections.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| from_profile_id | UUID | FK to Profile |
| to_profile_id | UUID | FK to Profile |
| status | Enum | pending \| accepted \| declined |
| created_at | Timestamp | |

## 3.5 Event

A special date associated with a profile.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| profile_id | UUID | FK to Profile |
| type | Enum | birthday \| anniversary \| custom |
| custom_label | String | For custom type only (e.g., "Gotcha Day") |
| date | Date | Full date with year (required) |
| created_at | Timestamp | |

## 3.6 Note

Private annotation on a profile, visible only to the creator.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| profile_id | UUID | FK to Profile |
| user_id | UUID | FK to User (the note author) |
| content | Text | |
| created_at | Timestamp | |
| updated_at | Timestamp | |

## 3.7 Invite

Invitation to join the platform and link to a profile.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| email | String | Recipient email |
| profile_id | UUID | FK to Profile they'll link to |
| invited_by_user_id | UUID | FK to User |
| seed_connection_ids | UUID[] | Profile IDs to auto-connect |
| token | String | Unique invite token |
| status | Enum | pending \| accepted \| expired |
| expires_at | Timestamp | Default: 7 days from creation |
| created_at | Timestamp | |

## 3.8 ReminderPreference

User's global reminder settings.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to User, unique |
| default_lead_days | Integer[] | Default: [0, 1, 7] |
| created_at | Timestamp | |

## 3.9 ReminderOverride

Per-event override of reminder settings.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to User |
| event_id | UUID | FK to Event |
| muted | Boolean | If true, no reminders for this event |
| custom_lead_days | Integer[] | Overrides default if set |
| created_at | Timestamp | |

## 3.10 NotificationLog

Record of sent notifications for debugging and idempotency.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to User |
| event_ids | UUID[] | Events included in this notification |
| channel | Enum | email \| sms |
| status | Enum | sent \| failed |
| error_message | String | If failed, why |
| sent_at | Timestamp | |

## 3.11 MagicLink

For passwordless authentication.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| email | String | |
| token | String | Unique, secure random |
| expires_at | Timestamp | Default: 15 minutes |
| used | Boolean | Default: false |
| created_at | Timestamp | |

---

# 4. User Flows

## 4.1 Sign Up (New User)

1. User enters email on landing page
2. System sends magic link email
3. User clicks link, arrives at onboarding
4. User enters: display name, timezone (auto-detected with override), mobile (optional), notification preference
5. System creates User and linked Profile with same name
6. User prompted to add their birthdate to their profile
7. User lands on empty dashboard with prompt: "Add people you care about"

## 4.2 Sign Up (Via Invite)

1. User receives invite email with unique link
2. User clicks link, arrives at invite-aware onboarding
3. System shows: "[Inviter] has invited you to connect"
4. User enters: display name, timezone, mobile, notification preference
5. System creates User, links to existing Profile from invite
6. System creates Connections for all seed_connection_ids
7. System sends notifications to all newly-connected profiles (if they have logins)
8. User sees welcome screen: "You're connected to X people. You'll receive reminders about their special dates."
9. User lands on dashboard showing their network

## 4.3 Add a Profile

1. User clicks "Add Person" from dashboard or network view
2. User enters: name (required), birthdate (required, with year), profile photo (optional)
3. System creates Profile with created_by_user_id = current user
4. System creates Connection between user's profile and new profile
5. System creates Event (type: birthday) from birthdate
6. User prompted to add additional events (anniversary, custom)
7. User can optionally add private notes
8. Profile appears in user's network graph

## 4.4 Invite Someone

1. User views a profile they created (that has no linked user)
2. User clicks "Invite to Join"
3. User enters email (or confirms if already stored from CSV import)
4. User sees list of their connections with checkboxes: "Select connections to share"
5. User selects which connections the invitee should automatically receive
6. System creates Invite with seed_connection_ids
7. System sends invite email
8. Profile shows "Invite pending" badge

## 4.5 Connect to Someone

**Within 2 hops:**
1. User browses network or views 2-hop profile
2. User clicks "Connect"
3. Connection created immediately
4. Other party receives in-app notification (toast on next login)
5. Both parties now see full profile details and receive reminders

**Beyond 2 hops:**
1. User searches and finds profile
2. User clicks "Request Connection"
3. System creates ConnectionRequest (status: pending)
4. If target profile has a linked user: they receive email notification
5. Target user can accept or decline
6. On accept: Connection created, both parties notified

## 4.6 CSV Import

1. User clicks "Import" from settings or dashboard
2. User uploads CSV file
3. System parses and validates. Expected columns: First, Last, Email (optional), Mobile (optional), Birthday (required)
4. System shows preview with validation errors highlighted
5. User confirms import
6. System creates Profile + Event (birthday) + Connection for each valid row
7. Email and mobile stored on Profile for later invite use (not for notification without invite)
8. User sees summary: "X profiles imported"

---

# 5. Reminder System

## 5.1 Daily Reminder Job

A Vercel cron job runs every hour to process reminders for users whose local time is approximately 7:00 AM.

### Algorithm

1. Cron triggers (e.g., every hour at :00)
2. Find all users where current time in their timezone is between 7:00-7:59 AM
3. For each user:
   - Get user's direct connections (via Connection table)
   - Get all Events for those connections
   - Exclude events on user's own profile (no self-reminders)
   - Get user's ReminderPreference (default_lead_days)
   - For each event, check for ReminderOverride (muted or custom_lead_days)
   - Calculate: for each event, is (event_date_this_year - today) in lead_days?
   - Collect all matching events
4. Check NotificationLog for idempotency (skip if already sent today for these events)
5. Batch all events into single notification per user
6. Send via user's preferred channel (email, SMS, or both)
7. Log to NotificationLog (success or failure)

## 5.2 Email Template

**Subject:** "Upcoming birthdays and events"

**Body structure:**
- Greeting with user's name
- For each event, grouped by date:
  - Profile name and photo
  - Event type and date
  - Age (calculated from year) - e.g., "turning 30"
  - For anniversary: "10th anniversary"
- Link to view in app
- Unsubscribe/manage preferences link

## 5.3 SMS Template

Brief format due to character limits:

*"Reminder: [Name]'s [event type] is [today/tomorrow/in X days] ([date]). [Name] is turning [age]."*

Multiple events sent as separate SMS messages.

---

# 6. User Interface

## 6.1 Navigation Structure

Bottom navigation bar (mobile) / sidebar (desktop):
- **Dashboard** - Upcoming events list
- **Network** - Graph visualization
- **Search** - Find people
- **Settings** - Profile, preferences, import

## 6.2 Dashboard

Primary view showing upcoming events for the next 30 days (toggleable to 90 days).

**Elements:**
- Header with user greeting and connection count
- Toggle: 30 days / 90 days
- Event cards grouped by date, showing:
  - Profile photo or initials
  - Name
  - Event type
  - Days until ("in 3 days", "tomorrow", "today")
  - Age/anniversary number
- Tap card to view profile detail
- FAB or header button: "+ Add Person"
- Empty state: "No upcoming events. Add people you care about to get started."

## 6.3 Network View (Graph)

Interactive graph visualization using Cytoscape.js with concentric layout.

### Layout
- **Center:** Current user's node (larger, distinct color)
- **Inner ring:** Direct connections (1 hop) - user's color, full opacity
- **Outer ring:** 2-hop connections - different color, slightly faded
- **Edges:** Lines connecting related nodes, uniform thickness

### Nodes
- Circular, all same size
- Display profile photo if available
- Display initials if no photo (similar to Life360)
- Unlinked profiles: subtle indicator (e.g., dashed border)
- Pending invite profiles: badge indicator

### Interactions
- **Tap 1-hop node:** Show full profile (name, photo, events, notes)
- **Tap 2-hop node:** Show limited view (name, photo) with "Connect" button
- **Pinch/zoom:** Zoom in/out (mobile)
- **Pan:** Drag to move view
- **Search highlight:** Found nodes pulse or highlight

### Empty State
Single node (the user) floating alone with prompt: "Add your first connection to start building your network."

## 6.4 Profile Detail

Displayed when tapping a connection from dashboard or network view.

**Sections:**
- **Header:** Photo (large), name
- **Events:** List of all events with dates and types. Tap to edit. Button to add event.
- **My Notes:** Private notes section (only visible to current user). Editable.
- **Connections:** List of this profile's connections (1-hop from them)
- **Actions:**
  - Edit profile (if creator or own profile)
  - Invite (if unlinked and creator)
  - Break connection
  - Delete profile (if unlinked and creator, or own profile)

## 6.5 Search

Universal search across all profiles in the system.

**Features:**
- Search by name
- Results show: name, photo, hop distance, mutual connections count
- 1-hop results: tap to view full profile
- 2-hop results: tap to view limited profile with "Connect" button
- 3+ hop results: tap to view minimal info with "Request Connection" button

## 6.6 Settings

- **My Profile:** Edit name, photo, birthdate
- **Account:** Email (read-only), timezone, mobile number
- **Notifications:** Channel preference (email/SMS/both), default lead days
- **Import:** CSV import interface
- **Connection Requests:** Pending requests to review
- **Delete Account:** Option to delete login (keep or delete profile)

---

# 7. API Endpoints

All endpoints under /api/. Authentication via session cookie from magic link.

## 7.1 Authentication
- **POST /api/auth/magic-link** - Request magic link { email }
- **GET /api/auth/verify** - Verify magic link token, set session
- **POST /api/auth/logout** - Clear session
- **GET /api/auth/me** - Get current user

## 7.2 Users
- **POST /api/users** - Complete onboarding { name, timezone, mobile?, notification_channel }
- **PATCH /api/users/me** - Update current user
- **DELETE /api/users/me** - Delete account { keep_profile: boolean }

## 7.3 Profiles
- **GET /api/profiles** - Get user's connections (1-hop profiles)
- **GET /api/profiles/:id** - Get profile (respects visibility rules)
- **POST /api/profiles** - Create profile { name, birthdate, photo? }
- **PATCH /api/profiles/:id** - Update profile
- **DELETE /api/profiles/:id** - Delete profile (permission checks)
- **GET /api/profiles/search** - Search all profiles { q: string }

## 7.4 Connections
- **GET /api/connections** - Get user's connections
- **POST /api/connections** - Create connection { profile_id } (instant if ≤2 hops)
- **DELETE /api/connections/:id** - Break connection
- **GET /api/connections/requests** - Get pending connection requests
- **POST /api/connections/requests/:id/accept** - Accept request
- **POST /api/connections/requests/:id/decline** - Decline request

## 7.5 Events
- **GET /api/events/upcoming** - Get upcoming events { days: 30|90 }
- **POST /api/profiles/:id/events** - Add event to profile
- **PATCH /api/events/:id** - Update event
- **DELETE /api/events/:id** - Delete event

## 7.6 Notes
- **GET /api/profiles/:id/notes** - Get my notes for a profile
- **PUT /api/profiles/:id/notes** - Create or update note { content }
- **DELETE /api/profiles/:id/notes** - Delete note

## 7.7 Invites
- **POST /api/invites** - Send invite { profile_id, email, seed_connection_ids }
- **GET /api/invites/:token** - Get invite details (public)
- **POST /api/invites/:token/accept** - Accept invite and complete signup

## 7.8 Preferences
- **GET /api/preferences** - Get reminder preferences
- **PUT /api/preferences** - Update preferences { default_lead_days }
- **PUT /api/events/:id/reminder-override** - Set per-event override

## 7.9 Network
- **GET /api/network** - Get graph data for visualization (1-hop and 2-hop)

## 7.10 Import
- **POST /api/import/preview** - Upload CSV, get validation preview
- **POST /api/import/confirm** - Confirm import, create profiles

---

# 8. PWA Requirements

- **Manifest:** name, short_name, icons, start_url, display: standalone, theme_color
- **Service Worker:** Cache static assets for offline shell
- **Icons:** 512x512, 192x192, 180x180 (iOS)
- **Responsive:** Mobile-first, works on tablet and desktop
- **Install prompt:** Show "Add to Home Screen" prompt on mobile

---

# 9. Security Considerations

- **Authentication:** Magic links with 15-minute expiry, single-use tokens
- **Sessions:** HTTP-only cookies, 30-day expiry with rolling refresh
- **Rate limiting:** Magic link requests: 5 per email per hour
- **Data access:** All queries scoped by connection visibility rules
- **Private data:** Email/mobile never exposed to other users
- **Notes:** Strictly private to creator, never visible to others
- **CSRF:** Token validation on state-changing requests

---

# 10. Platform Admin

A designated platform admin (is_platform_admin = true) has elevated privileges:

- Merge duplicate profiles
- Delete any profile
- Create/break any connection
- View notification logs
- Access basic admin dashboard with user/profile counts

Admin UI: Simple dashboard at /admin, protected by is_platform_admin check.

---

# 11. Project Structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── verify/page.tsx
│   │   └── onboarding/page.tsx
│   ├── (main)/
│   │   ├── dashboard/page.tsx
│   │   ├── network/page.tsx
│   │   ├── search/page.tsx
│   │   ├── profile/[id]/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx
│   ├── admin/
│   │   └── page.tsx
│   ├── invite/[token]/page.tsx
│   ├── api/
│   │   ├── auth/[...]/route.ts
│   │   ├── users/route.ts
│   │   ├── profiles/route.ts
│   │   ├── connections/route.ts
│   │   ├── events/route.ts
│   │   ├── invites/route.ts
│   │   ├── network/route.ts
│   │   ├── cron/reminders/route.ts
│   │   └── import/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── NetworkGraph.tsx
│   ├── ProfileCard.tsx
│   ├── EventCard.tsx
│   └── ...
├── lib/
│   ├── db/
│   │   ├── schema.ts
│   │   ├── index.ts
│   │   └── queries/
│   ├── auth.ts
│   ├── email.ts
│   ├── sms.ts
│   └── utils.ts
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── drizzle/
│   └── migrations/
├── vercel.json
├── drizzle.config.ts
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

# 12. Environment Variables

```
# Database
DATABASE_URL=postgres://...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
SESSION_SECRET=... (32+ random chars)

# Cron (Vercel)
CRON_SECRET=... (for securing cron endpoint)
```

---

# 13. Deployment Checklist

- [ ] Create Neon database, get connection string
- [ ] Set up Resend account, verify domain, get API key
- [ ] Set up Twilio account, get phone number and credentials
- [ ] Deploy to Vercel, configure environment variables
- [ ] Run database migrations
- [ ] Configure Vercel cron job (vercel.json):
  ```json
  { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }] }
  ```
- [ ] Create initial platform admin user
- [ ] Test magic link flow
- [ ] Test reminder job manually
- [ ] Verify PWA installation on mobile
